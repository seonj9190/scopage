<script setup>
import PageHero from '@/components/PageHero.vue'
import SectionTitle from '@/components/SectionTitle.vue'
import { conductor, members } from '@/data/members.js'
</script>

<template>
  <div>
    <PageHero
      eyebrow="Members"
      title="단원소개"
      description="서귀포챔버오케스트라를 이끌어가는 지휘자와 단원들을 소개합니다."
    />

    <section class="mx-auto max-w-6xl px-6 py-20 lg:px-8">
      <SectionTitle eyebrow="Conductor" title="지휘자" />
      <div class="grid gap-8 sm:grid-cols-[240px_1fr]">
        <img
          :src="conductor.photo"
          :alt="`${conductor.name} 프로필 사진`"
          class="aspect-[3/4] w-full max-w-xs object-cover"
          loading="lazy"
        />
        <div>
          <p class="text-lg text-ink">{{ conductor.name }}</p>
          <p class="mt-1 text-sm text-accent">{{ conductor.role }}</p>
          <p class="mt-4 max-w-xl text-sm leading-relaxed text-muted">{{ conductor.exp1 }}</p>
          <p class="mt-2 max-w-xl text-sm leading-relaxed text-muted">{{ conductor.exp2 }}</p>
        </div>
      </div>
    </section>

    <section class="border-t border-line">
      <div class="mx-auto max-w-6xl px-6 py-20 lg:px-8">
        <SectionTitle eyebrow="Members" title="단원" />
        <ul class="grid grid-cols-2 gap-x-6 gap-y-12 sm:grid-cols-3 lg:grid-cols-4">
          <li v-for="member in members" :key="member.id">
            <img
              :src="member.photo"
              :alt="`${member.name} 프로필 사진`"
              class="aspect-[3/4] w-full object-cover"
              loading="lazy"
            />
            <p class="mt-4 text-sm text-ink">{{ member.name }}</p>
            <p class="mt-1 text-xs text-accent">{{ member.part }}</p>
            <p class="mt-2 text-xs leading-relaxed text-muted">{{ member.exp1 }}</p>
            <p class="mt-2 text-xs leading-relaxed text-muted">{{ member.exp2 }}</p>
          </li>
        </ul>
      </div>
    </section>
  </div>
</template>
