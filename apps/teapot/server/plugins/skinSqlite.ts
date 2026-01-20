import { mkdirSync } from 'node:fs'
import { Database } from 'bun:sqlite'
import { dirname } from 'pathe'

let db!: Database

export default defineNitroPlugin((nitroApp) => {
  const { sqliteSkinPath = './db/skins.sqlite' } = useRuntimeConfig()

  // Гарантируем существование директории, где будет лежать БД
  mkdirSync(dirname(sqliteSkinPath), { recursive: true })

  // Используем нативный bun:sqlite
  db = new Database(sqliteSkinPath, { create: true })

  // Базовые PRAGMA-настройки
  db.run('PRAGMA journal_mode = WAL;')
  db.run('PRAGMA foreign_keys = ON;')

  // Авто-миграция (таблица skins)
  console.log('SQLite: creating table skins')
  db.run(`
    CREATE TABLE IF NOT EXISTS skins (
      uuid     TEXT PRIMARY KEY,
      path     TEXT NOT NULL,
      mime     TEXT NOT NULL,
      size     INTEGER,
      created  INTEGER DEFAULT (CURRENT_TIMESTAMP)
    );
  `)

  // Авто-миграция (таблица gallery)
  console.log('SQLite: creating table gallery')
  db.run(`
    CREATE TABLE IF NOT EXISTS gallery (
      id               TEXT PRIMARY KEY,
      path             TEXT NOT NULL,
      mime             TEXT NOT NULL,
      size             INTEGER NOT NULL,
      owner_uuid       TEXT NOT NULL,
      description      TEXT,
      category         TEXT,
      season           TEXT,
      coord_x          INTEGER,
      coord_y          INTEGER,
      coord_z          INTEGER,
      involved_players TEXT,
      status           TEXT NOT NULL DEFAULT 'pending',
      created_at       INTEGER NOT NULL,
      updated_at       INTEGER NOT NULL
    );
  `)

  // Индексы для gallery
  db.run('CREATE INDEX IF NOT EXISTS idx_gallery_status ON gallery(status);')
  db.run('CREATE INDEX IF NOT EXISTS idx_gallery_owner ON gallery(owner_uuid);')
  db.run('CREATE INDEX IF NOT EXISTS idx_gallery_category ON gallery(category);')
  db.run('CREATE INDEX IF NOT EXISTS idx_gallery_season ON gallery(season);')

  // Авто-миграция (таблица file_refs для CAS)
  console.log('SQLite: creating table file_refs')
  db.run(`
    CREATE TABLE IF NOT EXISTS file_refs (
      hash         TEXT PRIMARY KEY,
      path         TEXT NOT NULL,
      mime         TEXT NOT NULL,
      size         INTEGER NOT NULL,
      ref_count    INTEGER NOT NULL DEFAULT 1,
      created_at   INTEGER NOT NULL,
      last_used_at INTEGER NOT NULL
    );
  `)
  db.run('CREATE INDEX IF NOT EXISTS idx_file_refs_path ON file_refs(path);')
  db.run('CREATE INDEX IF NOT EXISTS idx_file_refs_refcount ON file_refs(ref_count);')

  // Публикуем экземпляр в контексте Nitro
  // @ts-ignore
  nitroApp.sqlite = db
})

export function useSkinSQLite(): Database {
  if (!db) {
    throw new Error('SQLite not initialised')
  }
  return db
}
