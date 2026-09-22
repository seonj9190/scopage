// One-off script to move the hardcoded roster in src/data/members.js into
// the database, now that 단원소개 is served dynamically. These entries have
// no real login use, so they get an unguessable password and are left
// inactive — only `is_public` matters for them.
//
// Usage: node server/migrateStaticMembers.js
// Safe to re-run: entries already migrated (matched by name) are skipped.
const path = require('node:path')
const crypto = require('node:crypto')
const { pathToFileURL } = require('node:url')
const db = require('./db')
const { hashPassword } = require('./auth')

async function main() {
  await db.ready

  const staticMembersUrl = pathToFileURL(path.join(__dirname, '..', 'src', 'data', 'members.js')).href
  const { members: staticMembers } = await import(staticMembersUrl)

  const existing = await db.getMembers()
  const existingNames = new Set(existing.map((m) => m.name))

  let migrated = 0
  for (const m of staticMembers) {
    if (existingNames.has(m.name)) {
      console.log(`건너뜀 (이미 존재): ${m.name}`)
      continue
    }
    const username = `legacy-${crypto.randomUUID().slice(0, 8)}`
    const password = crypto.randomBytes(24).toString('hex') // never shared; login is blocked below anyway
    const member = await db.createMember({
      username,
      passwordHash: hashPassword(password),
      name: m.name,
      isAdmin: false,
      isActive: false,
      part: m.part || null,
      bio1: m.exp1 || null,
      bio2: m.exp2 || null,
      photoUrl: m.photo || null, // existing /img/... paths keep working as-is
      isPublic: true,
    })
    console.log(`이전 완료: ${member.name} (${member.part || '파트 없음'})`)
    migrated++
  }

  console.log(`총 ${migrated}명 이전, ${staticMembers.length - migrated}명 건너뜀.`)
  await db.close()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
