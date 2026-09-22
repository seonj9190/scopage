const fs = require('node:fs')
const path = require('node:path')
const crypto = require('node:crypto')
const multer = require('multer')

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads')
fs.mkdirSync(UPLOAD_DIR, { recursive: true })

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB

const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    // Stored filenames are random and carry no extension — the original
    // name (kept only in the DB) is what's shown to users on download, so
    // there is nothing here for a crafted filename to path-traverse into.
    filename: (_req, _file, cb) => cb(null, crypto.randomUUID()),
  }),
  limits: { fileSize: MAX_FILE_SIZE },
})

function uploadSingle(req, res, next) {
  upload.single('file')(req, res, (err) => {
    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: '파일 용량은 50MB를 넘을 수 없습니다.' })
    }
    if (err) return next(err)
    next()
  })
}

module.exports = { UPLOAD_DIR, uploadSingle }
