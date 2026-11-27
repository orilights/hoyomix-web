<script setup lang="ts">
import { CalendarRange } from '@lucide/vue'
import { t } from '@/i18n'
import { parseChangelog } from '@/utils/changelog'

const props = defineProps<{ content: string }>()
const log = computed(() => parseChangelog(props.content))
const showHistory = ref(false)
const categoryColors = new Map([
  ['新增功能', 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'],
  ['问题修复', 'bg-red-500/10 text-red-700 dark:text-red-300'],
])
</script>

<template>
  <div class="space-y-6">
    <MarkdownContent v-if="log.intro" :content="log.intro" />

    <section v-if="log.plan" class="space-y-4 rounded-2xl bg-blue-500/8 px-4 py-4 sm:px-5" aria-labelledby="changelog-plan-heading">
      <h3 id="changelog-plan-heading" class="flex items-center gap-2 text-lg font-semibold">
        <CalendarRange class="size-4 text-blue-600 dark:text-blue-400" aria-hidden="true" />
        {{ t('Settings.changelog_development_plan') }}
      </h3>
      <MarkdownContent v-if="log.plan.intro" :content="log.plan.intro" />
      <div v-if="log.plan.groups.length" class="changelog-plans grid gap-4">
        <div v-for="group in log.plan.groups" :key="group.title">
          <h4 class="mb-1 text-sm font-semibold text-blue-700 dark:text-blue-300">
            {{ group.title }}
          </h4>
          <MarkdownContent :content="group.content" />
        </div>
      </div>
    </section>

    <section v-if="log.recent.length" class="changelog-timeline relative" :aria-label="t('Settings.changelog_version_history')">
      <template v-for="(entries, groupIndex) in [log.recent, log.history]" :key="groupIndex">
        <div v-if="groupIndex === 1 && entries.length" class="changelog-disclosure relative pb-5">
          <AppButton
            variant="outline"
            shape="pill"
            size="sm"
            :aria-expanded="showHistory"
            aria-controls="changelog-history"
            @click="showHistory = !showHistory"
          >
            {{ showHistory ? t('Settings.changelog_collapse_history') : t('Settings.changelog_view_more') }}
            <LucideChevronDown class="size-4" :class="{ 'rotate-180': showHistory }" aria-hidden="true" />
          </AppButton>
        </div>
        <div v-if="entries.length" :id="groupIndex === 1 ? 'changelog-history' : undefined" :hidden="groupIndex === 1 && !showHistory">
          <template v-if="groupIndex === 0 || showHistory">
            <article
              v-for="(entry, index) in entries"
              :key="`${entry.date}-${entry.version ?? index}`"
              class="changelog-release relative pb-6"
              :class="{ 'changelog-release-latest': groupIndex === 0 && index === 0 }"
            >
              <header class="mb-3 flex flex-wrap items-baseline gap-x-3">
                <h3 class="text-lg font-semibold">
                  <template v-if="entry.version">
                    {{ entry.version }}
                  </template>
                  <time v-else :datetime="entry.date">{{ entry.date }}</time>
                </h3>
                <time v-if="entry.version" :datetime="entry.date" class="changelog-date text-xs text-gray-500 dark:text-gray-400 tabular-nums">{{ entry.date }}</time>
              </header>
              <div class="space-y-3 text-gray-700 dark:text-gray-300">
                <MarkdownContent v-if="entry.intro" :content="entry.intro" />
                <div v-for="group in entry.groups" :key="group.title" class="changelog-category grid items-start gap-x-3 gap-y-1">
                  <h4
                    class="w-max max-w-full rounded-md px-2 py-0.5 text-xs font-semibold"
                    :class="categoryColors.get(group.title) ?? 'bg-blue-500/10 text-blue-700 dark:text-blue-300'"
                  >
                    {{ group.title }}
                  </h4>
                  <MarkdownContent :content="group.content" />
                </div>
              </div>
            </article>
          </template>
        </div>
      </template>
    </section>

    <p v-if="!log.intro && !log.plan && !log.recent.length" class="text-sm text-gray-500 dark:text-gray-400">
      {{ t('Settings.changelog_empty') }}
    </p>
  </div>
</template>

<style scoped>
.changelog-timeline {
  --changelog-rail: 4px;
  --changelog-indent: 20px;
}

.changelog-timeline::before {
  position: absolute;
  inset-block: 10px 24px;
  inset-inline-start: var(--changelog-rail);
  width: 1px;
  background: currentColor;
  opacity: 0.16;
  content: '';
}

.changelog-release,
.changelog-disclosure {
  padding-inline-start: var(--changelog-indent);
}

.changelog-release::before {
  position: absolute;
  top: 9px;
  inset-inline-start: calc(var(--changelog-rail) - 4px);
  width: 9px;
  height: 9px;
  border: 2px solid #94a3b8;
  border-radius: 50%;
  background: var(--theme-surface, #fff);
  content: '';
}

.changelog-release-latest::before {
  border-color: #3b82f6;
  background: #3b82f6;
}

.changelog-release :deep(.markdown-content li > :is(ul, ol)) {
  margin-block: 2px 4px;
}

@media (min-width: 1024px) {
  .changelog-timeline {
    --changelog-rail: 92px;
    --changelog-indent: 112px;
  }

  .changelog-date {
    position: absolute;
    top: 6px;
    inset-inline-end: calc(100% - var(--changelog-rail) + 13px);
    white-space: nowrap;
  }

  .changelog-category { grid-template-columns: 5rem minmax(0, 1fr); }
  .changelog-category > h4 { margin-block-start: 6px; }
  .changelog-plans { grid-template-columns: repeat(auto-fit, minmax(9rem, 1fr)); }
}
</style>
