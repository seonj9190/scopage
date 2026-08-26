import express from 'express'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const BASE_PATH = '/scopage'
const PORT = process.env.PORT || 3000

const app = express()

app.use(BASE_PATH, express.static(path.join(__dirname, 'dist')))

app.get('/', (_req, res) => res.redirect(`${BASE_PATH}/`))

app.get(`${BASE_PATH}/*splat`, (_req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'))
})

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}${BASE_PATH}`)
})
