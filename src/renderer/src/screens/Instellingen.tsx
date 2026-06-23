import { useState } from 'react'
import { api } from '../lib/api'
import { useData } from '../lib/hooks'
import { PageHeader, Card, Field } from '../components/ui'
import { NumberInput } from '../components/NumberInput'
import { useToast } from '../components/Toast'
import type { Instellingen as InstellingenType, MargeConventie } from '@shared/domain'

export default function Instellingen(): JSX.Element {
  const toast = useToast()
  const inst = useData(() => api.instellingen.get())
  const demo = useData(() => api.demo.status())
  const dbPath = useData(() => api.data.dbPath())

  if (inst.loading) return <div className="text-ink-faint">Laden…</div>
  const data = inst.data!

  const save = async (patch: Partial<InstellingenType>): Promise<void> => {
    await api.instellingen.save({ ...data, ...patch })
    inst.reload()
  }

  return (
    <div>
      <PageHeader title="Instellingen" subtitle="Alles is hier aanpasbaar — geen config-bestanden, geen verborgen knoppen." />

      <div className="space-y-5">
        {/* Marge */}
        <Card>
          <h2 className="text-sm font-semibold text-ink-soft uppercase tracking-wide mb-4">Marge</h2>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Standaard doelmarge (%)" hint="De ondergrens op je forfaitmarge">
              <NumberInput
                value={data.standaard_doelmarge * 100}
                onCommit={(n) => save({ standaard_doelmarge: n / 100 })}
                suffix="%"
              />
            </Field>
            <Field label="Marge-conventie" hint="De twee geven verschillende prijzen — kies je eigen betekenis">
              <select
                className="input"
                value={data.marge_conventie}
                onChange={(e) => save({ marge_conventie: e.target.value as MargeConventie })}
              >
                <option value="op_de_omzet">op de omzet — prijs = kost ÷ (1 − marge)</option>
                <option value="opslag_op_kostprijs">opslag op kostprijs — prijs = kost × (1 + marge)</option>
              </select>
            </Field>
          </div>
        </Card>

        {/* Bedrijf */}
        <Card>
          <h2 className="text-sm font-semibold text-ink-soft uppercase tracking-wide mb-4">Bedrijfsgegevens</h2>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Naam zaak">
              <input
                className="input"
                defaultValue={data.bedrijfsnaam}
                onBlur={(e) => save({ bedrijfsnaam: e.target.value })}
              />
            </Field>
            <Field label="Logo-bestand (pad)" hint="Voor in de koptekst en op de afdrukbladen">
              <input
                className="input"
                defaultValue={data.logo_pad ?? ''}
                onBlur={(e) => save({ logo_pad: e.target.value || null })}
              />
            </Field>
            <Field label="Adres en gegevens">
              <textarea
                className="input min-h-[80px]"
                defaultValue={data.bedrijfsgegevens}
                onBlur={(e) => save({ bedrijfsgegevens: e.target.value })}
              />
            </Field>
            <Field label="Anthropic API-sleutel" hint="Optioneel, voor het later inlezen van foto's van de bladen">
              <input
                className="input"
                type="password"
                defaultValue={data.anthropic_api_key ?? ''}
                onBlur={(e) => save({ anthropic_api_key: e.target.value || null })}
              />
            </Field>
          </div>
        </Card>

        {/* Categorieen */}
        <CategorieBeheer data={data} onSave={save} />

        {/* Data */}
        <Card>
          <h2 className="text-sm font-semibold text-ink-soft uppercase tracking-wide mb-2">
            Gegevens en back-up
          </h2>
          <p className="text-sm text-ink-soft mb-4">
            Je gegevens staan in één lokaal bestand op deze computer. Maak er gerust een kopie van.
          </p>
          <div className="bg-cream rounded-xl px-4 py-3 text-xs text-ink-soft mb-4 break-all">
            <span className="text-ink-faint">Gegevensbestand:</span> {dbPath.data ?? '…'}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              className="btn-outline"
              onClick={() => api.data.revealDb().then((r) => r.ok && toast(`Map geopend (${r.naam})`))}
            >
              Toon bestand in map
            </button>
            <button
              className="btn-outline"
              onClick={() => api.data.backup().then((r) => r.ok && toast('Reservekopie gemaakt', 'good'))}
            >
              Reservekopie maken
            </button>
            <button
              className="btn-outline"
              onClick={() => api.data.exportAlles().then((r) => r.ok && toast('Geëxporteerd', 'good'))}
            >
              Alles exporteren (JSON)
            </button>
            <button
              className="btn-outline"
              onClick={() => api.data.exportCsv().then((r) => r.ok && toast('CSV geëxporteerd', 'good'))}
            >
              Dranken naar Excel (CSV)
            </button>
            <button
              className="btn-ghost"
              onClick={async () => {
                if (!confirm('Huidige gegevens vervangen door een import?')) return
                const r = await api.data.importAlles()
                if (r.ok) {
                  toast('Geïmporteerd', 'good')
                  inst.reload()
                  demo.reload()
                }
              }}
            >
              Importeren (JSON)
            </button>
          </div>
        </Card>

        {/* Demo */}
        <Card>
          <h2 className="text-sm font-semibold text-ink-soft uppercase tracking-wide mb-2">Demo-gegevens</h2>
          <p className="text-sm text-ink-soft mb-4">
            {demo.data?.geladen
              ? 'De app is gevuld met voorbeeldgegevens. Wis ze als je met je eigen cijfers wil starten.'
              : 'Er zijn momenteel geen demo-gegevens als zodanig gemarkeerd.'}
          </p>
          <button
            className="btn-danger"
            onClick={async () => {
              if (!confirm('Alle dranken, vaten, forfaits en feesten wissen?')) return
              await api.demo.wis()
              toast('Alle gegevens gewist')
              demo.reload()
              inst.reload()
            }}
          >
            Alle gegevens wissen
          </button>
        </Card>
      </div>
    </div>
  )
}

function CategorieBeheer({
  data,
  onSave
}: {
  data: InstellingenType
  onSave: (patch: Partial<InstellingenType>) => Promise<void>
}): JSX.Element {
  const [nieuw, setNieuw] = useState('')
  const cats = data.categorieen

  const muteer = (next: string[]): Promise<void> => onSave({ categorieen: next })

  const hernoem = (oud: string, nieuwNaam: string): Promise<void> => {
    const next = cats.map((c) => (c === oud ? nieuwNaam : c))
    const glas = { ...data.standaard_glaasgrootte_per_categorie }
    if (glas[oud] != null) {
      glas[nieuwNaam] = glas[oud]
      delete glas[oud]
    }
    return onSave({ categorieen: next, standaard_glaasgrootte_per_categorie: glas })
  }

  const verplaats = (i: number, richting: -1 | 1): Promise<void> => {
    const j = i + richting
    if (j < 0 || j >= cats.length) return Promise.resolve()
    const next = [...cats]
    ;[next[i], next[j]] = [next[j], next[i]]
    return muteer(next)
  }

  return (
    <Card>
      <h2 className="text-sm font-semibold text-ink-soft uppercase tracking-wide mb-2">Categorieën</h2>
      <p className="text-sm text-ink-soft mb-4">
        Voeg toe, hernoem, verwijder en herschik je eigen categorieën. Stel per categorie een
        standaard glaasgrootte in, zodat een nieuwe drank zinvolle waarden erft.
      </p>
      <div className="space-y-2">
        {cats.map((c, i) => (
          <div key={c} className="flex items-center gap-2">
            <div className="flex flex-col">
              <button className="text-ink-faint hover:text-ink leading-none" onClick={() => verplaats(i, -1)}>
                ▲
              </button>
              <button className="text-ink-faint hover:text-ink leading-none" onClick={() => verplaats(i, 1)}>
                ▼
              </button>
            </div>
            <input
              className="input flex-1"
              defaultValue={c}
              onBlur={(e) => e.target.value && e.target.value !== c && hernoem(c, e.target.value)}
            />
            <div className="w-32">
              <NumberInput
                value={data.standaard_glaasgrootte_per_categorie[c] ?? 25}
                onCommit={(n) =>
                  onSave({
                    standaard_glaasgrootte_per_categorie: {
                      ...data.standaard_glaasgrootte_per_categorie,
                      [c]: n
                    }
                  })
                }
                suffix="cl"
              />
            </div>
            <button
              className="btn-danger"
              onClick={() => muteer(cats.filter((x) => x !== c))}
            >
              ✕
            </button>
          </div>
        ))}
      </div>
      <div className="flex gap-2 mt-4">
        <input
          className="input flex-1"
          placeholder="Nieuwe categorie…"
          value={nieuw}
          onChange={(e) => setNieuw(e.target.value)}
        />
        <button
          className="btn-outline"
          disabled={!nieuw || cats.includes(nieuw)}
          onClick={() => {
            muteer([...cats, nieuw])
            setNieuw('')
          }}
        >
          Toevoegen
        </button>
      </div>
    </Card>
  )
}
