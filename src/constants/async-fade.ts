import type { InjectionKey } from 'vue'

/** 详情页内的 AsyncFade 默认启用高度动画，单个组件可通过 prop 覆盖。 */
export const asyncFadeHeightKey: InjectionKey<boolean> = Symbol('async-fade-height')
