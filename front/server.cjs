const express = require('express')
const path = require('node:path')

const PORT = process.env.PORT || 80

const app = express()

app.use(express.static(path.join(__dirname, 'dist')))

app.get('/*splat', (_req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'))
})

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`)
})
