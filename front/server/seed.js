// One-off CLI script to create the very first admin account, since there is
// no public sign-up flow (accounts are created by an admin only).
//
// Usage: node server/seed.js <username> <password> <name>
const db = require('./db')
const { hashPassword } = require('./auth')

const [, , username, password, name] = process.argv

async function main() {
  if (!username || !password || !name) {
    console.error('사용법: node server/seed.js <아이디> <비밀번호> <이름>')
    process.exitCode = 1
    return
  }

  await db.ready
  try {
    const member = await db.createMember({
      username,
      passwordHash: hashPassword(password),
      name,
      isAdmin: true,
    })
    console.log(`관리자 계정이 생성되었습니다: ${member.name} (${member.username})`)
  } catch (err) {
    console.error(err.message)
    process.exitCode = 1
  } finally {
    await db.close()
  }
}

main()
