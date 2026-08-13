<script setup>
import { computed } from 'vue'
import { RouterLink } from 'vue-router'

const props = defineProps({
  to: { type: [String, Object], default: null },
  href: { type: String, default: null },
  variant: { type: String, default: 'primary' }, // primary | outline
})

const tag = computed(() => (props.to ? RouterLink : props.href ? 'a' : 'button'))

const baseClass =
  'inline-flex items-center justify-center gap-2 px-6 py-3 text-sm tracking-wide transition-colors'
const variantClass = computed(() =>
  props.variant === 'outline'
    ? 'border border-ink text-ink hover:bg-ink hover:text-base'
    : 'bg-ink text-base hover:bg-accent'
)
</script>

<template>
  <component :is="tag" :to="to" :href="href" :class="[baseClass, variantClass]">
    <slot />
  </component>
</template>
