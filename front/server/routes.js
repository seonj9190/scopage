const fs = require('node:fs')
const path = require('node:path')
const express = require('express')
const db = require('./db')
const { UPLOAD_DIR, uploadSingle, PROFILE_UPLOAD_DIR, THUMBNAIL_UPLOAD_DIR, uploadMemberPhotos } = require('./upload')
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
    if (!member.isActive) {
      return res.status(403).json({ error: '비활성화된 계정입니다. 관리자에게 문의하세요.' })
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

// ---- Public member roster (단원소개 page — no login required) ----

router.get(
  '/public/members',
  h(async (_req, res) => {
    res.json({ members: (await db.getPublicMembers()).map(db.publicProfile) })
  })
)

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
    const { title, start, end, allDay, type, isTeam, memberId, repeatGroupId } = req.body || {}
    if (!title || !start || !end) {
      return res.status(400).json({ error: '제목과 일정 기간을 입력하세요.' })
    }
    if (type !== 'fixed' && type !== 'flexible') {
      return res.status(400).json({ error: '일정 유형이 올바르지 않습니다.' })
    }
    if (isTeam && !req.member.isAdmin) {
      return res.status(403).json({ error: '팀 공식 일정은 관리자만 등록할 수 있습니다.' })
    }

    // Admins may create a schedule on behalf of another member; everyone
    // else can only create their own.
    let ownerId = req.member.id
    if (req.member.isAdmin && memberId && !isTeam) {
      const target = await db.getMemberById(memberId)
      if (!target) return res.status(400).json({ error: '멤버를 찾을 수 없습니다.' })
      ownerId = target.id
    }

    const schedule = await db.createSchedule({
      memberId: ownerId,
      title,
      start,
      end,
      allDay,
      type,
      isTeam: req.member.isAdmin ? !!isTeam : false,
      repeatGroupId: repeatGroupId || null,
    })
    res.status(201).json({ schedule })
  })
)

function canModify(req, schedule) {
  return schedule && (schedule.memberId === req.member.id || req.member.isAdmin)
}

// Registered before /schedules/:id so "group" isn't swallowed as an id.
router.put(
  '/schedules/group/:groupId',
  requireAuth,
  h(async (req, res) => {
    const groupSchedules = await db.getSchedulesByGroup(req.params.groupId)
    if (!groupSchedules.length) return res.status(404).json({ error: '반복 일정을 찾을 수 없습니다.' })
    if (!groupSchedules.every((s) => canModify(req, s))) {
      return res.status(403).json({ error: '수정 권한이 없습니다.' })
    }

    const { title, type, isTeam, memberId, allDay, startTime, endTime } = req.body || {}
    if (type && type !== 'fixed' && type !== 'flexible') {
      return res.status(400).json({ error: '일정 유형이 올바르지 않습니다.' })
    }

    // Date/time-of-day is per-occurrence, so only fields shared across the
    // whole series are bulk-editable here.
    const patch = { title, type, allDay, startTime, endTime }
    if (req.member.isAdmin) {
      if (typeof isTeam === 'boolean') patch.isTeam = isTeam
      if (memberId) {
        const target = await db.getMemberById(memberId)
        if (!target) return res.status(400).json({ error: '멤버를 찾을 수 없습니다.' })
        patch.memberId = target.id
      }
    }

    await db.reassignGroupFields(req.params.groupId, patch)
    res.json({ schedules: await db.getSchedulesByGroup(req.params.groupId) })
  })
)

router.delete(
  '/schedules/group/:groupId',
  requireAuth,
  h(async (req, res) => {
    const groupSchedules = await db.getSchedulesByGroup(req.params.groupId)
    if (!groupSchedules.length) return res.status(404).json({ error: '반복 일정을 찾을 수 없습니다.' })
    if (!groupSchedules.every((s) => canModify(req, s))) {
      return res.status(403).json({ error: '삭제 권한이 없습니다.' })
    }

    const count = await db.deleteScheduleGroup(req.params.groupId)
    res.json({ ok: true, count })
  })
)

router.put(
  '/schedules/:id',
  requireAuth,
  h(async (req, res) => {
    const existing = await db.getScheduleById(req.params.id)
    if (!existing) return res.status(404).json({ error: '일정을 찾을 수 없습니다.' })
    if (!canModify(req, existing)) return res.status(403).json({ error: '수정 권한이 없습니다.' })

    const { title, start, end, allDay, type, isTeam, memberId } = req.body || {}
    if (type && type !== 'fixed' && type !== 'flexible') {
      return res.status(400).json({ error: '일정 유형이 올바르지 않습니다.' })
    }

    const patch = { title, start, end, allDay, type }

    // Only admins may reassign ownership or flip the team-schedule flag.
    if (req.member.isAdmin) {
      if (typeof isTeam === 'boolean') patch.isTeam = isTeam
      if (memberId) {
        const target = await db.getMemberById(memberId)
        if (!target) return res.status(400).json({ error: '멤버를 찾을 수 없습니다.' })
        patch.memberId = target.id
      }
    }

    const schedule = await db.updateSchedule(req.params.id, patch)
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

// multer .fields() keys uploads by fieldname; pull the single file out of each.
function uploadedFile(req, field) {
  return req.files?.[field]?.[0] || null
}

async function unlinkUploaded(req) {
  const files = [uploadedFile(req, 'photo'), uploadedFile(req, 'thumbnail')].filter(Boolean)
  await Promise.all(files.map((f) => fs.promises.unlink(f.path).catch(() => {})))
}

router.post(
  '/admin/members',
  requireAuth,
  requireAdmin,
  uploadMemberPhotos,
  h(async (req, res) => {
    const { username, password, name, isAdmin, part, bio1, bio2, isPublic, isConductor } = req.body || {}
    const photoFile = uploadedFile(req, 'photo')
    const thumbnailFile = uploadedFile(req, 'thumbnail')
    if (!username || !password || !name) {
      await unlinkUploaded(req)
      return res.status(400).json({ error: '아이디, 비밀번호, 이름을 입력하세요.' })
    }
    try {
      const member = await db.createMember({
        username,
        passwordHash: hashPassword(password),
        name,
        isAdmin: isAdmin === 'true' || isAdmin === true,
        part: part || null,
        bio1: bio1 || null,
        bio2: bio2 || null,
        photoUrl: photoFile ? `/profile-photos/${photoFile.filename}` : null,
        thumbnailUrl: thumbnailFile ? `/thumbnails/${thumbnailFile.filename}` : null,
        isPublic: isPublic === 'true' || isPublic === true,
        isConductor: isConductor === 'true' || isConductor === true,
      })
      if (member.isConductor) await db.clearConductorExcept(member.id)
      res.status(201).json({ member: db.publicMember(member) })
    } catch (err) {
      await unlinkUploaded(req)
      res.status(409).json({ error: err.message })
    }
  })
)

// Registered before /admin/members/:id so "order" isn't swallowed as an id.
router.put(
  '/admin/members/order',
  requireAuth,
  requireAdmin,
  h(async (req, res) => {
    const { orderedIds } = req.body || {}
    if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
      return res.status(400).json({ error: '정렬할 멤버 목록이 필요합니다.' })
    }
    await db.reorderMembers(orderedIds)
    res.json({ members: (await db.getMembers()).map(db.publicMember) })
  })
)

router.put(
  '/admin/members/:id',
  requireAuth,
  requireAdmin,
  uploadMemberPhotos,
  h(async (req, res) => {
    const body = req.body || {}
    const toBool = (v) => v === 'true' || v === true
    const photoFile = uploadedFile(req, 'photo')
    const thumbnailFile = uploadedFile(req, 'thumbnail')

    if ('isActive' in body && !toBool(body.isActive) && req.params.id === req.member.id) {
      await unlinkUploaded(req)
      return res.status(400).json({ error: '본인 계정은 비활성화할 수 없습니다.' })
    }

    const existing = await db.getMemberById(req.params.id)
    if (!existing) {
      await unlinkUploaded(req)
      return res.status(404).json({ error: '멤버를 찾을 수 없습니다.' })
    }

    const patch = {}
    if (body.username) patch.username = body.username
    if (body.name) patch.name = body.name
    if (body.password) patch.passwordHash = hashPassword(body.password)
    if ('isAdmin' in body) patch.isAdmin = toBool(body.isAdmin)
    if ('isActive' in body) patch.isActive = toBool(body.isActive)
    if ('part' in body) patch.part = body.part || null
    if ('bio1' in body) patch.bio1 = body.bio1 || null
    if ('bio2' in body) patch.bio2 = body.bio2 || null
    if ('isPublic' in body) patch.isPublic = toBool(body.isPublic)
    if ('isConductor' in body) patch.isConductor = toBool(body.isConductor)
    if (photoFile) patch.photoUrl = `/profile-photos/${photoFile.filename}`
    if (thumbnailFile) patch.thumbnailUrl = `/thumbnails/${thumbnailFile.filename}`

    let member
    try {
      member = await db.updateMember(req.params.id, patch)
    } catch (err) {
      await unlinkUploaded(req)
      return res.status(409).json({ error: err.message })
    }
    if (patch.isConductor) await db.clearConductorExcept(member.id)

    // Clean up the old file only if we replaced it with a new upload and the
    // old one was one of ours (never touch legacy /img/ paths).
    if (photoFile && existing.photoUrl?.startsWith('/profile-photos/')) {
      const oldFilename = existing.photoUrl.replace('/profile-photos/', '')
      await fs.promises.unlink(path.join(PROFILE_UPLOAD_DIR, oldFilename)).catch(() => {})
    }
    if (thumbnailFile && existing.thumbnailUrl?.startsWith('/thumbnails/')) {
      const oldFilename = existing.thumbnailUrl.replace('/thumbnails/', '')
      await fs.promises.unlink(path.join(THUMBNAIL_UPLOAD_DIR, oldFilename)).catch(() => {})
    }

    res.json({ member: db.publicMember(member) })
  })
)

// ---- Resource library: folders & files ----

router.get(
  '/folders',
  requireAuth,
  h(async (_req, res) => {
    res.json({ folders: await db.getFolders() })
  })
)

router.post(
  '/folders',
  requireAuth,
  h(async (req, res) => {
    const name = (req.body?.name || '').trim()
    if (!name) return res.status(400).json({ error: '폴더 이름을 입력하세요.' })
    const folder = await db.createFolder({ name, createdBy: req.member.id })
    res.status(201).json({ folder })
  })
)

router.delete(
  '/folders/:id',
  requireAuth,
  requireAdmin,
  h(async (req, res) => {
    const folder = await db.getFolderById(req.params.id)
    if (!folder) return res.status(404).json({ error: '폴더를 찾을 수 없습니다.' })
    const files = await db.getFilesByFolder(folder.id)
    await db.deleteFolder(folder.id) // cascades and removes the file rows too
    await Promise.all(
      files.map((f) => fs.promises.unlink(path.join(UPLOAD_DIR, f.storedName)).catch(() => {}))
    )
    res.json({ ok: true })
  })
)

router.get(
  '/folders/:id/files',
  requireAuth,
  h(async (req, res) => {
    const folder = await db.getFolderById(req.params.id)
    if (!folder) return res.status(404).json({ error: '폴더를 찾을 수 없습니다.' })
    res.json({ files: await db.getFilesByFolder(folder.id) })
  })
)

router.post(
  '/folders/:id/files',
  requireAuth,
  uploadSingle,
  h(async (req, res) => {
    const folder = await db.getFolderById(req.params.id)
    if (!folder) {
      if (req.file) await fs.promises.unlink(req.file.path).catch(() => {})
      return res.status(404).json({ error: '폴더를 찾을 수 없습니다.' })
    }
    if (!req.file) return res.status(400).json({ error: '업로드할 파일을 선택하세요.' })

    const title = (req.body.title || '').trim() || path.parse(req.file.originalname).name
    const file = await db.createFile({
      folderId: folder.id,
      title,
      originalName: req.file.originalname,
      storedName: req.file.filename,
      size: req.file.size,
      uploadedBy: req.member.id,
    })
    res.status(201).json({ file })
  })
)

router.get(
  '/files/:id/download',
  requireAuth,
  h(async (req, res) => {
    const file = await db.getFileById(req.params.id)
    if (!file) return res.status(404).json({ error: '파일을 찾을 수 없습니다.' })

    const ext = path.extname(file.originalName)
    const downloadName = file.title.toLowerCase().endsWith(ext.toLowerCase())
      ? file.title
      : `${file.title}${ext}`

    // Express 5's res.download() no longer infers Content-Type from the
    // download filename (only from the on-disk path), and stored files are
    // saved without an extension — so set it explicitly here.
    if (ext) res.type(ext)

    // ?inline=1 opens the file in the browser (e.g. a PDF preview tab)
    // instead of forcing a save-as download.
    const dispositionType = req.query.inline ? 'inline' : 'attachment'
    const asciiFallback = downloadName.replace(/[^\x20-\x7E]/g, '_').replace(/"/g, "'")
    res.set(
      'Content-Disposition',
      `${dispositionType}; filename="${asciiFallback}"; filename*=UTF-8''${encodeURIComponent(downloadName)}`
    )

    res.sendFile(path.join(UPLOAD_DIR, file.storedName), (err) => {
      if (err && !res.headersSent) res.status(404).json({ error: '파일을 찾을 수 없습니다.' })
    })
  })
)

router.delete(
  '/files/:id',
  requireAuth,
  h(async (req, res) => {
    const file = await db.getFileById(req.params.id)
    if (!file) return res.status(404).json({ error: '파일을 찾을 수 없습니다.' })
    if (file.uploadedBy !== req.member.id && !req.member.isAdmin) {
      return res.status(403).json({ error: '삭제 권한이 없습니다.' })
    }
    await db.deleteFile(file.id)
    await fs.promises.unlink(path.join(UPLOAD_DIR, file.storedName)).catch(() => {})
    res.json({ ok: true })
  })
)

module.exports = router
