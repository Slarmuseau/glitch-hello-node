// SQLite schema for Tapwijs. One local file, easy to find and back up.
// Everything the owner measures is stored; derived numbers are never persisted.

export const SCHEMA_SQL = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS instellingen (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  standaard_doelmarge REAL NOT NULL DEFAULT 0.05,
  marge_conventie TEXT NOT NULL DEFAULT 'op_de_omzet',
  btw_verkoop REAL NOT NULL DEFAULT 21,
  type_feest_config TEXT NOT NULL DEFAULT '{}',
  bedrijfsnaam TEXT NOT NULL DEFAULT '',
  bedrijfsgegevens TEXT NOT NULL DEFAULT '',
  logo_pad TEXT,
  backup_locatie TEXT,
  categorieen TEXT NOT NULL DEFAULT '[]',
  standaard_glaasgrootte_per_categorie TEXT NOT NULL DEFAULT '{}',
  standaard_inkoopmarge_per_categorie TEXT NOT NULL DEFAULT '{}',
  anthropic_api_key TEXT,
  demo_geladen INTEGER NOT NULL DEFAULT 0,
  geinitialiseerd INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS vaten (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  naam TEXT NOT NULL,
  gekoppelde_drank_id INTEGER,
  leeg_gewicht_kg REAL NOT NULL DEFAULT 10,
  inhoud_liter REAL NOT NULL DEFAULT 30,
  dichtheid REAL NOT NULL DEFAULT 1.0,
  inkoopprijs_per_vat REAL NOT NULL DEFAULT 0,
  verlies_percentage REAL NOT NULL DEFAULT 5
);

CREATE TABLE IF NOT EXISTS dranken (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  naam TEXT NOT NULL,
  categorie TEXT NOT NULL DEFAULT '',
  menuprijs REAL NOT NULL DEFAULT 0,
  glaasgrootte_cl REAL NOT NULL DEFAULT 25,
  schenkwijze TEXT NOT NULL DEFAULT 'per_stuk',
  is_cocktail INTEGER NOT NULL DEFAULT 0,
  inkoopprijs_per_consumptie REAL,
  fles_inhoud_cl REAL,
  inkoopprijs_per_fles REAL,
  vat_id INTEGER REFERENCES vaten(id) ON DELETE SET NULL,
  btw_inkoop REAL NOT NULL DEFAULT 21,
  btw_verkoop REAL NOT NULL DEFAULT 21,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS forfaits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  naam TEXT NOT NULL,
  verwachte_consumpties_per_persoon REAL,
  handmatige_prijs REAL,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS forfait_dranken (
  forfait_id INTEGER NOT NULL REFERENCES forfaits(id) ON DELETE CASCADE,
  drank_id INTEGER NOT NULL REFERENCES dranken(id) ON DELETE CASCADE,
  glaasgrootte_override REAL,
  PRIMARY KEY (forfait_id, drank_id)
);

CREATE TABLE IF NOT EXISTS feesten (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  naam TEXT NOT NULL,
  type_feest TEXT NOT NULL DEFAULT 'andere',
  datum TEXT NOT NULL,
  publiek TEXT,
  doelmarge REAL NOT NULL DEFAULT 0.05,
  korting_reden TEXT,
  prijs_momentopname TEXT NOT NULL DEFAULT '{}',
  aangemaakt TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS toewijzingen (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  feest_id INTEGER NOT NULL REFERENCES feesten(id) ON DELETE CASCADE,
  forfait_id INTEGER REFERENCES forfaits(id) ON DELETE SET NULL,
  forfait_naam TEXT NOT NULL DEFAULT '',
  aantal_personen INTEGER NOT NULL DEFAULT 0,
  forfaitprijs_per_persoon REAL NOT NULL DEFAULT 0,
  korting_pct REAL NOT NULL DEFAULT 0,
  duur_uur REAL NOT NULL DEFAULT 1.5
);

CREATE TABLE IF NOT EXISTS consumptieregistraties (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  feest_id INTEGER NOT NULL REFERENCES feesten(id) ON DELETE CASCADE,
  drank_id INTEGER NOT NULL REFERENCES dranken(id) ON DELETE CASCADE,
  aantal_empties REAL,
  aantal_flessen REAL,
  aantal_vaten_geopend REAL,
  gewicht_laatste_vat_kg REAL,
  cocktail_tally REAL,
  UNIQUE (feest_id, drank_id)
);

INSERT OR IGNORE INTO instellingen (id) VALUES (1);
`
