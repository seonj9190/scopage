import { reactive } from 'vue'

const state = reactive({
  member: null,
  ready: false,
})

async function api(path, options = {}) {
  const res = await fetch(`/api${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data.error || '요청 처리 중 오류가 발생했습니다.')
  }
  return data
}

async function fetchMe() {
  try {
    const { member } = await api('/auth/me')
    state.member = member
  } catch {
    state.member = null
  } finally {
    state.ready = true
  }
}

async function login(username, password) {
  const { member } = await api('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  })
  state.member = member
  return member
}

async function logout() {
  await api('/auth/logout', { method: 'POST' })
  state.member = null
}

export function useAuth() {
  return { state, fetchMe, login, logout, api }
}
