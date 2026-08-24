<script setup>
import PageHero from '@/components/PageHero.vue'
import SectionTitle from '@/components/SectionTitle.vue'
//import ContactForm from '@/components/ContactForm.vue'

const inquiryTypes = ['공연 예약', '협연 문의', '단체 관람', '기타 문의']
</script>

<template>
  <div>
    <PageHero
      eyebrow="Inquiry"
      title="공연문의"
      description="공연 예약, 협연, 단체 관람 등 공연 관련 문의를 남겨주시면 안내해드립니다."
    />

    <section class="mx-auto max-w-6xl px-6 py-20 lg:px-8">
      <div class="grid gap-16 lg:grid-cols-[1fr_1.2fr]">
        <div>
          <SectionTitle eyebrow="Contact" title="연락처 안내" />
          <dl class="space-y-6 text-sm">
            <div>
              <dt class="text-accent">이메일</dt>
              <dd class="mt-1 text-ink">
                <a href="mailto:seogwipochamber@gmail.com" class="hover:text-accent">seogwipochamber@gmail.com</a>
              </dd>
            </div>
            <div>
              <dt class="text-accent">전화</dt>
              <dd class="mt-1 text-ink">
                <a href="tel:0640000000" class="hover:text-accent">064-000-0000</a> (평일 10:00 - 17:00)
              </dd>
            </div>
            <div>
              <dt class="text-accent">인스타그램</dt>
              <dd class="mt-1 text-ink">Instagram ID</dd>
            </div>
          </dl>
        </div>

        <!-- <div>
          <SectionTitle eyebrow="Form" title="문의 남기기" />
          <ContactForm :type-options="inquiryTypes" />
        </div> -->
      </div>
    </section>
  </div>
</template>
