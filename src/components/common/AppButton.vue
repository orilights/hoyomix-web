<script setup lang="ts">
interface Props {
  variant?: 'primary' | 'secondary' | 'danger' | 'outline' | 'ghost' | 'dark'
  size?: 'xs' | 'sm' | 'md' | 'lg'
  iconOnly?: boolean
  shape?: 'rounded' | 'pill'
  type?: 'button' | 'submit' | 'reset'
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'secondary',
  size: 'md',
  iconOnly: false,
  shape: 'rounded',
  type: 'button',
})

const variantClasses: Record<NonNullable<Props['variant']>, string> = {
  primary: 'bg-blue-500/90 text-white hover:bg-blue-600',
  secondary: 'bg-gray-500/10 hover:bg-gray-500/20',
  danger: 'bg-red-50 dark:bg-red-500/15 text-red-500 hover:bg-red-100 hover:dark:bg-red-500/15',
  outline: 'border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 hover:dark:bg-gray-800',
  ghost: 'text-gray-500 dark:text-gray-400 hover:text-gray-700 hover:dark:text-gray-300 hover:bg-gray-500/10',
  dark: 'text-white/60 hover:text-white hover:bg-white/10',
}

const textSizeClasses: Record<NonNullable<Props['size']>, string> = {
  xs: 'text-xs px-2 py-1',
  sm: 'text-sm px-3 py-1.5',
  md: 'text-sm px-3 py-2',
  lg: 'text-sm px-6 py-2.5',
}

const iconSizeClasses: Record<NonNullable<Props['size']>, string> = {
  xs: 'p-1',
  sm: 'p-1.5',
  md: 'p-2',
  lg: 'p-2.5',
}

const buttonClasses = computed(() => [
  'inline-flex items-center justify-center gap-1 transition-colors cursor-pointer',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/60',
  'disabled:opacity-50 disabled:cursor-not-allowed',
  props.iconOnly ? iconSizeClasses[props.size] : textSizeClasses[props.size],
  props.shape === 'pill' ? 'rounded-full' : 'rounded-lg',
  variantClasses[props.variant],
])
</script>

<template>
  <button :type="props.type" :class="buttonClasses">
    <slot />
  </button>
</template>
