const express = require('express')
const path = require('node:path')

const PORT = process.env.PORT || 3000
const HOST = process.env.HOST || '127.0.0.1'

const app = express()

app.use(express.static(path.join(__dirname, 'dist')))

app.get('/*splat', (_req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'))
})

app.listen(PORT, HOST, () => {
  console.log(`Server running at http://${HOST}:${PORT}`)
})
