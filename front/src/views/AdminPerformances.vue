<script setup>
import { ref, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { useAuth } from '@/auth'

const { api } = useAuth()

const performances = ref([])
const loading = ref(true)
const errorMsg = ref('')
const successMsg = ref('')

async function loadPerformances() {
  loading.value = true
  errorMsg.value = ''
  try {
    const { performances: list } = await api('/public/performances')
    performances.value = list
  } catch (err) {
    errorMsg.value = err.message
  } finally {
    loading.value = false
  }
}

onMounted(loadPerformances)

function buildFormData(fields, posterFile) {
  const data = new FormData()
  for (const [key, value] of Object.entries(fields)) {
    if (value !== null && value !== undefined) data.append(key, value)
  }
  if (posterFile) data.append('poster', posterFile)
  return data
}

function formatDate(dateStr) {
  const [y, m, d] = dateStr.split('-')
  return `${y}.${m}.${d}`
}

// ---- Create ----

function emptyCreateForm() {
  return { title: '', date: '', time: '', venue: '', program: '', description: '' }
}

const form = ref(emptyCreateForm())
const createPosterInput = ref(null)
const creating = ref(false)

async function createPerformance() {
  creating.value = true
  errorMsg.value = ''
  successMsg.value = ''
  try {
    const data = buildFormData(form.value, createPosterInput.value?.files?.[0])
    const { performance } = await api('/admin/performances', { method: 'POST', body: data })
    performances.value.push(performance)
    form.value = emptyCreateForm()
    if (createPosterInput.value) createPosterInput.value.value = ''
    successMsg.value = `"${performance.title}" 공연을 추가했습니다.`
  } catch (err) {
    errorMsg.value = err.message
  } finally {
    creating.value = false
  }
}

// ---- Edit ----

const editingId = ref(null)
const editForm = ref(emptyCreateForm())
const editPosterInput = ref(null)
const saving = ref(false)

function openEdit(perf) {
  editingId.value = perf.id
  editForm.value = {
    title: perf.title,
    date: perf.date,
    time: perf.time || '',
    venue: perf.venue || '',
    program: perf.program || '',
    description: perf.description || '',
  }
}

function closeEdit() {
  editingId.value = null
  if (editPosterInput.value) editPosterInput.value.value = ''
}

async function submitEdit(perf) {
  saving.value = true
  errorMsg.value = ''
  successMsg.value = ''
  try {
    const data = buildFormData(editForm.value, editPosterInput.value?.files?.[0])
    const { performance: updated } = await api(`/admin/performances/${perf.id}`, { method: 'PUT', body: data })
    Object.assign(perf, updated)
    successMsg.value = `"${updated.title}" 공연을 수정했습니다.`
    closeEdit()
  } catch (err) {
    errorMsg.value = err.message
  } finally {
    saving.value = false
  }
}

// ---- Delete ----

async function removePerformance(perf) {
  if (!confirm(`"${perf.title}" 공연을 삭제할까요?`)) return
  errorMsg.value = ''
  try {
    await api(`/admin/performances/${perf.id}`, { method: 'DELETE' })
    performances.value = performances.value.filter((p) => p.id !== perf.id)
  } catch (err) {
    errorMsg.value = err.message
  }
}
</script>

<template>
  <div class="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
    <div class="mb-6 flex flex-wrap items-center justify-between gap-3">
      <h1 class="text-2xl font-light tracking-tight text-ink">공연 관리</h1>
      <div class="flex items-center gap-3 text-sm">
        <RouterLink to="/admin/gallery" class="text-accent hover:underline">갤러리 관리</RouterLink>
        <RouterLink to="/admin/members" class="text-accent hover:underline">멤버 관리</RouterLink>
        <RouterLink to="/calendar" class="text-accent hover:underline">캘린더로 돌아가기</RouterLink>
      </div>
    </div>

    <p v-if="errorMsg" class="mb-4 text-sm text-rose-600">{{ errorMsg }}</p>
    <p v-if="successMsg" class="mb-4 text-sm text-emerald-600">{{ successMsg }}</p>

    <section class="mb-10 border border-line p-5">
      <h2 class="mb-4 text-sm font-medium text-ink">새 공연 추가</h2>
      <form class="grid gap-3 sm:grid-cols-2" @submit.prevent="createPerformance">
        <input v-model="form.title" type="text" placeholder="공연 제목" required class="border border-line px-3 py-2 text-sm sm:col-span-2" />
        <input v-model="form.date" type="date" required class="border border-line px-3 py-2 text-sm" />
        <input v-model="form.time" type="text" placeholder="시간 (예: 18:00)" class="border border-line px-3 py-2 text-sm" />
        <input v-model="form.venue" type="text" placeholder="장소" class="border border-line px-3 py-2 text-sm sm:col-span-2" />
        <input v-model="form.program" type="text" placeholder="프로그램" class="border border-line px-3 py-2 text-sm sm:col-span-2" />
        <textarea
          v-model="form.description"
          rows="3"
          placeholder="설명 (선택)"
          class="border border-line px-3 py-2 text-sm sm:col-span-2"
        ></textarea>
        <div class="sm:col-span-2">
          <label class="mb-1 block text-xs text-muted">포스터 (선택)</label>
          <input ref="createPosterInput" type="file" accept="image/*" class="w-full text-sm" />
        </div>
        <button
          type="submit"
          :disabled="creating"
          class="sm:col-span-2 bg-ink px-4 py-2 text-sm text-base hover:bg-accent disabled:opacity-50"
        >
          {{ creating ? '추가 중...' : '공연 추가' }}
        </button>
      </form>
    </section>

    <section>
      <h2 class="mb-4 text-sm font-medium text-ink">등록된 공연 ({{ performances.length }})</h2>
      <div v-if="loading" class="text-sm text-muted">불러오는 중...</div>
      <p v-else-if="!performances.length" class="text-sm text-muted">등록된 공연이 없습니다.</p>
      <ul v-else class="divide-y divide-line border border-line">
        <li v-for="perf in performances" :key="perf.id" class="p-4">
          <div class="flex items-start justify-between gap-4">
            <div class="flex min-w-0 items-start gap-3">
              <img
                v-if="perf.posterUrl"
                :src="perf.posterUrl"
                class="h-16 w-12 shrink-0 border border-line object-cover"
                alt=""
              />
              <div class="min-w-0">
                <p class="truncate text-sm text-ink">{{ perf.title }}</p>
                <p class="mt-0.5 text-xs text-muted">{{ formatDate(perf.date) }} · {{ perf.time || '시간 미정' }}</p>
                <p v-if="perf.venue" class="mt-0.5 text-xs text-muted">{{ perf.venue }}</p>
              </div>
            </div>
            <div class="flex shrink-0 items-center gap-3 text-xs">
              <button type="button" class="text-muted hover:text-ink hover:underline" @click="editingId === perf.id ? closeEdit() : openEdit(perf)">
                {{ editingId === perf.id ? '닫기' : '수정' }}
              </button>
              <button type="button" class="text-muted hover:text-rose-600 hover:underline" @click="removePerformance(perf)">
                삭제
              </button>
            </div>
          </div>

          <form
            v-if="editingId === perf.id"
            class="mt-3 grid gap-2 border-t border-line pt-3 sm:grid-cols-2"
            @submit.prevent="submitEdit(perf)"
          >
            <input v-model="editForm.title" type="text" placeholder="공연 제목" required class="border border-line px-2 py-1.5 text-sm sm:col-span-2" />
            <input v-model="editForm.date" type="date" required class="border border-line px-2 py-1.5 text-sm" />
            <input v-model="editForm.time" type="text" placeholder="시간 (예: 18:00)" class="border border-line px-2 py-1.5 text-sm" />
            <input v-model="editForm.venue" type="text" placeholder="장소" class="border border-line px-2 py-1.5 text-sm sm:col-span-2" />
            <input v-model="editForm.program" type="text" placeholder="프로그램" class="border border-line px-2 py-1.5 text-sm sm:col-span-2" />
            <textarea
              v-model="editForm.description"
              rows="3"
              placeholder="설명 (선택)"
              class="border border-line px-2 py-1.5 text-sm sm:col-span-2"
            ></textarea>
            <div class="sm:col-span-2">
              <label class="mb-1 block text-xs text-muted">포스터 교체 (선택)</label>
              <input ref="editPosterInput" type="file" accept="image/*" class="w-full text-sm" />
            </div>
            <button
              type="submit"
              :disabled="saving"
              class="justify-self-end bg-ink px-3 py-1.5 text-xs text-base hover:bg-accent disabled:opacity-50 sm:col-span-2"
            >
              {{ saving ? '저장 중...' : '저장' }}
            </button>
          </form>
        </li>
      </ul>
    </section>
  </div>
</template>
