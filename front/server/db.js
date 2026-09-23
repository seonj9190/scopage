const path = require('node:path')
const crypto = require('node:crypto')
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') })

const mysql = require('mysql2/promise')

// Distinct, readable colors auto-assigned to members in join order.
const COLOR_PALETTE = [
  '#e11d48', '#2563eb', '#16a34a', '#d97706', '#7c3aed',
  '#0d9488', '#db2777', '#4f46e5', '#65a30d', '#0891b2',
  '#c2410c', '#9333ea',
]

const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'scopage',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'scopage',
  waitForConnections: true,
  connectionLimit: 10,
  charset: 'utf8mb4',
})

// Returns true if the column already existed, false if it was just added —
// callers use this to run one-off backfills only on the migration that adds
// the column.
async function ensureColumn(table, column, definition) {
  const [rows] = await pool.query(
    `SELECT COUNT(*) AS cnt FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [table, column]
  )
  const existed = rows[0].cnt > 0
  if (!existed) {
    await pool.query(`ALTER TABLE ${table} ADD COLUMN ${definition}`)
  }
  return existed
}

async function initSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS members (
      id CHAR(36) PRIMARY KEY,
      username VARCHAR(64) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      name VARCHAR(100) NOT NULL,
      color VARCHAR(7) NOT NULL,
      is_admin TINYINT(1) NOT NULL DEFAULT 0,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      part VARCHAR(100) NULL,
      bio1 VARCHAR(500) NULL,
      bio2 VARCHAR(500) NULL,
      photo_url VARCHAR(255) NULL,
      is_public TINYINT(1) NOT NULL DEFAULT 0,
      is_conductor TINYINT(1) NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `)
  // Existing deployments created the table before these columns existed.
  await ensureColumn('members', 'is_active', 'is_active TINYINT(1) NOT NULL DEFAULT 1')
  await ensureColumn('members', 'part', 'part VARCHAR(100) NULL')
  await ensureColumn('members', 'bio1', 'bio1 VARCHAR(500) NULL')
  await ensureColumn('members', 'bio2', 'bio2 VARCHAR(500) NULL')
  await ensureColumn('members', 'photo_url', 'photo_url VARCHAR(255) NULL')
  await ensureColumn('members', 'is_conductor', 'is_conductor TINYINT(1) NOT NULL DEFAULT 0')
  await ensureColumn('members', 'is_public', 'is_public TINYINT(1) NOT NULL DEFAULT 0')
  const hadDisplayOrder = await ensureColumn('members', 'display_order', 'display_order INT NOT NULL DEFAULT 0')
  if (!hadDisplayOrder) {
    // Backfill existing rows so the roster order doesn't change until an
    // admin deliberately reorders it — mirrors the old implicit ordering.
    await pool.query(`
      UPDATE members
      JOIN (
        SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC, username ASC) AS rn
        FROM members
      ) ranked ON ranked.id = members.id
      SET members.display_order = ranked.rn
    `)
  }
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schedules (
      id CHAR(36) PRIMARY KEY,
      member_id CHAR(36) NOT NULL,
      title VARCHAR(200) NOT NULL,
      start_at VARCHAR(19) NOT NULL,
      end_at VARCHAR(19) NOT NULL,
      all_day TINYINT(1) NOT NULL DEFAULT 1,
      type ENUM('fixed', 'flexible') NOT NULL,
      is_team TINYINT(1) NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `)
  // Existing deployments created the table before is_team existed —
  // add it if this is an upgrade rather than a fresh install.
  await ensureColumn('schedules', 'is_team', 'is_team TINYINT(1) NOT NULL DEFAULT 0')
  await pool.query(`
    CREATE TABLE IF NOT EXISTS folders (
      id CHAR(36) PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      created_by CHAR(36) NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES members(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS files (
      id CHAR(36) PRIMARY KEY,
      folder_id CHAR(36) NOT NULL,
      title VARCHAR(200) NOT NULL,
      original_name VARCHAR(255) NOT NULL,
      stored_name VARCHAR(255) NOT NULL,
      size INT NOT NULL,
      uploaded_by CHAR(36) NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE CASCADE,
      FOREIGN KEY (uploaded_by) REFERENCES members(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `)
}

const ready = initSchema()

function rowToMember(row) {
  if (!row) return null
  return {
    id: row.id,
    username: row.username,
    passwordHash: row.password_hash,
    name: row.name,
    color: row.color,
    isAdmin: !!row.is_admin,
    isActive: !!row.is_active,
    part: row.part,
    bio1: row.bio1,
    bio2: row.bio2,
    photoUrl: row.photo_url,
    isPublic: !!row.is_public,
    isConductor: !!row.is_conductor,
    displayOrder: row.display_order,
    createdAt: row.created_at,
  }
}

function rowToSchedule(row) {
  if (!row) return null
  return {
    id: row.id,
    memberId: row.member_id,
    title: row.title,
    start: row.start_at,
    end: row.end_at,
    allDay: !!row.all_day,
    type: row.type,
    isTeam: !!row.is_team,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function rowToFolder(row) {
  if (!row) return null
  return {
    id: row.id,
    name: row.name,
    createdBy: row.created_by,
    createdAt: row.created_at,
  }
}

function rowToFile(row) {
  if (!row) return null
  return {
    id: row.id,
    folderId: row.folder_id,
    title: row.title,
    originalName: row.original_name,
    storedName: row.stored_name,
    size: row.size,
    uploadedBy: row.uploaded_by,
    createdAt: row.created_at,
  }
}

function publicMember(member) {
  if (!member) return null
  const { id, username, name, color, isAdmin, isActive, part, bio1, bio2, photoUrl, isPublic, isConductor, displayOrder } = member
  return {
    id,
    username,
    name,
    color,
    isAdmin: !!isAdmin,
    isActive: !!isActive,
    part,
    bio1,
    bio2,
    photoUrl,
    isPublic: !!isPublic,
    isConductor: !!isConductor,
    displayOrder,
  }
}

// Shape exposed on the unauthenticated public roster — no username/admin/
// active flags, just what a visitor to the site should see.
function publicProfile(member) {
  if (!member) return null
  const { id, name, part, bio1, bio2, photoUrl, isConductor } = member
  return { id, name, part, bio1, bio2, photoUrl, isConductor: !!isConductor }
}

const db = {
  ready,

  async close() {
    await pool.end()
  },

  async getMembers() {
    const [rows] = await pool.query('SELECT * FROM members ORDER BY display_order ASC, created_at ASC, username ASC')
    return rows.map(rowToMember)
  },

  async getMemberById(id) {
    const [rows] = await pool.execute('SELECT * FROM members WHERE id = ?', [id])
    return rowToMember(rows[0])
  },

  async getMemberByUsername(username) {
    const [rows] = await pool.execute('SELECT * FROM members WHERE username = ?', [username])
    return rowToMember(rows[0])
  },

  async createMember({
    username,
    passwordHash,
    name,
    isAdmin = false,
    isActive = true,
    part = null,
    bio1 = null,
    bio2 = null,
    photoUrl = null,
    isPublic = false,
    isConductor = false,
  }) {
    const [[{ count, maxOrder }]] = await pool.query(
      'SELECT COUNT(*) AS count, COALESCE(MAX(display_order), 0) AS maxOrder FROM members'
    )
    const color = COLOR_PALETTE[count % COLOR_PALETTE.length]
    const id = crypto.randomUUID()
    try {
      await pool.execute(
        `INSERT INTO members
           (id, username, password_hash, name, color, is_admin, is_active, part, bio1, bio2, photo_url, is_public, is_conductor, display_order)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id, username, passwordHash, name, color,
          isAdmin ? 1 : 0, isActive ? 1 : 0, part, bio1, bio2, photoUrl,
          isPublic ? 1 : 0, isConductor ? 1 : 0, maxOrder + 1,
        ]
      )
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY') throw new Error('이미 존재하는 아이디입니다.')
      throw err
    }
    return db.getMemberById(id)
  },

  async updateMember(id, patch) {
    const fields = []
    const values = []
    if (patch.username !== undefined) {
      fields.push('username = ?')
      values.push(patch.username)
    }
    if (patch.name !== undefined) {
      fields.push('name = ?')
      values.push(patch.name)
    }
    if (patch.passwordHash !== undefined) {
      fields.push('password_hash = ?')
      values.push(patch.passwordHash)
    }
    if (patch.isAdmin !== undefined) {
      fields.push('is_admin = ?')
      values.push(patch.isAdmin ? 1 : 0)
    }
    if (patch.isActive !== undefined) {
      fields.push('is_active = ?')
      values.push(patch.isActive ? 1 : 0)
    }
    if (patch.part !== undefined) {
      fields.push('part = ?')
      values.push(patch.part)
    }
    if (patch.bio1 !== undefined) {
      fields.push('bio1 = ?')
      values.push(patch.bio1)
    }
    if (patch.bio2 !== undefined) {
      fields.push('bio2 = ?')
      values.push(patch.bio2)
    }
    if (patch.photoUrl !== undefined) {
      fields.push('photo_url = ?')
      values.push(patch.photoUrl)
    }
    if (patch.isPublic !== undefined) {
      fields.push('is_public = ?')
      values.push(patch.isPublic ? 1 : 0)
    }
    if (patch.isConductor !== undefined) {
      fields.push('is_conductor = ?')
      values.push(patch.isConductor ? 1 : 0)
    }
    if (!fields.length) return db.getMemberById(id)
    values.push(id)
    try {
      await pool.execute(`UPDATE members SET ${fields.join(', ')} WHERE id = ?`, values)
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY') throw new Error('이미 존재하는 아이디입니다.')
      throw err
    }
    return db.getMemberById(id)
  },

  // Enforces at most one conductor: call before/after granting the flag to
  // `id` so an admin flipping a new conductor on can't leave the old one
  // still marked, which would otherwise silently show two "지휘자" entries.
  async clearConductorExcept(id) {
    await pool.execute('UPDATE members SET is_conductor = 0 WHERE id != ?', [id])
  },

  async getPublicMembers() {
    // is_active only gates login capability, not this — a profile-only
    // entry (never meant to log in) still belongs on the public roster.
    // Admins control public visibility solely through is_public.
    const [rows] = await pool.query('SELECT * FROM members WHERE is_public = 1 ORDER BY display_order ASC, created_at ASC')
    return rows.map(rowToMember)
  },

  // Applies an admin-chosen display order: `orderedIds` is the full member
  // list in its new order, so a member's position is just its index in it.
  async reorderMembers(orderedIds) {
    await Promise.all(
      orderedIds.map((id, index) =>
        pool.execute('UPDATE members SET display_order = ? WHERE id = ?', [index + 1, id])
      )
    )
  },

  async getSchedules() {
    const [rows] = await pool.query('SELECT * FROM schedules ORDER BY start_at ASC')
    return rows.map(rowToSchedule)
  },

  async getScheduleById(id) {
    const [rows] = await pool.execute('SELECT * FROM schedules WHERE id = ?', [id])
    return rowToSchedule(rows[0])
  },

  async createSchedule({ memberId, title, start, end, allDay, type, isTeam = false }) {
    const id = crypto.randomUUID()
    await pool.execute(
      'INSERT INTO schedules (id, member_id, title, start_at, end_at, all_day, type, is_team) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [id, memberId, title, start, end, allDay ? 1 : 0, type, isTeam ? 1 : 0]
    )
    return db.getScheduleById(id)
  },

  async updateSchedule(id, patch) {
    const fields = []
    const values = []
    if (patch.title !== undefined) {
      fields.push('title = ?')
      values.push(patch.title)
    }
    if (patch.start !== undefined) {
      fields.push('start_at = ?')
      values.push(patch.start)
    }
    if (patch.end !== undefined) {
      fields.push('end_at = ?')
      values.push(patch.end)
    }
    if (patch.allDay !== undefined) {
      fields.push('all_day = ?')
      values.push(patch.allDay ? 1 : 0)
    }
    if (patch.type !== undefined) {
      fields.push('type = ?')
      values.push(patch.type)
    }
    if (patch.isTeam !== undefined) {
      fields.push('is_team = ?')
      values.push(patch.isTeam ? 1 : 0)
    }
    if (patch.memberId !== undefined) {
      fields.push('member_id = ?')
      values.push(patch.memberId)
    }
    if (!fields.length) return db.getScheduleById(id)
    values.push(id)
    await pool.execute(`UPDATE schedules SET ${fields.join(', ')} WHERE id = ?`, values)
    return db.getScheduleById(id)
  },

  async deleteSchedule(id) {
    const [result] = await pool.execute('DELETE FROM schedules WHERE id = ?', [id])
    return result.affectedRows > 0
  },

  async getFolders() {
    const [rows] = await pool.query('SELECT * FROM folders ORDER BY name ASC')
    return rows.map(rowToFolder)
  },

  async getFolderById(id) {
    const [rows] = await pool.execute('SELECT * FROM folders WHERE id = ?', [id])
    return rowToFolder(rows[0])
  },

  async createFolder({ name, createdBy }) {
    const id = crypto.randomUUID()
    await pool.execute('INSERT INTO folders (id, name, created_by) VALUES (?, ?, ?)', [id, name, createdBy])
    return db.getFolderById(id)
  },

  async deleteFolder(id) {
    const [result] = await pool.execute('DELETE FROM folders WHERE id = ?', [id])
    return result.affectedRows > 0
  },

  async getFilesByFolder(folderId) {
    const [rows] = await pool.execute(
      'SELECT * FROM files WHERE folder_id = ? ORDER BY created_at DESC',
      [folderId]
    )
    return rows.map(rowToFile)
  },

  async getFileById(id) {
    const [rows] = await pool.execute('SELECT * FROM files WHERE id = ?', [id])
    return rowToFile(rows[0])
  },

  async createFile({ folderId, title, originalName, storedName, size, uploadedBy }) {
    const id = crypto.randomUUID()
    await pool.execute(
      'INSERT INTO files (id, folder_id, title, original_name, stored_name, size, uploaded_by) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, folderId, title, originalName, storedName, size, uploadedBy]
    )
    return db.getFileById(id)
  },

  async deleteFile(id) {
    const [result] = await pool.execute('DELETE FROM files WHERE id = ?', [id])
    return result.affectedRows > 0
  },

  publicMember,
  publicProfile,
}

module.exports = db
