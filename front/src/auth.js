import { reactive } from 'vue'

const state = reactive({
  member: null,
  ready: false,
})

async function api(path, options = {}) {
  // FormData (file uploads) must NOT get a manual Content-Type — the browser
  // needs to set its own multipart boundary.
  const isFormData = options.body instanceof FormData
  const res = await fetch(`/api${path}`, {
    credentials: 'include',
    ...options,
    headers: isFormData ? options.headers : { 'Content-Type': 'application/json', ...options.headers },
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
