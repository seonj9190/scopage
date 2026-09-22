const express = require('express')
const db = require('./db')
const {
  hashPassword,
  verifyPassword,
  issueToken,
  setAuthCookie,
  clearAuthCookie,
  requireAuth,
  requireAdmin,
} = require('./auth')

const router = express.Router()

// Wrap async handlers so rejected promises reach Express's error handler
// instead of crashing the request unhandled.
const h = (fn) => (req, res, next) => fn(req, res, next).catch(next)

// ---- Auth ----

router.post(
  '/auth/login',
  h(async (req, res) => {
    const { username, password } = req.body || {}
    if (!username || !password) {
      return res.status(400).json({ error: '아이디와 비밀번호를 입력하세요.' })
    }
    const member = await db.getMemberByUsername(username)
    if (!member || !verifyPassword(password, member.passwordHash)) {
      return res.status(401).json({ error: '아이디 또는 비밀번호가 올바르지 않습니다.' })
    }
    const token = issueToken(member)
    setAuthCookie(req, res, token)
    res.json({ member: db.publicMember(member) })
  })
)

router.post('/auth/logout', (_req, res) => {
  clearAuthCookie(res)
  res.json({ ok: true })
})

router.get('/auth/me', requireAuth, (req, res) => {
  res.json({ member: db.publicMember(req.member) })
})

// ---- Members (for calendar legend / colors) ----

router.get(
  '/members',
  requireAuth,
  h(async (_req, res) => {
    res.json({ members: (await db.getMembers()).map(db.publicMember) })
  })
)

// ---- Schedules ----

router.get(
  '/schedules',
  requireAuth,
  h(async (_req, res) => {
    res.json({ schedules: await db.getSchedules() })
  })
)

router.post(
  '/schedules',
  requireAuth,
  h(async (req, res) => {
    const { title, start, end, allDay, type } = req.body || {}
    if (!title || !start || !end) {
      return res.status(400).json({ error: '제목과 일정 기간을 입력하세요.' })
    }
    if (type !== 'fixed' && type !== 'flexible') {
      return res.status(400).json({ error: '일정 유형이 올바르지 않습니다.' })
    }
    const schedule = await db.createSchedule({
      memberId: req.member.id,
      title,
      start,
      end,
      allDay,
      type,
    })
    res.status(201).json({ schedule })
  })
)

function canModify(req, schedule) {
  return schedule && (schedule.memberId === req.member.id || req.member.isAdmin)
}

router.put(
  '/schedules/:id',
  requireAuth,
  h(async (req, res) => {
    const existing = await db.getScheduleById(req.params.id)
    if (!existing) return res.status(404).json({ error: '일정을 찾을 수 없습니다.' })
    if (!canModify(req, existing)) return res.status(403).json({ error: '수정 권한이 없습니다.' })

    const { title, start, end, allDay, type } = req.body || {}
    if (type && type !== 'fixed' && type !== 'flexible') {
      return res.status(400).json({ error: '일정 유형이 올바르지 않습니다.' })
    }
    const schedule = await db.updateSchedule(req.params.id, { title, start, end, allDay, type })
    res.json({ schedule })
  })
)

router.delete(
  '/schedules/:id',
  requireAuth,
  h(async (req, res) => {
    const existing = await db.getScheduleById(req.params.id)
    if (!existing) return res.status(404).json({ error: '일정을 찾을 수 없습니다.' })
    if (!canModify(req, existing)) return res.status(403).json({ error: '삭제 권한이 없습니다.' })

    await db.deleteSchedule(req.params.id)
    res.json({ ok: true })
  })
)

// ---- Admin: member management ----

router.get(
  '/admin/members',
  requireAuth,
  requireAdmin,
  h(async (_req, res) => {
    res.json({ members: (await db.getMembers()).map(db.publicMember) })
  })
)

router.post(
  '/admin/members',
  requireAuth,
  requireAdmin,
  h(async (req, res) => {
    const { username, password, name, isAdmin } = req.body || {}
    if (!username || !password || !name) {
      return res.status(400).json({ error: '아이디, 비밀번호, 이름을 입력하세요.' })
    }
    try {
      const member = await db.createMember({
        username,
        passwordHash: hashPassword(password),
        name,
        isAdmin: !!isAdmin,
      })
      res.status(201).json({ member: db.publicMember(member) })
    } catch (err) {
      res.status(409).json({ error: err.message })
    }
  })
)

router.put(
  '/admin/members/:id',
  requireAuth,
  requireAdmin,
  h(async (req, res) => {
    const { name, password, isAdmin } = req.body || {}
    const patch = {}
    if (name) patch.name = name
    if (password) patch.passwordHash = hashPassword(password)
    if (typeof isAdmin === 'boolean') patch.isAdmin = isAdmin
    const member = await db.updateMember(req.params.id, patch)
    if (!member) return res.status(404).json({ error: '멤버를 찾을 수 없습니다.' })
    res.json({ member: db.publicMember(member) })
  })
)

module.exports = router
