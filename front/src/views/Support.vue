<script setup>
import PageHero from '@/components/PageHero.vue'
import SectionTitle from '@/components/SectionTitle.vue'
import ContactForm from '@/components/ContactForm.vue'

const supportTypes = ['개인 후원', '기업 후원', '정기 후원', '일시 후원']

const benefits = [
  '정기연주회 초청 및 우선 예매 안내',
  '연간 후원자 명단 프로그램북 게재',
  '리허설 관람 및 단원과의 만남 초청',
  '후원 영수증 발급 (연말정산 세액공제)',
]
</script>

<template>
  <div>
    <PageHero
      eyebrow="Support"
      title="후원"
      description="서귀포챔버오케스트라와 함께 지역 클래식 음악의 미래를 만들어가 주세요."
    />

    <section class="mx-auto max-w-6xl px-6 py-20 lg:px-8">
      <SectionTitle eyebrow="How" title="후원 방법" />
      <div class="grid gap-10 sm:grid-cols-2">
        <div v-for="type in supportTypes" :key="type" class="border border-line px-6 py-8">
          <p class="text-sm text-ink">{{ type }}</p>
        </div>
      </div>

      <div class="mt-12 max-w-md border border-line bg-accent-soft px-6 py-8">
        <p class="text-xs tracking-[0.2em] text-accent uppercase">후원 계좌</p>
        <p class="mt-3 text-sm text-ink">농협 000-0000-0000-00</p>
        <p class="mt-1 text-sm text-muted">예금주 : 서귀포챔버오케스트라</p>
      </div>
    </section>

    <section class="border-t border-line bg-accent-soft">
      <div class="mx-auto max-w-6xl px-6 py-20 lg:px-8">
        <SectionTitle eyebrow="Benefits" title="후원 혜택" />
        <ul class="grid gap-6 sm:grid-cols-2">
          <li v-for="benefit in benefits" :key="benefit" class="flex gap-3 text-sm text-ink">
            <span class="text-accent">·</span>
            {{ benefit }}
          </li>
        </ul>
      </div>
    </section>

    <section class="mx-auto max-w-6xl px-6 py-20 lg:px-8">
      <SectionTitle eyebrow="Contact" title="후원 문의" description="후원 관련 문의는 아래 연락처 또는 문의 폼을 이용해주세요." />
      <p class="mb-10 text-sm text-ink">
        <a href="mailto:support@sgpchamber.kr" class="hover:text-accent">support@sgpchamber.kr</a>
        · <a href="tel:0640000001" class="hover:text-accent">064-000-0001</a>
      </p>
      <ContactForm :type-options="supportTypes" />
    </section>
  </div>
</template>
