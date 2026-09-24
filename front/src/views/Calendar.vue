<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { RouterLink } from 'vue-router'
import { useAuth } from '@/auth'

const { state: authState, api, logout } = useAuth()

const members = ref([])
const schedules = ref([])
const loading = ref(true)
const errorMsg = ref('')

// ---- Live updates: poll so other members' changes show up without a
// manual refresh, and track what's new since this member last looked. ----
const POLL_INTERVAL_MS = 30000
const LAST_SEEN_KEY_PREFIX = 'scopage_calendar_last_seen_'
let pollTimer = null
const lastSeenAt = ref(0)

function lastSeenKey() {
  return authState.member?.id ? `${LAST_SEEN_KEY_PREFIX}${authState.member.id}` : null
}

function loadLastSeen() {
  const key = lastSeenKey()
  if (!key) return
  try {
    lastSeenAt.value = Number(localStorage.getItem(key)) || 0
  } catch {
    lastSeenAt.value = 0
  }
}

// Schedules someone else created or edited since this member's last visit —
// excludes the member's own changes, since those don't need announcing.
const newChanges = computed(() =>
  schedules.value.filter((s) => {
    if (s.memberId === authState.member?.id) return false
    const changedAt = new Date(s.updatedAt || s.createdAt).getTime()
    return changedAt > lastSeenAt.value
  })
)

function dismissNewChanges() {
  const key = lastSeenKey()
  if (!key) return
  const now = Date.now()
  lastSeenAt.value = now
  try {
    localStorage.setItem(key, String(now))
  } catch {
    // per-viewer convenience only — fine if it can't persist
  }
}

const today = new Date()
const viewYear = ref(today.getFullYear())
const viewMonth = ref(today.getMonth()) // 0-based

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']
// Official team schedules aren't tied to one member's color.
const TEAM_COLOR = '#7a6a4f'
// A darker, higher-contrast shade for the plain "공식" text label in day
// cells — TEAM_COLOR itself reads too faint at small sizes on a white cell.
const TEAM_TEXT_COLOR = '#5c4423'
// Vivid gold for the mobile star icon marking official schedules — deliberately
// distinct from TEAM_COLOR so it stays eye-catching at small sizes.
const STAR_COLOR = '#f59e0b'
// Cell background for a day with an official schedule (mobile only) — kept
// a different hue from STAR_COLOR so the gold star doesn't wash out against it.
const TEAM_CELL_BG_CLASS = 'bg-slate-800/15'

const monthLabel = computed(() => `${viewYear.value}년 ${viewMonth.value + 1}월`)

const membersById = computed(() => Object.fromEntries(members.value.map((m) => [m.id, m])))

// ---- Member contacts ----
// Each member's login ID is their phone number; format it for display and
// keep the bare digits for the tel: link. Returns null for IDs that aren't
// phone numbers (e.g. migrated "legacy-…" accounts) so they're left out.
function formatPhone(raw) {
  const digits = String(raw || '').replace(/\D/g, '')
  if (digits.length === 11) return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`
  if (digits.length === 10 && digits.startsWith('02')) return `${digits.slice(0, 2)}-${digits.slice(2, 6)}-${digits.slice(6)}`
  if (digits.length === 10) return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`
  if (digits.length === 9 && digits.startsWith('02')) return `${digits.slice(0, 2)}-${digits.slice(2, 5)}-${digits.slice(5)}`
  return null
}

const memberContacts = computed(() =>
  members.value
    .filter((m) => m.isActive)
    .map((m) => ({ ...m, phone: formatPhone(m.username), telDigits: String(m.username).replace(/\D/g, '') }))
    .filter((m) => m.phone)
)

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

function hasTeamSchedule(dateObj) {
  return schedulesOn(dateObj).some((s) => s.isTeam)
}

function isCurrentMonth(d) {
  return d.getMonth() === viewMonth.value
}

// A day can be both "outside this month" and "has an official schedule" —
// only one background utility should ever land on the cell, or Tailwind's
// generated CSS order (not the order written here) silently decides which
// one wins, regardless of which condition actually matters more. The team
// tint takes precedence so official schedules stay visible on preview rows.
function dayCellBgClass(d) {
  if (hasTeamSchedule(d)) return `${TEAM_CELL_BG_CLASS} sm:bg-transparent`
  return !isCurrentMonth(d) ? 'bg-base/50' : ''
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

// `silent` skips the loading spinner and error banner — used for the
// background poll so it doesn't flicker the page every 30s.
async function loadAll({ silent = false } = {}) {
  if (!silent) loading.value = true
  if (!silent) errorMsg.value = ''
  try {
    const [membersRes, schedulesRes] = await Promise.all([api('/members'), api('/schedules')])
    members.value = membersRes.members
    schedules.value = schedulesRes.schedules
  } catch (err) {
    if (!silent) errorMsg.value = err.message
  } finally {
    if (!silent) loading.value = false
  }
}

onMounted(() => {
  loadLastSeen()
  loadAll()
  pollTimer = setInterval(() => loadAll({ silent: true }), POLL_INTERVAL_MS)
})

onUnmounted(() => {
  if (pollTimer) clearInterval(pollTimer)
})

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
  groupScopeFor.value = null
}

const canEditCurrent = computed(() => {
  if (!editingId.value) return true
  const s = schedules.value.find((x) => x.id === editingId.value)
  return s && (s.memberId === authState.member?.id || authState.member?.isAdmin)
})

// Repeat is only offered when creating a new schedule. Occurrences created
// together share a repeatGroupId so they can later be bulk-edited/deleted.
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

  const buildPayload = (startDate, endDate, repeatGroupId) => ({
    title,
    type: form.value.type,
    allDay: form.value.allDay,
    start: form.value.allDay ? startDate : `${startDate}T${form.value.startTime}`,
    end: form.value.allDay ? endDate : `${endDate}T${form.value.endTime}`,
    isTeam: form.value.isTeam,
    memberId: form.value.assignedMemberId,
    ...(repeatGroupId ? { repeatGroupId } : {}),
  })

  try {
    if (editingId.value) {
      await api(`/schedules/${editingId.value}`, {
        method: 'PUT',
        body: JSON.stringify(buildPayload(form.value.startDate, form.value.endDate)),
      })
    } else {
      const repeatGroupId = occurrences.length > 1 ? crypto.randomUUID() : null
      for (const occ of occurrences) {
        await api('/schedules', {
          method: 'POST',
          body: JSON.stringify(buildPayload(occ.startDate, occ.endDate, repeatGroupId)),
        })
      }
    }
    closeModal()
    await loadAll()
  } catch (err) {
    errorMsg.value = err.message
  }
}

// A repeating schedule prompts for scope ("this one" vs "the whole series")
// before actually saving/deleting; these two hold the pending action while
// that choice is shown.
const groupScopeFor = ref(null) // 'save' | 'delete' | null
const currentSchedule = computed(() => schedules.value.find((s) => s.id === editingId.value))

function requestSave() {
  if (editingId.value && currentSchedule.value?.repeatGroupId) {
    groupScopeFor.value = 'save'
    return
  }
  submitForm()
}

function requestDelete() {
  if (currentSchedule.value?.repeatGroupId) {
    groupScopeFor.value = 'delete'
    return
  }
  removeCurrent()
}

async function confirmScope(scope) {
  const action = groupScopeFor.value
  groupScopeFor.value = null
  if (action === 'save') {
    await (scope === 'all' ? submitFormToGroup() : submitForm())
  } else if (action === 'delete') {
    await (scope === 'all' ? removeGroup() : removeCurrent())
  }
}

async function submitFormToGroup() {
  const title = form.value.title.trim()
  if (!title) {
    errorMsg.value = '제목을 입력하세요.'
    return
  }
  const groupId = currentSchedule.value?.repeatGroupId
  if (!groupId) return
  try {
    await api(`/schedules/group/${groupId}`, {
      method: 'PUT',
      body: JSON.stringify({
        title,
        type: form.value.type,
        isTeam: form.value.isTeam,
        memberId: form.value.assignedMemberId,
        allDay: form.value.allDay,
        startTime: form.value.startTime,
        endTime: form.value.endTime,
      }),
    })
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

async function removeGroup() {
  const groupId = currentSchedule.value?.repeatGroupId
  if (!groupId) return
  if (!confirm('반복되는 모든 일정을 삭제할까요? 되돌릴 수 없습니다.')) return
  try {
    await api(`/schedules/group/${groupId}`, { method: 'DELETE' })
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

// ---- Day list modal ----
// Clicking a day cell opens this (instead of jumping straight into the
// create form) so a busy, narrow cell doesn't need to show full chips —
// it only needs enough to glance at, and the list has room to be readable.

const dayListOpen = ref(false)
const dayListDate = ref(null)

const dayListDateLabel = computed(() => {
  if (!dayListDate.value) return ''
  const d = dayListDate.value
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 (${WEEKDAYS[d.getDay()]})`
})

const dayListSchedules = computed(() => (dayListDate.value ? schedulesOn(dayListDate.value) : []))

function openDayList(d) {
  dayListDate.value = d
  dayListOpen.value = true
}

function closeDayList() {
  dayListOpen.value = false
  dayListDate.value = null
}

function addFromDayList() {
  const d = dayListDate.value
  closeDayList()
  openCreate(d)
}

function editFromDayList(schedule) {
  closeDayList()
  openEdit(schedule)
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
        <RouterLink v-if="authState.member?.isAdmin" to="/admin/gallery" class="text-accent hover:underline">
          갤러리 관리
        </RouterLink>
        <RouterLink v-if="authState.member?.isAdmin" to="/admin/performances" class="text-accent hover:underline">
          공연 관리
        </RouterLink>
        <button type="button" class="text-muted hover:text-ink" @click="logout">로그아웃</button>
      </div>
    </div>

    <div
      v-if="newChanges.length"
      class="mb-4 flex items-center justify-between gap-3 border border-accent/40 bg-accent-soft px-4 py-2 text-sm text-ink"
    >
      <span>다른 멤버가 등록하거나 수정한 일정이 {{ newChanges.length }}건 있습니다.</span>
      <button type="button" class="shrink-0 text-accent hover:underline" @click="dismissNewChanges">확인</button>
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
          :class="[dayCellBgClass(d), !isCurrentMonth(d) ? 'text-muted/60' : '']"
          @click="openDayList(d)"
        >
          <div
            class="mb-1 text-xs"
            :class="isToday(d) ? 'font-semibold text-accent' : (isCurrentMonth(d) ? weekdayTextClass(d) : '')"
          >
            {{ d.getDate() }}
          </div>
          <div class="space-y-1">
            <div v-for="s in schedulesOn(d)" :key="s.id">
              <div v-if="s.isTeam" class="flex justify-center sm:block">
                <svg viewBox="0 0 20 20" class="h-6 w-6 sm:hidden" :fill="STAR_COLOR" aria-label="공식 일정">
                  <path
                    d="M10 1.6l2.47 5.32 5.86.58-4.4 3.93 1.26 5.77L10 14.3l-5.19 2.9 1.26-5.77-4.4-3.93 5.86-.58L10 1.6z"
                  />
                </svg>
                <p
                  class="hidden truncate rounded px-1 text-center text-sm font-bold tracking-tight sm:block"
                  :style="{ backgroundColor: `${TEAM_COLOR}26`, color: TEAM_TEXT_COLOR }"
                >
                  [ 공식일정 ]
                </p>
              </div>
              <p
                v-else
                class="flex items-center justify-center truncate rounded border px-1 py-0.5 text-left text-[11px]"
                :style="chipStyle(s)"
              >
                <img
                  v-if="membersById[s.memberId]?.thumbnailUrl"
                  :src="membersById[s.memberId].thumbnailUrl"
                  class="h-7 w-7 rounded-full object-cover"
                  :alt="membersById[s.memberId]?.name || ''"
                />
                <template v-else>
                  <span class="sm:hidden">{{ (membersById[s.memberId]?.name || '').slice(0, 1) }}</span>
                  <span class="hidden sm:inline">{{ membersById[s.memberId]?.name || '' }}</span>
                </template>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <p class="mt-4 text-xs text-muted">
      실선 배경은 <strong>변경 불가</strong> 일정, 점선 테두리는 <strong>변경 가능</strong> 일정입니다.
    </p>

    <!-- Member contacts -->
    <section v-if="!loading && memberContacts.length" class="mt-10">
      <h2 class="mb-3 text-xl text-ink">단원 연락처</h2>
      <table class="w-full border border-line text-lg text-ink">
        <thead class="bg-accent-soft text-[16px] text-muted">
          <tr>
            <th class="border-b border-line px-4 py-3 text-left font-normal">이름</th>
            <th class="border-b border-line px-4 py-3 text-left font-normal">연락처</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-line">
          <tr v-for="m in memberContacts" :key="m.id">
            <td class="px-4 py-3">
              <span class="inline-flex items-center gap-2 font-medium">
                <span class="h-3 w-3 shrink-0 rounded-full" :style="{ backgroundColor: m.color || '#888' }" />
                {{ m.name }}
              </span>
            </td>
            <td class="px-4 py-3">
              <div class="flex flex-wrap items-center gap-3">
                <span class="font-medium tabular-nums tracking-wide">{{ m.phone }}</span>
                <a
                  :href="`tel:${m.telDigits}`"
                  class="inline-flex items-center gap-1.5 bg-ink px-4 py-2 text-[16px] text-white hover:bg-accent"
                  :aria-label="`${m.name}에게 전화 걸기`"
                >
                  <svg viewBox="0 0 20 20" fill="currentColor" class="h-4 w-4" aria-hidden="true">
                    <path d="M2 3.5A1.5 1.5 0 013.5 2h2.1a1.5 1.5 0 011.46 1.15l.6 2.5a1.5 1.5 0 01-.43 1.44l-1.2 1.13a11 11 0 005.75 5.75l1.13-1.2a1.5 1.5 0 011.44-.43l2.5.6A1.5 1.5 0 0118 14.4v2.1a1.5 1.5 0 01-1.5 1.5h-1C8.04 18 2 11.96 2 4.5v-1z" />
                  </svg>
                  전화
                </a>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </section>

    <!-- Day list modal -->
    <div v-if="dayListOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" @click.self="closeDayList">
      <div class="w-full max-w-lg bg-base p-6 shadow-lg">
        <div class="mb-4 flex items-center justify-between">
          <h3 class="text-xl text-ink">{{ dayListDateLabel }}</h3>
          <button type="button" class="text-muted hover:text-ink" @click="closeDayList">닫기</button>
        </div>

        <ul v-if="dayListSchedules.length" class="mb-4 divide-y divide-line border border-line">
          <li v-for="s in dayListSchedules" :key="s.id">
            <button
              type="button"
              class="flex w-full items-center gap-3 px-4 py-3 text-left text-base text-ink"
              @click="editFromDayList(s)"
            >
              <img
                v-if="!s.isTeam && membersById[s.memberId]?.photoUrl"
                :src="membersById[s.memberId].photoUrl"
                class="h-11 w-11 shrink-0 rounded-full object-cover"
                :alt="`${membersById[s.memberId]?.name || ''} 프로필 사진`"
              />
              <span
                v-else
                class="h-11 w-11 shrink-0 rounded-full"
                :style="{ backgroundColor: s.isTeam ? TEAM_COLOR : membersById[s.memberId]?.color || '#888' }"
              />
              <span class="min-w-0 flex-1 truncate font-medium">
                <span v-if="s.isTeam" class="mr-1 font-semibold" :style="{ color: TEAM_COLOR }">공식</span>
                <span v-else class="mr-1 font-semibold text-ink">{{ membersById[s.memberId]?.name || '' }}</span>
                {{ s.title }}
              </span>
              <span class="shrink-0 text-sm font-medium text-ink">{{ s.type === 'fixed' ? '변경불가' : '변경가능' }}</span>
            </button>
          </li>
        </ul>
        <p v-else class="mb-4 text-sm text-muted">등록된 일정이 없습니다.</p>

        <button type="button" class="w-full bg-ink px-4 py-2 text-sm text-base hover:bg-accent" @click="addFromDayList">
          일정 추가
        </button>
      </div>
    </div>

    <!-- Create / edit modal -->
    <div v-if="modalOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" @click.self="closeModal">
      <div class="w-full max-w-md bg-base p-6 shadow-lg">
        <h3 class="mb-4 text-lg text-ink">{{ editingId ? '일정 수정' : '새 일정' }}</h3>
        <div v-if="!canEditCurrent" class="mb-4 text-sm text-muted">
          다른 멤버의 일정입니다. 본인 또는 관리자만 수정/삭제할 수 있습니다.
        </div>
        <p v-if="currentSchedule?.repeatGroupId" class="mb-4 text-xs text-muted">
          반복 등록된 일정입니다. 저장/삭제 시 이 일정만 바꿀지, 반복되는 모든 일정에 적용할지 선택하게 됩니다.
        </p>
        <form class="space-y-4" @submit.prevent="requestSave">
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

          <div v-if="groupScopeFor" class="border-t border-line pt-3">
            <p class="mb-2 text-sm text-ink">
              {{ groupScopeFor === 'save' ? '변경 사항을' : '삭제를' }} 어디까지 적용할까요?
            </p>
            <div class="flex flex-wrap items-center gap-2">
              <button
                type="button"
                class="border border-line px-3 py-1.5 text-sm hover:bg-accent-soft"
                @click="confirmScope('this')"
              >
                이 일정만
              </button>
              <button
                type="button"
                class="border border-line px-3 py-1.5 text-sm hover:bg-accent-soft"
                @click="confirmScope('all')"
              >
                반복되는 모든 일정
              </button>
              <button type="button" class="ml-auto text-sm text-muted hover:underline" @click="groupScopeFor = null">
                취소
              </button>
            </div>
          </div>
          <div v-else class="flex items-center justify-between pt-2">
            <button
              v-if="editingId && canEditCurrent"
              type="button"
              class="text-sm text-rose-600 hover:underline"
              @click="requestDelete"
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
