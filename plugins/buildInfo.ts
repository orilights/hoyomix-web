import type { IndexHtmlTransformResult, Plugin } from 'vite'

const buildInfo: () => Plugin = () => {
  return {
    name: 'build-info',
    enforce: 'post',

    transformIndexHtml() {
      const els: IndexHtmlTransformResult = []
      els.push({
        tag: 'script',
        injectTo: 'body',
        children: `
        __BUILD_TIME__ = "${new Date().toISOString()}"
        `,
      })
      // console.log(process.env);

      return els
    },
  }
}
export default buildInfo
