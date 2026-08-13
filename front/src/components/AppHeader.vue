<script setup>
import { ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'

const navItems = [
  { to: '/about', label: '소개' },
  { to: '/members', label: '단원소개' },
  { to: '/performances', label: '공연일정' },
  { to: '/gallery', label: '갤러리' },
  { to: '/inquiry', label: '공연문의' },
  { to: '/support', label: '후원' },
]

const isOpen = ref(false)
const route = useRoute()
watch(
  () => route.path,
  () => {
    isOpen.value = false
  }
)
</script>

<template>
  <header class="sticky top-0 z-40 border-b border-line bg-base/90 backdrop-blur">
    <div class="mx-auto flex h-16 max-w-6xl items-center justify-between px-6 lg:px-8">
      <RouterLink to="/" class="flex items-center gap-2" aria-label="서귀포챔버오케스트라 홈으로 이동">
        <img src="/mainlogo(only).png" alt="서귀포챔버오케스트라 로고" class="h-9 w-auto" />
      </RouterLink>

      <nav class="hidden md:block" aria-label="주요 메뉴">
        <ul class="flex items-center gap-8 text-sm text-ink">
          <li v-for="item in navItems" :key="item.to">
            <RouterLink
              :to="item.to"
              class="transition-colors hover:text-accent"
              active-class="text-accent"
            >
              {{ item.label }}
            </RouterLink>
          </li>
        </ul>
      </nav>

      <button
        type="button"
        class="flex h-9 w-9 items-center justify-center md:hidden"
        :aria-expanded="isOpen"
        aria-controls="mobile-menu"
        aria-label="메뉴 열기/닫기"
        @click="isOpen = !isOpen"
      >
        <span class="relative block h-4 w-5">
          <span
            class="absolute left-0 top-0 block h-px w-5 bg-ink transition-transform"
            :class="isOpen ? 'translate-y-[7px] rotate-45' : ''"
          />
          <span
            class="absolute left-0 top-[7px] block h-px w-5 bg-ink transition-opacity"
            :class="isOpen ? 'opacity-0' : ''"
          />
          <span
            class="absolute left-0 top-[14px] block h-px w-5 bg-ink transition-transform"
            :class="isOpen ? '-translate-y-[7px] -rotate-45' : ''"
          />
        </span>
      </button>
    </div>

    <nav
      v-if="isOpen"
      id="mobile-menu"
      class="border-t border-line md:hidden"
      aria-label="모바일 메뉴"
    >
      <ul class="mx-auto max-w-6xl px-6 py-4 text-sm text-ink">
        <li v-for="item in navItems" :key="item.to">
          <RouterLink
            :to="item.to"
            class="block py-3 transition-colors hover:text-accent"
            active-class="text-accent"
          >
            {{ item.label }}
          </RouterLink>
        </li>
      </ul>
    </nav>
  </header>
</template>
