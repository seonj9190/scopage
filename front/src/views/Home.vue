<script setup>
import BaseButton from '@/components/BaseButton.vue'
import { performances } from '@/data/performances.js'

const nextPerformance = performances[0]
</script>

<template>
  <div>
    <section class="relative border-b border-line" aria-label="히어로">
      <div class="mx-auto max-w-6xl px-6 py-24 sm:py-32 lg:px-8 flex flex-col items-center text-center">
        <img src="/mainlogo(only).png" alt="서귀포챔버오케스트라 심볼" class="h-32 w-auto sm:h-20" />
        <h1 class="mt-6 max-w-3xl text-3xl font-light leading-snug tracking-tight text-ink sm:text-4xl">
          서귀포 챔버 오케스트라
          <span class="mt-2 block text-xs font-normal tracking-[0.3em] text-muted uppercase">
            Seogwipo Chamber Orchestra
          </span>
        </h1>
        <p class="mt-6 max-w-xl text-muted">
          2026년 창단된 서귀포챔버오케스트라는 지역과 함께 호흡하는 클래식 음악을 지향합니다.
        </p>
        <div class="mt-10 flex flex-wrap gap-4">
          <BaseButton to="/performances">공연일정 보기</BaseButton>
          <BaseButton to="/about" variant="outline">오케스트라 소개</BaseButton>
        </div>
      </div>
    </section>

    <section class="mx-auto max-w-6xl px-6 py-20 lg:px-8" aria-label="다음 공연">
      <div class="grid gap-10 border-t border-line pt-16 sm:grid-cols-3">
        <div>
          <h2 class="text-sm tracking-[0.2em] text-accent uppercase">Next Concert</h2>
          <p class="mt-4 text-lg text-ink">{{ nextPerformance.title }}</p>
          <p class="mt-2 text-sm text-muted">
            {{ nextPerformance.date }} · {{ nextPerformance.time }} · {{ nextPerformance.venue }}
          </p>
          <RouterLink to="/performances" class="mt-4 inline-block text-sm text-ink underline underline-offset-4 hover:text-accent">
            전체 일정 보기
          </RouterLink>
        </div>

        <div>
          <h2 class="text-sm tracking-[0.2em] text-accent uppercase">About Us</h2>
          <p class="mt-4 text-sm leading-relaxed text-muted">
            지휘자와 단원 소개, 창단 취지와 연혁을 통해 서귀포챔버오케스트라를 만나보세요.
          </p>
          <RouterLink to="/members" class="mt-4 inline-block text-sm text-ink underline underline-offset-4 hover:text-accent">
            단원소개 보기
          </RouterLink>
        </div>

        <div>
          <h2 class="text-sm tracking-[0.2em] text-accent uppercase">Support</h2>
          <p class="mt-4 text-sm leading-relaxed text-muted">
            여러분의 후원은 지역 클래식 음악 활동을 지속하는 힘이 됩니다.
          </p>
          <RouterLink to="/support" class="mt-4 inline-block text-sm text-ink underline underline-offset-4 hover:text-accent">
            후원 안내 보기
          </RouterLink>
        </div>
      </div>
    </section>
  </div>
</template>
