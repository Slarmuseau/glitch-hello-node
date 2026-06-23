import Database from 'better-sqlite3'
import { SCHEMA_SQL } from './schema'

let db: Database.Database | null = null
let currentPath = ''

/** Open (or reopen) the SQLite database at the given file path. */
export function openDatabase(filePath: string): Database.Database {
  if (db) db.close()
  db = new Database(filePath)
  db.pragma('journal_mode = WAL')
  db.exec(SCHEMA_SQL)
  currentPath = filePath
  return db
}

export function getDb(): Database.Database {
  if (!db) throw new Error('Database is nog niet geopend.')
  return db
}

export function getDatabasePath(): string {
  return currentPath
}

export function closeDatabase(): void {
  if (db) {
    db.close()
    db = null
  }
}
