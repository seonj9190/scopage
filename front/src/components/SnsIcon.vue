<script setup>
defineProps({
  name: {
    type: String,
    required: true,
    validator: (value) => ['instagram', 'youtube'].includes(value)
  }
})
</script>

<template>
  <svg
    v-if="name === 'instagram'"
    viewBox="0 0 24 24"
    role="img"
    aria-hidden="true"
    class="h-full w-full"
  >
    <defs>
      <linearGradient :id="`ig-grad-${name}`" x1="0%" y1="100%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#feda75" />
        <stop offset="25%" stop-color="#fa7e1e" />
        <stop offset="50%" stop-color="#d62976" />
        <stop offset="75%" stop-color="#962fbf" />
        <stop offset="100%" stop-color="#4f5bd5" />
      </linearGradient>
    </defs>
    <rect x="1" y="1" width="22" height="22" rx="6" :fill="`url(#ig-grad-${name})`" />
    <rect
      x="4.5"
      y="4.5"
      width="15"
      height="15"
      rx="4.25"
      fill="none"
      stroke="#fff"
      stroke-width="2"
    />
    <circle cx="12" cy="12" r="3.75" fill="none" stroke="#fff" stroke-width="2" />
    <circle cx="16.75" cy="7.25" r="1.15" fill="#fff" />
  </svg>

  <svg
    v-else-if="name === 'youtube'"
    viewBox="0 0 24 24"
    role="img"
    aria-hidden="true"
    class="h-full w-full"
  >
    <path
      fill="#FF0000"
      d="M23.5 6.5a3 3 0 0 0-2.1-2.12C19.5 3.86 12 3.86 12 3.86s-7.5 0-9.4.52A3 3 0 0 0 .5 6.5C0 8.4 0 12 0 12s0 3.6.5 5.5a3 3 0 0 0 2.1 2.12c1.9.52 9.4.52 9.4.52s7.5 0 9.4-.52A3 3 0 0 0 23.5 17.5c.5-1.9.5-5.5.5-5.5s0-3.6-.5-5.5Z"
    />
    <path fill="#fff" d="M9.6 15.6V8.4L15.82 12 9.6 15.6Z" />
  </svg>
</template>
