<script setup>
import { ref, computed, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { useAuth } from '@/auth'

const { state: authState, api, logout } = useAuth()

const members = ref([])
const schedules = ref([])
const loading = ref(true)
const errorMsg = ref('')

const today = new Date()
const viewYear = ref(today.getFullYear())
const viewMonth = ref(today.getMonth()) // 0-based

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']
// Official team schedules aren't tied to one member's color.
const TEAM_COLOR = '#7a6a4f'

const monthLabel = computed(() => `${viewYear.value}년 ${viewMonth.value + 1}월`)

const membersById = computed(() => Object.fromEntries(members.value.map((m) => [m.id, m])))

function toDateOnly(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const calendarDays = computed(() => {
  const first = new Date(viewYear.value, viewMonth.value, 1)
  const start = new Date(first)
  start.setDate(start.getDate() - first.getDay())

  const days = []
  for (let i = 0; i < 42; i++) {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    days.push(d)
  }
  return days
})

function schedulesOn(dateObj) {
  const key = toDateOnly(dateObj)
  return schedules.value
    .filter((s) => {
      const sStart = s.start.slice(0, 10)
      const sEnd = s.end.slice(0, 10)
      return key >= sStart && key <= sEnd
    })
    .sort((a, b) => a.start.localeCompare(b.start))
}

function isCurrentMonth(d) {
  return d.getMonth() === viewMonth.value
}

function isToday(d) {
  return toDateOnly(d) === toDateOnly(today)
}

function weekdayTextClass(d) {
  if (d.getDay() === 0) return 'text-rose-600'
  if (d.getDay() === 6) return 'text-blue-600'
  return ''
}

function prevMonth() {
  const d = new Date(viewYear.value, viewMonth.value - 1, 1)
  viewYear.value = d.getFullYear()
  viewMonth.value = d.getMonth()
}

function nextMonth() {
  const d = new Date(viewYear.value, viewMonth.value + 1, 1)
  viewYear.value = d.getFullYear()
  viewMonth.value = d.getMonth()
}

function goToday() {
  viewYear.value = today.getFullYear()
  viewMonth.value = today.getMonth()
}

async function loadAll() {
  loading.value = true
  errorMsg.value = ''
  try {
    const [membersRes, schedulesRes] = await Promise.all([api('/members'), api('/schedules')])
    members.value = membersRes.members
    schedules.value = schedulesRes.schedules
  } catch (err) {
    errorMsg.value = err.message
  } finally {
    loading.value = false
  }
}

onMounted(loadAll)

// ---- Create / edit modal ----

const modalOpen = ref(false)
const editingId = ref(null)
const form = ref(emptyForm())

// New schedules shouldn't be assignable to a deactivated member, but an
// already-assigned inactive member must stay selectable while editing.
const assignableMembers = computed(() =>
  members.value.filter((m) => m.isActive || m.id === form.value.assignedMemberId)
)

function emptyForm(dateStr = toDateOnly(today)) {
  return {
    title: '',
    type: 'flexible',
    allDay: true,
    startDate: dateStr,
    endDate: dateStr,
    startTime: '09:00',
    endTime: '18:00',
    assignedMemberId: authState.member?.id || null,
    isTeam: false,
    repeat: 'none', // 'none' | 'weekly' | 'monthly' — only offered when creating
    repeatUntil: '',
  }
}

function openCreate(dateObj) {
  editingId.value = null
  form.value = emptyForm(toDateOnly(dateObj))
  modalOpen.value = true
}

function openEdit(schedule) {
  editingId.value = schedule.id
  form.value = {
    title: schedule.title,
    type: schedule.type,
    allDay: schedule.allDay,
    startDate: schedule.start.slice(0, 10),
    endDate: schedule.end.slice(0, 10),
    startTime: schedule.allDay ? '09:00' : schedule.start.slice(11, 16),
    endTime: schedule.allDay ? '18:00' : schedule.end.slice(11, 16),
    assignedMemberId: schedule.memberId,
    isTeam: schedule.isTeam,
  }
  modalOpen.value = true
}

function closeModal() {
  modalOpen.value = false
}

const canEditCurrent = computed(() => {
  if (!editingId.value) return true
  const s = schedules.value.find((x) => x.id === editingId.value)
  return s && (s.memberId === authState.member?.id || authState.member?.isAdmin)
})

// Repeat is only offered when creating a new schedule; each occurrence is
// created as its own independent schedule (no shared series/group).
const MAX_OCCURRENCES = 104

function parseDateOnly(str) {
  const [y, m, d] = str.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function addDays(dateStr, days) {
  const d = parseDateOnly(dateStr)
  d.setDate(d.getDate() + days)
  return toDateOnly(d)
}

function addMonths(dateStr, months) {
  const d = parseDateOnly(dateStr)
  const day = d.getDate()
  d.setDate(1) // avoid rolling into the wrong month while setMonth normalizes
  d.setMonth(d.getMonth() + months)
  const lastDayOfTargetMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
  d.setDate(Math.min(day, lastDayOfTargetMonth))
  return toDateOnly(d)
}

function buildOccurrences(startDate, endDate, repeat, repeatUntil) {
  if (repeat === 'none') return [{ startDate, endDate }]
  const spanDays = Math.round((parseDateOnly(endDate) - parseDateOnly(startDate)) / 86400000)
  const occurrences = []
  for (let i = 0; occurrences.length <= MAX_OCCURRENCES; i++) {
    const occStart = repeat === 'weekly' ? addDays(startDate, i * 7) : addMonths(startDate, i)
    if (occStart > repeatUntil) break
    occurrences.push({ startDate: occStart, endDate: addDays(occStart, spanDays) })
  }
  return occurrences
}

async function submitForm() {
  const title = form.value.title.trim()
  if (!title) {
    errorMsg.value = '제목을 입력하세요.'
    return
  }
  if (form.value.endDate < form.value.startDate) {
    errorMsg.value = '종료일이 시작일보다 빠를 수 없습니다.'
    return
  }

  const isRepeating = !editingId.value && form.value.repeat !== 'none'
  if (isRepeating) {
    if (!form.value.repeatUntil) {
      errorMsg.value = '반복 종료일을 선택하세요.'
      return
    }
    if (form.value.repeatUntil < form.value.startDate) {
      errorMsg.value = '반복 종료일이 시작일보다 빠를 수 없습니다.'
      return
    }
  }

  const occurrences = isRepeating
    ? buildOccurrences(form.value.startDate, form.value.endDate, form.value.repeat, form.value.repeatUntil)
    : [{ startDate: form.value.startDate, endDate: form.value.endDate }]

  if (occurrences.length > MAX_OCCURRENCES) {
    errorMsg.value = `반복 일정이 너무 많습니다 (최대 ${MAX_OCCURRENCES}개). 반복 종료일을 앞당겨주세요.`
    return
  }

  const buildPayload = (startDate, endDate) => ({
    title,
    type: form.value.type,
    allDay: form.value.allDay,
    start: form.value.allDay ? startDate : `${startDate}T${form.value.startTime}`,
    end: form.value.allDay ? endDate : `${endDate}T${form.value.endTime}`,
    isTeam: form.value.isTeam,
    memberId: form.value.assignedMemberId,
  })

  try {
    if (editingId.value) {
      await api(`/schedules/${editingId.value}`, {
        method: 'PUT',
        body: JSON.stringify(buildPayload(form.value.startDate, form.value.endDate)),
      })
    } else {
      for (const occ of occurrences) {
        await api('/schedules', { method: 'POST', body: JSON.stringify(buildPayload(occ.startDate, occ.endDate)) })
      }
    }
    closeModal()
    await loadAll()
  } catch (err) {
    errorMsg.value = err.message
  }
}

async function removeCurrent() {
  if (!editingId.value) return
  if (!confirm('이 일정을 삭제할까요?')) return
  try {
    await api(`/schedules/${editingId.value}`, { method: 'DELETE' })
    closeModal()
    await loadAll()
  } catch (err) {
    errorMsg.value = err.message
  }
}

function chipStyle(schedule) {
  const color = schedule.isTeam ? TEAM_COLOR : membersById.value[schedule.memberId]?.color || '#888'
  if (schedule.type === 'fixed') {
    return { backgroundColor: color, color: '#fff', borderColor: color }
  }
  return { backgroundColor: `${color}1A`, color, borderColor: color, borderStyle: 'dashed' }
}

// Team schedules aren't tied to one member, so there's no photo to show for
// them — they keep the text chip. A member without an uploaded photo also
// falls back to text.
function photoFor(schedule) {
  if (schedule.isTeam) return null
  return membersById.value[schedule.memberId]?.photoUrl || null
}
</script>

<template>
  <div class="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
    <div class="mb-6 flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-light tracking-tight text-ink">단원 일정 캘린더</h1>
        <p v-if="authState.member" class="mt-1 text-sm text-muted">
          {{ authState.member.name }}님 환영합니다.
        </p>
      </div>
      <div class="flex items-center gap-3 text-sm">
        <RouterLink v-if="authState.member?.isAdmin" to="/admin/members" class="text-accent hover:underline">
          멤버 관리
        </RouterLink>
        <button type="button" class="text-muted hover:text-ink" @click="logout">로그아웃</button>
      </div>
    </div>

    <p v-if="errorMsg" class="mb-4 text-sm text-rose-600">{{ errorMsg }}</p>

    <div class="mb-4 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <button type="button" class="h-8 w-8 border border-line text-ink hover:bg-accent-soft" @click="prevMonth">‹</button>
        <h2 class="w-36 text-center text-lg text-ink">{{ monthLabel }}</h2>
        <button type="button" class="h-8 w-8 border border-line text-ink hover:bg-accent-soft" @click="nextMonth">›</button>
      </div>
      <button type="button" class="border border-line px-3 py-1.5 text-sm text-ink hover:bg-accent-soft" @click="goToday">오늘</button>
    </div>

    <div v-if="members.length" class="mb-4 flex flex-wrap gap-x-4 gap-y-2 text-xs">
      <span class="inline-flex items-center gap-1.5">
        <span class="h-2.5 w-2.5 rounded-full" :style="{ backgroundColor: TEAM_COLOR }" />
        팀 공식 일정
      </span>
      <span v-for="m in members" :key="m.id" class="inline-flex items-center gap-1.5">
        <span class="h-2.5 w-2.5 rounded-full" :style="{ backgroundColor: m.color }" />
        {{ m.name }}
      </span>
    </div>

    <div v-if="loading" class="py-16 text-center text-muted">불러오는 중...</div>

    <div v-else class="border border-line">
      <div class="grid grid-cols-7 border-b border-line bg-accent-soft text-center text-xs text-muted">
        <div
          v-for="(w, idx) in WEEKDAYS"
          :key="w"
          class="py-2"
          :class="idx === 0 ? 'text-rose-600' : idx === 6 ? 'text-blue-600' : ''"
        >
          {{ w }}
        </div>
      </div>
      <div class="grid grid-cols-7">
        <div
          v-for="d in calendarDays"
          :key="d.toISOString()"
          class="min-h-28 cursor-pointer border-b border-r border-line p-1.5 align-top hover:bg-accent-soft/50"
          :class="!isCurrentMonth(d) ? 'bg-base/50 text-muted/60' : ''"
          @click="openCreate(d)"
        >
          <div
            class="mb-1 text-xs"
            :class="isToday(d) ? 'font-semibold text-accent' : (isCurrentMonth(d) ? weekdayTextClass(d) : '')"
          >
            {{ d.getDate() }}
          </div>
          <div class="space-y-1">
            <button
              v-for="s in schedulesOn(d)"
              :key="s.id"
              type="button"
              class="flex w-full items-center rounded border"
              :class="photoFor(s) ? 'justify-center p-0.5' : 'truncate px-1.5 py-0.5 text-left text-[11px]'"
              :style="chipStyle(s)"
              :title="`${s.isTeam ? '팀 공식 일정' : membersById[s.memberId]?.name || ''} · ${s.title}`"
              @click.stop="openEdit(s)"
            >
              <img
                v-if="photoFor(s)"
                :src="photoFor(s)"
                class="h-5 w-5 rounded-sm object-cover"
                :alt="`${membersById[s.memberId]?.name || ''} 프로필 사진`"
              />
              <template v-else>
                <span v-if="s.isTeam" class="mr-1 font-semibold">[공식]</span>{{ s.title }}
              </template>
            </button>
          </div>
        </div>
      </div>
    </div>

    <p class="mt-4 text-xs text-muted">
      실선 배경은 <strong>변경 불가</strong> 일정, 점선 테두리는 <strong>변경 가능</strong> 일정입니다.
    </p>

    <!-- Create / edit modal -->
    <div v-if="modalOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" @click.self="closeModal">
      <div class="w-full max-w-md bg-base p-6 shadow-lg">
        <h3 class="mb-4 text-lg text-ink">{{ editingId ? '일정 수정' : '새 일정' }}</h3>
        <div v-if="!canEditCurrent" class="mb-4 text-sm text-muted">
          다른 멤버의 일정입니다. 본인 또는 관리자만 수정/삭제할 수 있습니다.
        </div>
        <form class="space-y-4" @submit.prevent="submitForm">
          <div>
            <label class="mb-1 block text-xs text-muted">제목</label>
            <input
              v-model="form.title"
              type="text"
              required
              :disabled="!canEditCurrent"
              class="w-full border border-line px-3 py-2 text-sm outline-none focus:border-accent disabled:bg-accent-soft"
            />
          </div>

          <div v-if="authState.member?.isAdmin">
            <label class="inline-flex items-center gap-1.5 text-sm">
              <input v-model="form.isTeam" type="checkbox" :disabled="!canEditCurrent" />
              팀 공식 일정으로 등록
            </label>
          </div>

          <div v-if="authState.member?.isAdmin && !form.isTeam">
            <label class="mb-1 block text-xs text-muted">담당 멤버</label>
            <select
              v-model="form.assignedMemberId"
              :disabled="!canEditCurrent"
              class="w-full border border-line px-2 py-1.5 text-sm disabled:bg-accent-soft"
            >
              <option v-for="m in assignableMembers" :key="m.id" :value="m.id">
                {{ m.name }}{{ !m.isActive ? ' (비활성)' : '' }}
              </option>
            </select>
          </div>

          <div>
            <label class="mb-1 block text-xs text-muted">일정 유형</label>
            <div class="flex gap-4 text-sm">
              <label class="inline-flex items-center gap-1.5">
                <input v-model="form.type" type="radio" value="flexible" :disabled="!canEditCurrent" />
                변경 가능
              </label>
              <label class="inline-flex items-center gap-1.5">
                <input v-model="form.type" type="radio" value="fixed" :disabled="!canEditCurrent" />
                변경 불가
              </label>
            </div>
          </div>

          <label class="inline-flex items-center gap-1.5 text-sm">
            <input v-model="form.allDay" type="checkbox" :disabled="!canEditCurrent" />
            종일
          </label>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="mb-1 block text-xs text-muted">시작일</label>
              <input v-model="form.startDate" type="date" required :disabled="!canEditCurrent" class="w-full border border-line px-2 py-1.5 text-sm" />
            </div>
            <div>
              <label class="mb-1 block text-xs text-muted">종료일</label>
              <input v-model="form.endDate" type="date" required :disabled="!canEditCurrent" class="w-full border border-line px-2 py-1.5 text-sm" />
            </div>
          </div>

          <div v-if="!form.allDay" class="grid grid-cols-2 gap-3">
            <div>
              <label class="mb-1 block text-xs text-muted">시작 시간</label>
              <input v-model="form.startTime" type="time" :disabled="!canEditCurrent" class="w-full border border-line px-2 py-1.5 text-sm" />
            </div>
            <div>
              <label class="mb-1 block text-xs text-muted">종료 시간</label>
              <input v-model="form.endTime" type="time" :disabled="!canEditCurrent" class="w-full border border-line px-2 py-1.5 text-sm" />
            </div>
          </div>

          <div v-if="!editingId">
            <label class="mb-1 block text-xs text-muted">반복</label>
            <div class="flex items-center gap-2">
              <select
                v-model="form.repeat"
                :disabled="!canEditCurrent"
                class="border border-line px-2 py-1.5 text-sm"
              >
                <option value="none">반복 안 함</option>
                <option value="weekly">매주</option>
                <option value="monthly">매월</option>
              </select>
              <template v-if="form.repeat !== 'none'">
                <span class="text-xs text-muted">~까지</span>
                <input
                  v-model="form.repeatUntil"
                  type="date"
                  :min="form.startDate"
                  :disabled="!canEditCurrent"
                  class="flex-1 border border-line px-2 py-1.5 text-sm"
                />
              </template>
            </div>
          </div>

          <div class="flex items-center justify-between pt-2">
            <button
              v-if="editingId && canEditCurrent"
              type="button"
              class="text-sm text-rose-600 hover:underline"
              @click="removeCurrent"
            >
              삭제
            </button>
            <div class="ml-auto flex gap-2">
              <button type="button" class="border border-line px-4 py-2 text-sm hover:bg-accent-soft" @click="closeModal">
                닫기
              </button>
              <button
                v-if="canEditCurrent"
                type="submit"
                class="bg-ink px-4 py-2 text-sm text-base hover:bg-accent"
              >
                저장
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
