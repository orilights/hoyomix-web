import { defineConfig, presetWind3 } from 'unocss'
import { browserCompat, toRgbChannels } from './plugins/unoBrowserCompat.ts'
import { theme } from './uno-theme.ts'

export default defineConfig({
  presets: [
    presetWind3(),
  ],
  theme,
  rules: [
    // Wind3 otherwise drops opacity for arbitrary CSS variable colors.
    [/^bg-\[var\((--[\w-]+)\)\]\/([\d.]+)$/, ([, variable, opacity]) => ({
      'background-color': `color-mix(in oklab, var(${variable}) ${opacity}%, transparent)`,
    })],
    [/^duration-(\d+)$/, ([, duration]) => ({
      '--un-duration': `${duration}ms`,
      'transition-duration': `${duration}ms`,
    })],
    ['collapse', { visibility: 'collapse' }],
    ['outline', { 'outline-width': '1px', 'outline-style': 'solid' }],
    ['outline-2', { 'outline-width': '2px', 'outline-style': 'solid' }],
    ['outline-none', { 'outline-style': 'none' }],
    ['bg-gradient-to-r', {
      '--un-gradient-shape': 'to right in oklab',
      '--un-gradient': 'var(--un-gradient-shape), var(--un-gradient-stops)',
      'background-image': 'linear-gradient(var(--un-gradient))',
    }],
  ],
  postprocess: [(utility) => {
    // Keep the previous inherited duration for nested transition utilities.
    if (utility.entries.some(([property]) => property === '--un-duration'))
      return
    for (const entry of utility.entries) {
      if (entry[0] === 'transition-duration')
        entry[1] = `var(--un-duration, ${entry[1]})`
    }
  }, browserCompat],
  preflights: [
    {
      getCSS: () => `:root {
        --colors-gray-400: ${theme.colors.gray[400]};
        --colors-gray-600: ${theme.colors.gray[600]};
        --colors-blue-500: ${theme.colors.blue[500]};
        --colors-blue-600: ${theme.colors.blue[600]};
      }
      @supports not (color: oklch(0% 0 0)) {
        :root {
          --colors-gray-400: rgb(${toRgbChannels(theme.colors.gray[400])});
          --colors-gray-600: rgb(${toRgbChannels(theme.colors.gray[600])});
          --colors-blue-500: rgb(${toRgbChannels(theme.colors.blue[500])});
          --colors-blue-600: rgb(${toRgbChannels(theme.colors.blue[600])});
        }
      }
      *, ::before, ::after, ::backdrop { --un-ring-color: currentColor; }`,
    },
  ],
  content: {
    pipeline: {
      include: [
        /\.(vue|svelte|[jt]sx|vine.ts|mdx?|astro|elm|php|phtml|marko|html)($|\?)/,
        'src/**/*.{js,ts}',
      ],
    },
  },
})
