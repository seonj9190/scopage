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

// ---- Member profile photos ----
// These are served back out publicly (unauthenticated, via express.static),
// unlike the members-only resource-library files above, so the on-disk
// filename keeps a real extension and the content is restricted to images.

const PROFILE_UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'profiles')
fs.mkdirSync(PROFILE_UPLOAD_DIR, { recursive: true })

const MAX_PHOTO_SIZE = 5 * 1024 * 1024 // 5MB

const IMAGE_EXTENSIONS = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
}

const uploadPhotoRaw = multer({
  storage: multer.diskStorage({
    destination: PROFILE_UPLOAD_DIR,
    filename: (_req, file, cb) => cb(null, crypto.randomUUID() + (IMAGE_EXTENSIONS[file.mimetype] || '')),
  }),
  limits: { fileSize: MAX_PHOTO_SIZE },
  fileFilter: (_req, file, cb) => {
    if (!IMAGE_EXTENSIONS[file.mimetype]) {
      return cb(new Error('이미지 파일(JPG, PNG, WEBP, GIF)만 업로드할 수 있습니다.'))
    }
    cb(null, true)
  },
})

function uploadPhoto(req, res, next) {
  uploadPhotoRaw.single('photo')(req, res, (err) => {
    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: '사진 용량은 5MB를 넘을 수 없습니다.' })
    }
    if (err) return res.status(400).json({ error: err.message })
    next()
  })
}

module.exports = { UPLOAD_DIR, uploadSingle, PROFILE_UPLOAD_DIR, uploadPhoto }
