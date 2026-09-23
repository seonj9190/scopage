<script setup>
import { ref, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { useAuth } from '@/auth'

const { state: authState, api } = useAuth()

const members = ref([])
const loading = ref(true)
const errorMsg = ref('')
const successMsg = ref('')

function emptyCreateForm() {
  return {
    username: '',
    password: '',
    name: '',
    isAdmin: false,
    part: '',
    bio1: '',
    bio2: '',
    isPublic: true,
    isConductor: false,
  }
}

const form = ref(emptyCreateForm())
const createPhotoInput = ref(null)
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

function buildMemberFormData(fields, photoFile) {
  const data = new FormData()
  for (const [key, value] of Object.entries(fields)) {
    if (typeof value === 'boolean') {
      data.append(key, value ? 'true' : 'false')
    } else if (value !== null && value !== undefined) {
      data.append(key, value)
    }
  }
  if (photoFile) data.append('photo', photoFile)
  return data
}

async function createMember() {
  errorMsg.value = ''
  successMsg.value = ''
  creating.value = true
  try {
    const data = buildMemberFormData(form.value, createPhotoInput.value?.files?.[0])
    await api('/admin/members', { method: 'POST', body: data })
    successMsg.value = `${form.value.name}님 계정이 생성되었습니다.`
    form.value = emptyCreateForm()
    if (createPhotoInput.value) createPhotoInput.value.value = ''
    await loadMembers()
  } catch (err) {
    errorMsg.value = err.message
  } finally {
    creating.value = false
  }
}

const reordering = ref(false)

async function moveMember(member, direction) {
  const index = members.value.findIndex((m) => m.id === member.id)
  const swapWith = index + direction
  if (swapWith < 0 || swapWith >= members.value.length) return

  const reordered = [...members.value]
  ;[reordered[index], reordered[swapWith]] = [reordered[swapWith], reordered[index]]
  members.value = reordered

  reordering.value = true
  errorMsg.value = ''
  try {
    const { members: updated } = await api('/admin/members/order', {
      method: 'PUT',
      body: JSON.stringify({ orderedIds: reordered.map((m) => m.id) }),
    })
    members.value = updated
  } catch (err) {
    errorMsg.value = err.message
    await loadMembers()
  } finally {
    reordering.value = false
  }
}

const resetPasswordFor = ref(null)
const newPassword = ref('')

async function submitPasswordReset(member) {
  if (!newPassword.value) return
  try {
    await api(`/admin/members/${member.id}`, {
      method: 'PUT',
      body: buildMemberFormData({ password: newPassword.value }),
    })
    successMsg.value = `${member.name}님 비밀번호가 변경되었습니다.`
    resetPasswordFor.value = null
    newPassword.value = ''
  } catch (err) {
    errorMsg.value = err.message
  }
}

const editUsernameFor = ref(null)
const newUsername = ref('')

async function submitUsernameChange(member) {
  if (!newUsername.value.trim()) return
  try {
    const { member: updated } = await api(`/admin/members/${member.id}`, {
      method: 'PUT',
      body: buildMemberFormData({ username: newUsername.value.trim() }),
    })
    member.username = updated.username
    successMsg.value = `${member.name}님 아이디가 변경되었습니다.`
    editUsernameFor.value = null
    newUsername.value = ''
  } catch (err) {
    errorMsg.value = err.message
  }
}

async function toggleActive(member) {
  const makeActive = !member.isActive
  if (!makeActive && !confirm(`${member.name}님 계정을 비활성화할까요? 로그인이 즉시 차단되지만, 기존 일정과 업로드 파일은 그대로 유지됩니다.`)) {
    return
  }
  errorMsg.value = ''
  successMsg.value = ''
  try {
    const { member: updated } = await api(`/admin/members/${member.id}`, {
      method: 'PUT',
      body: buildMemberFormData({ isActive: makeActive }),
    })
    member.isActive = updated.isActive
    successMsg.value = makeActive ? `${member.name}님 계정을 활성화했습니다.` : `${member.name}님 계정을 비활성화했습니다.`
  } catch (err) {
    errorMsg.value = err.message
  }
}

// ---- Profile edit (part / bio / photo / public) ----

const editProfileFor = ref(null)
const profileForm = ref({ part: '', bio1: '', bio2: '', isPublic: false, isConductor: false })
const editPhotoInput = ref(null)
const savingProfile = ref(false)

function openProfileEdit(member) {
  editProfileFor.value = member.id
  profileForm.value = {
    part: member.part || '',
    bio1: member.bio1 || '',
    bio2: member.bio2 || '',
    isPublic: member.isPublic,
    isConductor: member.isConductor,
  }
}

function closeProfileEdit() {
  editProfileFor.value = null
  if (editPhotoInput.value) editPhotoInput.value.value = ''
}

async function submitProfileEdit(member) {
  savingProfile.value = true
  errorMsg.value = ''
  successMsg.value = ''
  try {
    const data = buildMemberFormData(profileForm.value, editPhotoInput.value?.files?.[0])
    const { member: updated } = await api(`/admin/members/${member.id}`, { method: 'PUT', body: data })
    Object.assign(member, updated)
    successMsg.value = `${member.name}님 소개 정보를 저장했습니다.`
    closeProfileEdit()
  } catch (err) {
    errorMsg.value = err.message
  } finally {
    savingProfile.value = false
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

        <input v-model="form.part" type="text" placeholder="파트 (예: 바이올린)" class="border border-line px-3 py-2 text-sm" />
        <div>
          <input ref="createPhotoInput" type="file" accept="image/*" class="w-full text-sm" />
        </div>
        <input v-model="form.bio1" type="text" placeholder="소개 1 (선택)" class="border border-line px-3 py-2 text-sm sm:col-span-2" />
        <input v-model="form.bio2" type="text" placeholder="소개 2 (선택)" class="border border-line px-3 py-2 text-sm sm:col-span-2" />

        <label class="inline-flex items-center gap-2 text-sm text-muted">
          <input v-model="form.isPublic" type="checkbox" />
          단원소개 페이지에 공개
        </label>
        <label class="inline-flex items-center gap-2 text-sm text-muted">
          <input v-model="form.isConductor" type="checkbox" />
          지휘자로 지정
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
        <li v-for="m in members" :key="m.id" class="px-4 py-3" :class="!m.isActive ? 'opacity-50' : ''">
          <div class="flex items-center justify-between gap-4">
            <div class="flex items-center gap-3">
              <div class="flex flex-col">
                <button
                  type="button"
                  class="leading-none text-muted hover:text-ink disabled:opacity-30"
                  :disabled="reordering || m.id === members[0]?.id"
                  aria-label="위로 이동"
                  @click="moveMember(m, -1)"
                >▲</button>
                <button
                  type="button"
                  class="leading-none text-muted hover:text-ink disabled:opacity-30"
                  :disabled="reordering || m.id === members[members.length - 1]?.id"
                  aria-label="아래로 이동"
                  @click="moveMember(m, 1)"
                >▼</button>
              </div>
              <img
                v-if="m.photoUrl"
                :src="m.photoUrl"
                class="h-8 w-8 rounded-full object-cover"
                alt=""
              />
              <span v-else class="h-3 w-3 shrink-0 rounded-full" :style="{ backgroundColor: m.color }" />
              <span class="text-sm text-ink">{{ m.name }}</span>
              <span class="text-xs text-muted">@{{ m.username }}</span>
              <span v-if="m.part" class="text-xs text-accent">{{ m.part }}</span>
              <span v-if="m.isAdmin" class="text-xs text-accent">관리자</span>
              <span v-if="m.isPublic" class="text-xs text-emerald-600">공개</span>
              <span v-if="m.isConductor" class="text-xs text-accent">지휘자</span>
              <span v-if="!m.isActive" class="text-xs text-rose-600">비활성</span>
            </div>

            <div class="flex items-center gap-3">
              <div v-if="resetPasswordFor === m.id" class="flex items-center gap-2">
                <input v-model="newPassword" type="password" placeholder="새 비밀번호" class="border border-line px-2 py-1 text-xs" />
                <button type="button" class="text-xs text-accent hover:underline" @click="submitPasswordReset(m)">확인</button>
                <button type="button" class="text-xs text-muted hover:underline" @click="resetPasswordFor = null">취소</button>
              </div>
              <button v-else type="button" class="text-xs text-muted hover:text-ink hover:underline" @click="resetPasswordFor = m.id; newPassword = ''">
                비밀번호 변경
              </button>

              <div v-if="editUsernameFor === m.id" class="flex items-center gap-2">
                <input v-model="newUsername" type="text" placeholder="새 아이디" class="border border-line px-2 py-1 text-xs" />
                <button type="button" class="text-xs text-accent hover:underline" @click="submitUsernameChange(m)">확인</button>
                <button type="button" class="text-xs text-muted hover:underline" @click="editUsernameFor = null">취소</button>
              </div>
              <button v-else type="button" class="text-xs text-muted hover:text-ink hover:underline" @click="editUsernameFor = m.id; newUsername = m.username">
                아이디 변경
              </button>

              <button
                type="button"
                class="text-xs text-muted hover:text-ink hover:underline"
                @click="editProfileFor === m.id ? closeProfileEdit() : openProfileEdit(m)"
              >
                {{ editProfileFor === m.id ? '닫기' : '소개 수정' }}
              </button>

              <button
                v-if="m.id !== authState.member?.id"
                type="button"
                class="text-xs hover:underline"
                :class="m.isActive ? 'text-muted hover:text-rose-600' : 'text-accent'"
                @click="toggleActive(m)"
              >
                {{ m.isActive ? '비활성화' : '활성화' }}
              </button>
            </div>
          </div>

          <form
            v-if="editProfileFor === m.id"
            class="mt-3 grid gap-2 border-t border-line pt-3 sm:grid-cols-2"
            @submit.prevent="submitProfileEdit(m)"
          >
            <input v-model="profileForm.part" type="text" placeholder="파트" class="border border-line px-2 py-1.5 text-sm" />
            <input :ref="(el) => (editPhotoInput = el)" type="file" accept="image/*" class="text-sm" />
            <input v-model="profileForm.bio1" type="text" placeholder="소개 1" class="border border-line px-2 py-1.5 text-sm sm:col-span-2" />
            <input v-model="profileForm.bio2" type="text" placeholder="소개 2" class="border border-line px-2 py-1.5 text-sm sm:col-span-2" />
            <label class="inline-flex items-center gap-2 text-xs text-muted">
              <input v-model="profileForm.isPublic" type="checkbox" />
              단원소개 페이지에 공개
            </label>
            <label class="inline-flex items-center gap-2 text-xs text-muted">
              <input v-model="profileForm.isConductor" type="checkbox" />
              지휘자로 지정
            </label>
            <button
              type="submit"
              :disabled="savingProfile"
              class="justify-self-end bg-ink px-3 py-1.5 text-xs text-base hover:bg-accent disabled:opacity-50"
            >
              {{ savingProfile ? '저장 중...' : '저장' }}
            </button>
          </form>
        </li>
      </ul>
    </section>
  </div>
</template>
