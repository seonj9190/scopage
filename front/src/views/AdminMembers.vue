<script setup>
import { ref, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { useAuth } from '@/auth'

const { api } = useAuth()

const members = ref([])
const loading = ref(true)
const errorMsg = ref('')
const successMsg = ref('')

const form = ref({ username: '', password: '', name: '', isAdmin: false })
const creating = ref(false)

async function loadMembers() {
  loading.value = true
  try {
    const { members: list } = await api('/admin/members')
    members.value = list
  } catch (err) {
    errorMsg.value = err.message
  } finally {
    loading.value = false
  }
}

onMounted(loadMembers)

async function createMember() {
  errorMsg.value = ''
  successMsg.value = ''
  creating.value = true
  try {
    await api('/admin/members', { method: 'POST', body: JSON.stringify(form.value) })
    successMsg.value = `${form.value.name}님 계정이 생성되었습니다.`
    form.value = { username: '', password: '', name: '', isAdmin: false }
    await loadMembers()
  } catch (err) {
    errorMsg.value = err.message
  } finally {
    creating.value = false
  }
}

const resetPasswordFor = ref(null)
const newPassword = ref('')

async function submitPasswordReset(member) {
  if (!newPassword.value) return
  try {
    await api(`/admin/members/${member.id}`, {
      method: 'PUT',
      body: JSON.stringify({ password: newPassword.value }),
    })
    successMsg.value = `${member.name}님 비밀번호가 변경되었습니다.`
    resetPasswordFor.value = null
    newPassword.value = ''
  } catch (err) {
    errorMsg.value = err.message
  }
}
</script>

<template>
  <div class="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
    <div class="mb-6 flex items-center justify-between">
      <h1 class="text-2xl font-light tracking-tight text-ink">멤버 관리</h1>
      <RouterLink to="/calendar" class="text-sm text-accent hover:underline">캘린더로 돌아가기</RouterLink>
    </div>

    <p v-if="errorMsg" class="mb-4 text-sm text-rose-600">{{ errorMsg }}</p>
    <p v-if="successMsg" class="mb-4 text-sm text-emerald-600">{{ successMsg }}</p>

    <section class="mb-10 border border-line p-5">
      <h2 class="mb-4 text-sm font-medium text-ink">새 멤버 추가</h2>
      <form class="grid gap-3 sm:grid-cols-2" @submit.prevent="createMember">
        <input v-model="form.name" type="text" placeholder="이름" required class="border border-line px-3 py-2 text-sm" />
        <input v-model="form.username" type="text" placeholder="아이디" required class="border border-line px-3 py-2 text-sm" />
        <input v-model="form.password" type="password" placeholder="비밀번호" required class="border border-line px-3 py-2 text-sm" />
        <label class="inline-flex items-center gap-2 text-sm text-muted">
          <input v-model="form.isAdmin" type="checkbox" />
          관리자 권한 부여
        </label>
        <button
          type="submit"
          :disabled="creating"
          class="sm:col-span-2 bg-ink px-4 py-2 text-sm text-base hover:bg-accent disabled:opacity-50"
        >
          {{ creating ? '생성 중...' : '멤버 추가' }}
        </button>
      </form>
    </section>

    <section>
      <h2 class="mb-4 text-sm font-medium text-ink">멤버 목록</h2>
      <div v-if="loading" class="text-sm text-muted">불러오는 중...</div>
      <ul v-else class="divide-y divide-line border border-line">
        <li v-for="m in members" :key="m.id" class="flex items-center justify-between gap-4 px-4 py-3">
          <div class="flex items-center gap-3">
            <span class="h-3 w-3 rounded-full" :style="{ backgroundColor: m.color }" />
            <span class="text-sm text-ink">{{ m.name }}</span>
            <span class="text-xs text-muted">@{{ m.username }}</span>
            <span v-if="m.isAdmin" class="text-xs text-accent">관리자</span>
          </div>

          <div v-if="resetPasswordFor === m.id" class="flex items-center gap-2">
            <input v-model="newPassword" type="password" placeholder="새 비밀번호" class="border border-line px-2 py-1 text-xs" />
            <button type="button" class="text-xs text-accent hover:underline" @click="submitPasswordReset(m)">확인</button>
            <button type="button" class="text-xs text-muted hover:underline" @click="resetPasswordFor = null">취소</button>
          </div>
          <button v-else type="button" class="text-xs text-muted hover:text-ink hover:underline" @click="resetPasswordFor = m.id; newPassword = ''">
            비밀번호 변경
          </button>
        </li>
      </ul>
    </section>
  </div>
</template>
