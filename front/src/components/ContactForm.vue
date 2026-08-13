<script setup>
import { ref } from 'vue'

const props = defineProps({
  typeOptions: { type: Array, default: () => [] },
})

const form = ref({ type: props.typeOptions[0] ?? '', name: '', contact: '', email: '', message: '' })
const submitted = ref(false)

function handleSubmit() {
  submitted.value = true
}
</script>

<template>
  <div>
    <form v-if="!submitted" class="max-w-xl space-y-6" @submit.prevent="handleSubmit">
      <div v-if="typeOptions.length" class="flex flex-wrap gap-4">
        <label v-for="option in typeOptions" :key="option" class="flex items-center gap-2 text-sm text-ink">
          <input type="radio" :value="option" v-model="form.type" name="inquiry-type" class="accent-accent" />
          {{ option }}
        </label>
      </div>

      <div class="grid gap-6 sm:grid-cols-2">
        <label class="block text-sm text-ink">
          이름
          <input
            v-model="form.name"
            type="text"
            required
            class="mt-2 w-full border border-line bg-base px-4 py-2.5 text-sm text-ink focus:border-accent focus:outline-none"
          />
        </label>
        <label class="block text-sm text-ink">
          연락처
          <input
            v-model="form.contact"
            type="tel"
            required
            class="mt-2 w-full border border-line bg-base px-4 py-2.5 text-sm text-ink focus:border-accent focus:outline-none"
          />
        </label>
      </div>

      <label class="block text-sm text-ink">
        이메일
        <input
          v-model="form.email"
          type="email"
          required
          class="mt-2 w-full border border-line bg-base px-4 py-2.5 text-sm text-ink focus:border-accent focus:outline-none"
        />
      </label>

      <label class="block text-sm text-ink">
        문의 내용
        <textarea
          v-model="form.message"
          rows="5"
          required
          class="mt-2 w-full border border-line bg-base px-4 py-2.5 text-sm text-ink focus:border-accent focus:outline-none"
        />
      </label>

      <button type="submit" class="bg-ink px-6 py-3 text-sm tracking-wide text-base hover:bg-accent">
        문의 보내기
      </button>
    </form>

    <p v-else class="max-w-xl border border-line bg-accent-soft px-6 py-8 text-sm text-ink">
      문의가 접수되었습니다. 담당자가 확인 후 순차적으로 연락드리겠습니다.
    </p>
  </div>
</template>
