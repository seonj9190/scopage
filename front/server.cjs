const express = require('express')
const cookieParser = require('cookie-parser')
const path = require('node:path')
const db = require('./server/db')
const { PROFILE_UPLOAD_DIR } = require('./server/upload')
const apiRoutes = require('./server/routes')

const PORT = process.env.PORT || 3000
const HOST = process.env.HOST || '127.0.0.1'

const app = express()

app.set('trust proxy', 1)
app.use(express.json())
app.use(cookieParser())

app.use('/api', apiRoutes)

// Member profile photos are public-facing (단원소개 page), unlike the
// members-only resource-library files — served without auth.
app.use('/profile-photos', express.static(PROFILE_UPLOAD_DIR))

app.use((err, _req, res, _next) => {
  console.error(err)
  res.status(500).json({ error: '서버 오류가 발생했습니다.' })
})

app.use(express.static(path.join(__dirname, 'dist')))

app.get('/*splat', (_req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'))
})

db.ready
  .then(() => {
    app.listen(PORT, HOST, () => {
      console.log(`Server running at http://${HOST}:${PORT}`)
    })
  })
  .catch((err) => {
    console.error('데이터베이스 연결에 실패했습니다:', err.message)
    process.exit(1)
  })
