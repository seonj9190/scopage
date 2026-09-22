const fs = require('node:fs')
const path = require('node:path')
const crypto = require('node:crypto')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const db = require('./db')

function loadOrCreateSecret() {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET
  const dataDir = path.join(__dirname, '..', 'data')
  const secretFile = path.join(dataDir, '.jwt_secret')
  if (fs.existsSync(secretFile)) {
    return fs.readFileSync(secretFile, 'utf-8').trim()
  }
  fs.mkdirSync(dataDir, { recursive: true })
  const secret = crypto.randomBytes(48).toString('hex')
  fs.writeFileSync(secretFile, secret, 'utf-8')
  return secret
}

const JWT_SECRET = loadOrCreateSecret()

const COOKIE_NAME = 'scopage_token'
const TOKEN_TTL = '30d'

function hashPassword(password) {
  return bcrypt.hashSync(password, 10)
}

function verifyPassword(password, hash) {
  return bcrypt.compareSync(password, hash)
}

function issueToken(member) {
  return jwt.sign({ sub: member.id }, JWT_SECRET, { expiresIn: TOKEN_TTL })
}

function setAuthCookie(req, res, token) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: req.secure,
    maxAge: 30 * 24 * 60 * 60 * 1000,
  })
}

function clearAuthCookie(res) {
  res.clearCookie(COOKIE_NAME)
}

async function requireAuth(req, res, next) {
  const token = req.cookies?.[COOKIE_NAME]
  if (!token) return res.status(401).json({ error: '로그인이 필요합니다.' })
  try {
    const payload = jwt.verify(token, JWT_SECRET)
    const member = await db.getMemberById(payload.sub)
    if (!member) return res.status(401).json({ error: '로그인이 필요합니다.' })
    req.member = member
    next()
  } catch {
    return res.status(401).json({ error: '로그인이 필요합니다.' })
  }
}

function requireAdmin(req, res, next) {
  if (!req.member?.isAdmin) {
    return res.status(403).json({ error: '관리자만 접근할 수 있습니다.' })
  }
  next()
}

module.exports = {
  COOKIE_NAME,
  hashPassword,
  verifyPassword,
  issueToken,
  setAuthCookie,
  clearAuthCookie,
  requireAuth,
  requireAdmin,
}
