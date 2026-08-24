<script setup>
import PageHero from '@/components/PageHero.vue'
import SectionTitle from '@/components/SectionTitle.vue'

const history = [
  { year: '2026', event: '서귀포챔버오케스트라 창단, 창단 연주회 개최' },
  
]
</script>

<template>
  <div>
    <PageHero
      eyebrow="About"
      title="소개"
      description="지역과 함께 성장하는 클래식 음악 단체, 서귀포 챔버 오케스트라를 소개합니다."
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
        <p class="text-ink">서귀포챔버오케스트라 음악감독 홍정호</p>
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
        서귀포에는 관악과 합창, 국악 등 다양한 지역 예술 활동이 뿌리내려 가고 있습니다. 반면 클래식 음악의 근간이 되는 현악 앙상블, 즉 바이올린·비올라·첼로·콘트라베이스가 함께 어우러지는 전문 현악 오케스트라는 존재하지 않습니다. 제주도 전체를 보아도 현악 기반 단체는 제주시 권역에 편중되어 있어, 서귀포에서 활동하는 현악 전공자들은 정작 자신의 지역에서 함께 합주할 무대를 갖지 못해 서귀포 시민과 무대에서 만날 기회를 얻지 못하고 있습니다. 인재는 이미 이 지역에 있습니다. 없는 것은 그들이 함께 설 무대입니다.
이는 단순히 악단 하나가 없다는 사실을 넘어, 서귀포가 인류의 클래식 음악 유산을 스스로 연주하고 향유할 통로를 갖지 못했다는 것을 의미합니다. 하이든과 모차르트에서 시작해 오늘의 창작 음악에 이르는 현악 편성의 레퍼토리는 서양음악사의 뼈대이며, 이를 지역 스스로의 힘으로 무대에 올릴 수 있는가는 그 도시의 문화적 자립도를 가늠하는 척도이기도 합니다.
시민들의 삶의 질을 높이고 진정한 문화향유를 실현하기 위해 지금 우리에게 가장 필요한 것은 무엇인가라는 오랜 물음 끝에 다다른 결론이 바로 서귀포챔버오케스트라의 창단입니다. 이미 지역에서 활동해 온 현악 전공자들이 주축이 된 전문 연주단체가, 바로 이 비어 있던 자리를 채우기 위해 출발합니다.

      </p>
    </section>
  </div>
</template>
