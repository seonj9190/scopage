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

// ---- Public image uploads (member photos, gallery photos, posters) ----
// All served back out publicly (unauthenticated, via express.static),
// unlike the members-only resource-library files above, so the on-disk
// filename keeps a real extension and the content is restricted to images.

const IMAGE_EXTENSIONS = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
}

// ---- Member profile photo + calendar-chip thumbnail ----
// A single multer instance handles both fields since they only differ by
// destination directory — routed per-file via file.fieldname. Thumbnails
// are a separate, smaller image shown instead of a member's name on the
// calendar's day-cell chips.

const MAX_PHOTO_SIZE = 5 * 1024 * 1024 // 5MB

const PROFILE_UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'profiles')
fs.mkdirSync(PROFILE_UPLOAD_DIR, { recursive: true })

const THUMBNAIL_UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'thumbnails')
fs.mkdirSync(THUMBNAIL_UPLOAD_DIR, { recursive: true })

const memberPhotoFilter = (_req, file, cb) => {
  if (!IMAGE_EXTENSIONS[file.mimetype]) {
    return cb(new Error('이미지 파일(JPG, PNG, WEBP, GIF)만 업로드할 수 있습니다.'))
  }
  cb(null, true)
}

const memberPhotosRaw = multer({
  storage: multer.diskStorage({
    destination: (_req, file, cb) => {
      cb(null, file.fieldname === 'thumbnail' ? THUMBNAIL_UPLOAD_DIR : PROFILE_UPLOAD_DIR)
    },
    filename: (_req, file, cb) => cb(null, crypto.randomUUID() + (IMAGE_EXTENSIONS[file.mimetype] || '')),
  }),
  limits: { fileSize: MAX_PHOTO_SIZE },
  fileFilter: memberPhotoFilter,
})

// Populates req.files.photo[0] / req.files.thumbnail[0] when present.
function uploadMemberPhotos(req, res, next) {
  memberPhotosRaw.fields([
    { name: 'photo', maxCount: 1 },
    { name: 'thumbnail', maxCount: 1 },
  ])(req, res, (err) => {
    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: '사진 용량은 5MB를 넘을 수 없습니다.' })
    }
    if (err) return res.status(400).json({ error: err.message })
    next()
  })
}

// ---- Generic single-image uploader (gallery photos, performance posters) ----

function createImageUploader({ dir, fieldName, maxSizeMB, tooLargeMessage }) {
  fs.mkdirSync(dir, { recursive: true })
  const raw = multer({
    storage: multer.diskStorage({
      destination: dir,
      filename: (_req, file, cb) => cb(null, crypto.randomUUID() + (IMAGE_EXTENSIONS[file.mimetype] || '')),
    }),
    limits: { fileSize: maxSizeMB * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      if (!IMAGE_EXTENSIONS[file.mimetype]) {
        return cb(new Error('이미지 파일(JPG, PNG, WEBP, GIF)만 업로드할 수 있습니다.'))
      }
      cb(null, true)
    },
  })
  return function uploadImage(req, res, next) {
    raw.single(fieldName)(req, res, (err) => {
      if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: tooLargeMessage })
      }
      if (err) return res.status(400).json({ error: err.message })
      next()
    })
  }
}

const GALLERY_UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'gallery')
const uploadGalleryPhoto = createImageUploader({
  dir: GALLERY_UPLOAD_DIR,
  fieldName: 'photo',
  maxSizeMB: 8,
  tooLargeMessage: '사진 용량은 8MB를 넘을 수 없습니다.',
})

const POSTER_UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'posters')
const uploadPoster = createImageUploader({
  dir: POSTER_UPLOAD_DIR,
  fieldName: 'poster',
  maxSizeMB: 8,
  tooLargeMessage: '포스터 용량은 8MB를 넘을 수 없습니다.',
})

module.exports = {
  UPLOAD_DIR,
  uploadSingle,
  PROFILE_UPLOAD_DIR,
  THUMBNAIL_UPLOAD_DIR,
  uploadMemberPhotos,
  GALLERY_UPLOAD_DIR,
  uploadGalleryPhoto,
  POSTER_UPLOAD_DIR,
  uploadPoster,
}
