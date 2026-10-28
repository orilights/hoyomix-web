<script setup lang="ts">
import type { SongCreditsChange } from '@/types/core'
import { refDebounced } from '@vueuse/core'
import { toast } from 'vue-sonner'
import { submitSongCreditsEditApi } from '@/api/music'
import { useArtistInfoQuery, useCreditInfoQuery, useSearchQuery } from '@/composables/queries'
import { usePendingSongEditRequest } from '@/composables/usePendingSongEditRequest'
import { useAuthStore } from '@/store/auth'

const props = defineProps<{ songId: number }>()
const emit = defineEmits<{ success: [] }>()
const visible = defineModel<boolean>({ required: true })
const auth = useAuthStore()
const { pendingRequest, checking, blocked, checkError, retryCheck, checkBeforeSubmit } = usePendingSongEditRequest(computed(() => props.songId), visible)
const { data, isPending, isError, refetch } = useCreditInfoQuery(computed(() => visible.value ? props.songId : null), ref('song'))

interface Credit { name: string, role: string }
const original = ref<Credit[]>([])
const draft = ref<Credit[]>([])
const roles = ref<string[]>([])
const initialized = ref(false)
const roleInput = ref('')
const activeRole = ref('')
const keyword = ref('')
const debouncedKeyword = refDebounced(keyword, 250)
const searchKeyword = computed(() => visible.value && activeRole.value && keyword.value.trim() === debouncedKeyword.value.trim() ? debouncedKeyword.value.trim() : '')
const { data: searchData, isFetching: searching, isError: searchError, refetch: retrySearch } = useSearchQuery(searchKeyword, ref('artist'))
const selectedName = ref<string | null>(null)
const { refetch: fetchArtist } = useArtistInfoQuery(selectedName)
const selecting = ref(false)
const submitting = ref(false)
const results = computed(() => searchData.value?.results.filter(item => item.type === 'artist') ?? [])
let editSession = 0

watch(visible, () => {
  editSession++
  initialized.value = false
  original.value = []
  draft.value = []
  roles.value = []
  roleInput.value = ''
  activeRole.value = ''
  keyword.value = ''
  selectedName.value = null
}, { flush: 'sync' })

watch([visible, data], ([open, credits]) => {
  if (!open || !credits || initialized.value)
    return
  original.value = Object.entries(credits).flatMap(([role, artists]) => artists.map(artist => ({ role, name: artist.name })))
  draft.value = original.value.map(credit => ({ ...credit }))
  roles.value = Object.keys(credits)
  initialized.value = true
}, { immediate: true })

function contains(credits: Credit[], credit: Pick<Credit, 'role' | 'name'>) {
  return credits.some(item => item.role === credit.role && item.name === credit.name)
}

const additions = computed(() => draft.value.filter(credit => !contains(original.value, credit)))
const removals = computed(() => original.value.filter(credit => !contains(draft.value, credit)))
const hasChanges = computed(() => additions.value.length > 0 || removals.value.length > 0)

function addRole() {
  const role = roleInput.value.trim()
  if (!role)
    return
  if (!roles.value.includes(role))
    roles.value.push(role)
  activeRole.value = role
  keyword.value = ''
  roleInput.value = ''
}

function removeArtist(credit: Credit) {
  draft.value = draft.value.filter(item => item.role !== credit.role || item.name !== credit.name)
}

async function selectArtist(name: string) {
  if (selecting.value || submitting.value)
    return
  const role = activeRole.value
  const session = editSession
  const songId = props.songId
  const userId = auth.user?.id
  selecting.value = true
  selectedName.value = name
  try {
    await nextTick()
    // 读取详情以确认所选人员仍在库内。
    const result = await fetchArtist()
    if (!visible.value || editSession !== session || props.songId !== songId || auth.user?.id !== userId || activeRole.value !== role)
      return
    if (result.isError || !result.data || result.data.name !== name) {
      toast.error('艺术家信息加载失败，请重试')
      return
    }
    const credit = { role, name: result.data.name }
    if (!contains(draft.value, credit))
      draft.value.push(credit)
    keyword.value = ''
  }
  finally {
    selecting.value = false
  }
}

async function submit() {
  if (submitting.value || selecting.value || blocked.value || !initialized.value || !hasChanges.value)
    return
  const songId = props.songId
  const userId = auth.user?.id
  const credits: SongCreditsChange = {}
  if (additions.value.length)
    credits.add = additions.value.map(credit => ({ ...credit }))
  if (removals.value.length)
    credits.remove = removals.value.map(({ role, name }) => ({ role, name }))
  submitting.value = true
  try {
    if (!await checkBeforeSubmit())
      return
    const result = await submitSongCreditsEditApi(songId, credits)
    if (props.songId !== songId || auth.user?.id !== userId)
      return
    toast.success(result.directApproved ? '制作人员已更新' : '申请已提交，等待审核')
    visible.value = false
    emit('success')
  }
  catch (error) {
    if (props.songId !== songId || auth.user?.id !== userId)
      return
    void retryCheck()
    toast.error(error instanceof Error ? error.message : '提交失败')
  }
  finally {
    submitting.value = false
  }
}
</script>

<template>
  <AppDialog v-model="visible" :close-on-click-overlay="false" title="修改制作人员" size="xl">
    <div class="p-4 sm:p-5 space-y-3 max-h-[65vh] overflow-y-auto overscroll-contain">
      <PendingEditRequestNotice :pending-request="pendingRequest" :checking="checking" :check-error="checkError" @retry="retryCheck()" />
      <AsyncFade>
        <div v-if="isPending" role="status" class="flex items-center justify-center gap-2 py-8 text-gray-400">
          <LucideLoader2 class="size-5 animate-spin" />
          加载中...
        </div>
        <div v-else-if="isError" class="text-center py-8 space-y-2">
          <p class="text-sm text-red-400">
            制作人员加载失败
          </p>
          <AppButton @click="refetch()">
            重试
          </AppButton>
        </div>
        <fieldset v-else :disabled="submitting || selecting || blocked" class="min-w-0 space-y-2">
          <p v-if="!roles.length" class="text-sm text-gray-400">
            暂无制作人员，请先添加角色
          </p>
          <section v-for="role in roles" :key="role" class="px-3 py-2 rounded-lg bg-black/5 dark:bg-white/5 space-y-1.5">
            <div class="flex items-center justify-between gap-2">
              <h3 class="font-medium text-sm break-words">
                {{ role }}
              </h3>
              <button type="button" :aria-label="`为${role}添加人员`" class="shrink-0 text-xs text-blue-500 dark:text-blue-400 hover:text-blue-600 hover:dark:text-blue-300 cursor-pointer rounded px-1 py-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/60 disabled:opacity-50 disabled:cursor-not-allowed" @click="activeRole = role; keyword = ''">
                添加人员
              </button>
            </div>
            <div class="flex flex-wrap gap-1.5">
              <span v-for="credit in draft.filter(item => item.role === role)" :key="credit.name" class="inline-flex items-center gap-1 rounded-md bg-white/60 dark:bg-white/10 pl-2 pr-1 py-0.5 text-xs max-w-full">
                <span class="break-words min-w-0">{{ credit.name }}</span>
                <button type="button" :aria-label="`移除${role}：${credit.name}`" class="shrink-0 cursor-pointer rounded p-0.5 text-gray-500 hover:text-red-500" @click="removeArtist(credit)">
                  <LucideX class="size-3.5" />
                </button>
              </span>
              <span v-if="!draft.some(item => item.role === role)" class="text-xs text-gray-400">暂无人员</span>
            </div>
            <div v-if="activeRole === role" class="space-y-2">
              <input v-model="keyword" type="search" :aria-label="`搜索${role}人员`" placeholder="搜索已有艺术家" class="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
              <div aria-live="polite" class="text-sm">
                <AsyncFade>
                  <p v-if="selecting" class="text-gray-400 py-2">
                    正在添加...
                  </p>
                  <p v-else-if="searching || keyword.trim() !== debouncedKeyword.trim()" role="status" class="text-gray-400 py-2">
                    搜索中...
                  </p>
                  <div v-else-if="searchError && searchKeyword" class="flex items-center gap-2">
                    <span class="text-red-400">搜索失败</span>
                    <AppButton @click="retrySearch()">
                      重试
                    </AppButton>
                  </div>
                  <div v-else-if="searchKeyword" class="max-h-44 overflow-y-auto space-y-1">
                    <button v-for="artist in results" :key="artist.id" type="button" :disabled="contains(draft, { role, name: artist.name })" class="w-full flex items-center justify-between gap-2 text-left px-3 py-2 rounded-lg hover:bg-black/5 hover:dark:bg-white/5 disabled:opacity-50 cursor-pointer" @click="selectArtist(artist.name)">
                      <span class="break-words min-w-0">{{ artist.name }}</span>
                      <span v-if="contains(draft, { role, name: artist.name })" class="shrink-0 text-xs text-gray-400">已添加</span>
                      <LucidePlus v-else class="size-4 shrink-0" />
                    </button>
                    <p v-if="!results.length" class="text-gray-400 py-2">
                      未找到匹配的艺术家
                    </p>
                  </div>
                </AsyncFade>
              </div>
            </div>
          </section>
          <form class="flex gap-2" @submit.prevent="addRole">
            <input v-model="roleInput" type="text" aria-label="角色名称" placeholder="输入角色名称" class="min-w-0 flex-1 px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
            <AppButton type="submit" :disabled="!roleInput.trim()">
              添加角色
            </AppButton>
          </form>
        </fieldset>
      </AsyncFade>
    </div>
    <template #footer>
      <div class="px-4 sm:px-5 py-3 flex justify-end gap-2">
        <AppButton @click="visible = false">
          取消
        </AppButton>
        <AppButton variant="primary" :disabled="!hasChanges || !initialized || isError || submitting || selecting || blocked" @click="submit">
          <LucideLoader2 v-if="submitting" class="size-4 animate-spin" />
          {{ submitting ? '提交中...' : '提交申请' }}
        </AppButton>
      </div>
    </template>
  </AppDialog>
</template>
