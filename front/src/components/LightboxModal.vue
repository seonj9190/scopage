<script setup>
import { onMounted, onUnmounted } from 'vue'

const emit = defineEmits(['close'])

function onKeydown(e) {
  if (e.key === 'Escape') emit('close')
}

onMounted(() => document.addEventListener('keydown', onKeydown))
onUnmounted(() => document.removeEventListener('keydown', onKeydown))
</script>

<template>
  <Teleport to="body">
    <div
      class="fixed inset-0 z-50 flex items-center justify-center bg-ink/90 p-6"
      role="dialog"
      aria-modal="true"
      @click.self="emit('close')"
    >
      <button
        type="button"
        class="absolute right-6 top-6 text-sm tracking-wide text-base hover:text-accent"
        aria-label="닫기"
        @click="emit('close')"
      >
        닫기 ✕
      </button>
      <div class="max-h-full max-w-4xl">
        <slot />
      </div>
    </div>
  </Teleport>
</template>
