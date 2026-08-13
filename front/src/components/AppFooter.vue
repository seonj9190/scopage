<script setup>
import { RouterLink } from 'vue-router'

const year = new Date().getFullYear()

const snsLinks = [
  { label: 'Instagram', href: '#' },
  { label: 'YouTube', href: '#' },
  { label: 'Facebook', href: '#' },
]
</script>

<template>
  <footer class="border-t border-line">
    <div class="mx-auto max-w-6xl px-6 py-12 lg:px-8">
      <div class="flex flex-col gap-8 sm:flex-row sm:justify-between">
        <div>
          <p class="text-sm font-medium text-ink">서귀포챔버오케스트라</p>
          <p class="mt-2 text-sm text-muted">제주특별자치도 서귀포시 · 2016년 창단</p>
          <p class="mt-1 text-sm text-muted">
            문의 <a href="mailto:info@sgpchamber.kr" class="hover:text-accent">info@sgpchamber.kr</a>
            · <a href="tel:0640000000" class="hover:text-accent">064-000-0000</a>
          </p>
        </div>

        <nav aria-label="SNS 링크">
          <ul class="flex gap-6 text-sm text-muted">
            <li v-for="sns in snsLinks" :key="sns.label">
              <a :href="sns.href" class="hover:text-accent">{{ sns.label }}</a>
            </li>
          </ul>
        </nav>
      </div>

      <div class="mt-10 flex flex-col-reverse gap-4 border-t border-line pt-6 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
        <p>&copy; {{ year }} Seogwipo Chamber Orchestra. All rights reserved.</p>
        <RouterLink to="/support" class="hover:text-accent">후원 안내 바로가기</RouterLink>
      </div>
    </div>
  </footer>
</template>
