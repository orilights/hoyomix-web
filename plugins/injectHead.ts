import type { Plugin } from 'vite'
import { Buffer } from 'node:buffer'
import process from 'node:process'

const injectHead: () => Plugin = () => {
  return {
    name: 'inject-head',
    apply: 'build',
    transformIndexHtml(html) {
      return html.replace(
        '</head>',
        `${Buffer.from(process.env.INJECT_HEAD_B || '', 'base64').toString('ascii')}</head>`,
      )
    },
  }
}
export default injectHead
