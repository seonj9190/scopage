<script setup>
import PageHero from '@/components/PageHero.vue'
import SectionTitle from '@/components/SectionTitle.vue'

const history = [
  { year: '2016', event: '서귀포챔버오케스트라 창단, 창단 연주회 개최' },
  { year: '2018', event: '제주특별자치도 등록 민간예술단체 지정' },
  { year: '2020', event: '찾아가는 음악회 시작, 지역 초·중학교 순회 공연' },
  { year: '2023', event: '정기연주회 10회 돌파, 협연 프로그램 확대' },
  { year: '2026', event: '제18회 정기연주회 준비 및 상시 후원 프로그램 운영' },
]
</script>

<template>
  <div>
    <PageHero
      eyebrow="About"
      title="소개"
      description="지역과 함께 성장하는 클래식 음악 단체, 서귀포챔버오케스트라를 소개합니다."
    />

    <section class="mx-auto max-w-6xl px-6 py-20 lg:px-8">
      <SectionTitle eyebrow="Greeting" title="인사말" />
      <div class="max-w-2xl space-y-5 text-sm leading-relaxed text-muted">
        <p>
          안녕하십니까, 서귀포챔버오케스트라입니다. 저희는 클래식 음악이 특별한 순간뿐 아니라
          일상 속에서도 함께할 수 있다는 믿음으로 무대에 서고 있습니다.
        </p>
        <p>
          지역 주민 여러분과 가까이에서 호흡하는 오케스트라가 되고자 정기연주회는 물론
          학교와 공공기관을 찾아가는 음악회를 꾸준히 이어오고 있습니다. 앞으로도 서귀포를
          대표하는 클래식 음악 단체로서 한걸음씩 나아가겠습니다.
        </p>
        <p class="text-ink">서귀포챔버오케스트라 음악감독 김서현</p>
      </div>
    </section>

    <section class="border-t border-line bg-accent-soft">
      <div class="mx-auto max-w-6xl px-6 py-20 lg:px-8">
        <SectionTitle eyebrow="History" title="연혁" />
        <ol class="space-y-6">
          <li v-for="item in history" :key="item.year" class="flex gap-6 border-b border-line pb-6">
            <span class="w-16 shrink-0 text-sm text-accent">{{ item.year }}</span>
            <span class="text-sm text-ink">{{ item.event }}</span>
          </li>
        </ol>
      </div>
    </section>

    <section class="mx-auto max-w-6xl px-6 py-20 lg:px-8">
      <SectionTitle eyebrow="Mission" title="창단 취지" />
      <p class="max-w-2xl text-sm leading-relaxed text-muted">
        서귀포챔버오케스트라는 지역 사회에서 클래식 음악을 향유할 기회가 부족하다는 문제의식에서
        출발했습니다. 전문 연주자가 만드는 무대를 통해 서귀포 시민 누구나
        부담 없이 클래식을 접할 수 있는 환경을 만들어가는 것을 목표로 합니다.
      </p>
    </section>
  </div>
</template>
