<script setup lang="ts">
import { usePlayerStore } from '@/store/player'
import { getCoverUrl } from '@/utils'
import { getImageGradient } from '@/utils/cover'

const router = useRouter()
const player = usePlayerStore()
const {
  currentSong,
  isPlaying,
  currentTime,
  isFullscreen,
  lyricData,
  lyricTranslation,
  showTranslation,
  showSpectrum,
  enableAudioContext,
} = storeToRefs(player)

const coverUrl = computed(() => {
  if (!currentSong.value)
    return ''
  return getCoverUrl(currentSong.value.albumPlatforms, '800px')
})

const FALLBACK_BG = 'linear-gradient(to bottom, #111827, #111827)'
const bg1 = ref(FALLBACK_BG)
const bg2 = ref(FALLBACK_BG)
const showBackground = ref(1)
const lyricViewRef = useTemplateRef('lyricView')
const transformPosition = ref('')

watch(coverUrl, async (url) => {
  let gradient = FALLBACK_BG
  if (url) {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.src = url
    await img.decode()
    const canvas = document.createElement('canvas')
    canvas.width = img.naturalWidth
    canvas.height = img.naturalHeight
    canvas.getContext('2d')!.drawImage(img, 0, 0)
    const imageData = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height)
    const gradientColor = getImageGradient(imageData)
    if (gradientColor)
      gradient = gradientColor
  }
  if (showBackground.value !== 1) {
    bg1.value = gradient
    showBackground.value = 1
  }
  else {
    bg2.value = gradient
    showBackground.value = 2
  }
}, { immediate: true })

watch(showTranslation, () => {
  nextTick(() => {
    lyricViewRef.value?.scrollToCurrentLine(false)
  })
})

function close() {
  player.setFullscreen(false)
}

function toSong() {
  if (!currentSong.value)
    return
  player.setFullscreen(false)
  router.push({ name: 'MusicInfo', params: { albumId: currentSong.value.albumId, musicId: currentSong.value.songId } })
}

function toAlbum() {
  if (!currentSong.value)
    return
  player.setFullscreen(false)
  router.push({ name: 'AlbumInfo', params: { id: currentSong.value.albumId } })
}

function onSeek(time: number) {
  player.seek(time)
}

const touchStartY = ref(0)
const dragOffset = ref(0)
const snapBack = ref(false)

function onHeaderTouchStart(e: TouchEvent) {
  snapBack.value = false
  touchStartY.value = e.touches[0].clientY
}

function onHeaderTouchMove(e: TouchEvent) {
  const delta = e.touches[0].clientY - touchStartY.value
  if (delta > 0) {
    dragOffset.value = delta
  }
}

function onHeaderTouchEnd() {
  if (dragOffset.value > 80) {
    transformPosition.value = `${dragOffset.value}px`
    dragOffset.value = 0
    nextTick(() => {
      close()
    })
    setTimeout(() => {
      transformPosition.value = ''
    }, 400)
  }
  else if (dragOffset.value > 0) {
    snapBack.value = true
    dragOffset.value = 0
    setTimeout(() => {
      snapBack.value = false
    }, 300)
  }
}
</script>

<template>
  <Transition name="fullscreen-player">
    <div
      v-if="isFullscreen && currentSong"
      class="fixed inset-0 z-50 flex flex-col pb-[72px]"
      :style="{
        transform: dragOffset > 0 ? `translateY(${dragOffset}px)` : undefined,
        transition: snapBack ? 'transform 0.3s ease' : undefined,
      }"
    >
      <div class="absolute inset-0 bg-gray-900">
        <div
          class="absolute inset-0 transition-opacity duration-700"
          :style="{ background: bg1 }"
          :class="showBackground === 1 ? 'opacity-100' : 'opacity-0'"
        />
        <div
          class="absolute inset-0 transition-opacity duration-700"
          :style="{ background: bg2 }"
          :class="showBackground === 2 ? 'opacity-100' : 'opacity-0'"
        />
      </div>
      <div class="background-mask absolute inset-0" />

      <div class="relative flex-1 flex flex-col z-10 min-h-0">
        <div
          class="flex items-center justify-between px-6 py-4 shrink-0"
          @touchstart="onHeaderTouchStart"
          @touchmove.prevent="onHeaderTouchMove"
          @touchend="onHeaderTouchEnd"
        >
          <Tooltip
            placement="bottom"
            align="center"
            content="退出全屏"
          >
            <button
              class="text-white/80 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
              @click="close"
            >
              <LucideChevronDown class="size-6" />
            </button>
          </Tooltip>

          <div class="text-white/60 text-sm text-nowrap truncate cursor-pointer" @click="toAlbum">
            {{ currentSong.albumName }}
          </div>

          <div class="flex items-center gap-1">
            <Tooltip
              placement="bottom"
              align="center"
              :content="!lyricTranslation ? '当前歌曲无歌词翻译' : '歌词翻译'"
            >
              <button
                class="p-2 rounded-full transition-colors"
                :class="!lyricTranslation
                  ? 'text-white/20'
                  : showTranslation ? 'text-blue-400 cursor-pointer hover:bg-white/10' : 'text-white/60 hover:text-white cursor-pointer hover:bg-white/10'"
                :disabled="!lyricTranslation"
                @click="player.toggleTranslation()"
              >
                <LucideLanguages class="size-5" />
              </button>
            </Tooltip>

            <Tooltip
              placement="bottom"
              align="center"
              :content="!enableAudioContext ? 'AudioContext API 已禁用，请在设置中开启' : '频谱可视化'"
            >
              <button
                class="p-2 rounded-full transition-colors"
                :class="!enableAudioContext
                  ? 'text-white/20'
                  : showSpectrum ? 'text-blue-400 cursor-pointer hover:bg-white/10' : 'text-white/60 hover:text-white cursor-pointer hover:bg-white/10'"
                :disabled="!enableAudioContext"
                @click="player.toggleSpectrum()"
              >
                <LucideAudioLines class="size-5" />
              </button>
            </Tooltip>
          </div>
        </div>

        <div class="flex-1 flex items-center px-6 md:px-16 gap-8 min-h-0">
          <div class="hidden md:block w-[40%] max-w-[40vh] shrink-0 mx-[5vw]">
            <div class="rounded-2xl overflow-hidden shadow-2xl ">
              <LazyImg
                class="w-full aspect-square"
                :src="coverUrl"
              />
            </div>
            <div class="mt-4 text-center">
              <div class="text-white text-xl font-bold truncate cursor-pointer" :title="currentSong.songName" @click="toSong">
                {{ currentSong.songName }}
              </div>
              <div v-if="currentSong.songDescription" class="text-white/50 text-sm mt-1">
                {{ currentSong.songDescription }}
              </div>
            </div>
          </div>

          <div class="flex-1 h-full min-w-0">
            <PlayerLyrics
              ref="lyricView"
              :lyric-data="lyricData"
              :lyric-translation="lyricTranslation"
              :show-translation="showTranslation"
              :current-time="currentTime"
              class="h-full"
              @seek="onSeek"
            />
          </div>
        </div>

        <div class="md:hidden shrink-0 flex justify-end px-6 py-4">
          <PlayerControlMobile />
        </div>

        <div v-if="showSpectrum" class="h-16 shrink-0">
          <PlayerSpectrum :active="showSpectrum && isPlaying" />
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.background-mask {
  background: rgba(0, 0, 0, 0.25);
}

.volume-slider {
  height: 4px;
  accent-color: white;
}

.fullscreen-player-enter-active,
.fullscreen-player-leave-active {
  transition: all 0.4s ease;
}
.fullscreen-player-leave-from,
.fullscreen-player-enter-to {
  transform: translateY(v-bind('transformPosition'));
}
.fullscreen-player-enter-from,
.fullscreen-player-leave-to {
  transform: translateY(100%);
  opacity: 0;
}
</style>
