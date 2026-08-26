const express = require('express')
const path = require('node:path')

const BASE_PATH = '/seogwipochamber'
const PORT = process.env.PORT || 8080

const app = express()

app.use(BASE_PATH, express.static(path.join(__dirname, 'dist')))

app.get('/', (_req, res) => res.redirect(`${BASE_PATH}/`))

app.get(`${BASE_PATH}/*splat`, (_req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'))
})

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}${BASE_PATH}`)
})
