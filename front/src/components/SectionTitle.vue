<script setup>
defineProps({
  eyebrow: { type: String, default: '' },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  align: { type: String, default: 'left' }, // left | center
})
</script>

<template>
  <div :class="['mb-12', align === 'center' ? 'text-center' : 'text-left']">
    <p v-if="eyebrow" class="mb-3 text-xs tracking-[0.2em] text-accent uppercase">{{ eyebrow }}</p>
    <h2 class="text-2xl font-light tracking-tight text-ink sm:text-3xl">{{ title }}</h2>
    <p v-if="description" class="mt-4 max-w-2xl text-muted" :class="align === 'center' ? 'mx-auto' : ''">
      {{ description }}
    </p>
  </div>
</template>
