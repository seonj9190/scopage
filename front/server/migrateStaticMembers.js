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
  const { conductor, members: staticMembers } = await import(staticMembersUrl)

  const existing = await db.getMembers()
  const existingNames = new Set(existing.map((m) => m.name))

  async function migrateOne({ name, part, bio1, bio2, photoUrl, isConductor }) {
    if (existingNames.has(name)) {
      console.log(`건너뜀 (이미 존재): ${name}`)
      return false
    }
    const username = `legacy-${crypto.randomUUID().slice(0, 8)}`
    const password = crypto.randomBytes(24).toString('hex') // never shared; login is blocked below anyway
    const member = await db.createMember({
      username,
      passwordHash: hashPassword(password),
      name,
      isAdmin: false,
      isActive: false,
      part: part || null,
      bio1: bio1 || null,
      bio2: bio2 || null,
      photoUrl: photoUrl || null, // existing /img/... paths keep working as-is
      isPublic: true,
      isConductor: !!isConductor,
    })
    console.log(`이전 완료: ${member.name} (${member.part || '파트 없음'})`)
    return true
  }

  let migrated = 0
  let total = staticMembers.length

  if (conductor) {
    total += 1
    if (await migrateOne({
      name: conductor.name,
      part: conductor.role,
      bio1: conductor.exp1,
      bio2: conductor.exp2,
      photoUrl: conductor.photo,
      isConductor: true,
    })) migrated++
  }

  for (const m of staticMembers) {
    if (await migrateOne({ name: m.name, part: m.part, bio1: m.exp1, bio2: m.exp2, photoUrl: m.photo })) migrated++
  }

  console.log(`총 ${migrated}명 이전, ${total - migrated}명 건너뜀.`)
  await db.close()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
