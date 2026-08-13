<script setup>
defineProps({
  eyebrow: { type: String, default: '' },
  title: { type: String, required: true },
  description: { type: String, default: '' },
})
</script>

<template>
  <section class="border-b border-line bg-accent-soft">
    <div class="mx-auto max-w-6xl px-6 py-16 sm:py-20 lg:px-8">
      <p v-if="eyebrow" class="mb-3 text-xs tracking-[0.2em] text-accent uppercase">{{ eyebrow }}</p>
      <h1 class="text-3xl font-light tracking-tight text-ink sm:text-4xl">{{ title }}</h1>
      <p v-if="description" class="mt-4 max-w-2xl text-muted">{{ description }}</p>
    </div>
  </section>
</template>
