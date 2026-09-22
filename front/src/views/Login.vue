<script setup>
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuth } from '@/auth'

const { login } = useAuth()
const router = useRouter()
const route = useRoute()

const username = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

async function onSubmit() {
  error.value = ''
  loading.value = true
  try {
    await login(username.value.trim(), password.value)
    router.replace(route.query.redirect || '/calendar')
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="mx-auto flex min-h-[70vh] max-w-sm flex-col justify-center px-6 py-16">
    <h1 class="mb-8 text-2xl font-light tracking-tight text-ink">단원 로그인</h1>
    <form class="space-y-4" @submit.prevent="onSubmit">
      <div>
        <label class="mb-1 block text-xs text-muted" for="username">아이디</label>
        <input
          id="username"
          v-model="username"
          type="text"
          autocomplete="username"
          required
          class="w-full border border-line px-4 py-2.5 text-sm text-ink outline-none focus:border-accent"
        />
      </div>
      <div>
        <label class="mb-1 block text-xs text-muted" for="password">비밀번호</label>
        <input
          id="password"
          v-model="password"
          type="password"
          autocomplete="current-password"
          required
          class="w-full border border-line px-4 py-2.5 text-sm text-ink outline-none focus:border-accent"
        />
      </div>
      <p v-if="error" class="text-sm text-rose-600">{{ error }}</p>
      <button
        type="submit"
        :disabled="loading"
        class="w-full bg-ink px-6 py-3 text-sm tracking-wide text-base transition-colors hover:bg-accent disabled:opacity-50"
      >
        {{ loading ? '로그인 중...' : '로그인' }}
      </button>
    </form>
  </div>
</template>
