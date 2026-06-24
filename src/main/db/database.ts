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
  runMigrations(db)
  currentPath = filePath
  return db
}

/** Idempotent column additions for databases created by an older version. */
function runMigrations(database: Database.Database): void {
  const kolommen = (tabel: string): string[] =>
    (database.pragma(`table_info(${tabel})`) as { name: string }[]).map((c) => c.name)

  const toewijzingen = kolommen('toewijzingen')
  if (!toewijzingen.includes('korting_pct')) {
    database.exec('ALTER TABLE toewijzingen ADD COLUMN korting_pct REAL NOT NULL DEFAULT 0')
  }

  const dranken = kolommen('dranken')
  if (!dranken.includes('btw_inkoop')) {
    database.exec('ALTER TABLE dranken ADD COLUMN btw_inkoop REAL NOT NULL DEFAULT 21')
  }

  const instellingen = kolommen('instellingen')
  if (!instellingen.includes('btw_verkoop')) {
    database.exec('ALTER TABLE instellingen ADD COLUMN btw_verkoop REAL NOT NULL DEFAULT 21')
  }
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
