import { useEffect, useState } from 'react'
import PageHeader from '../../components/layout/PageHeader.jsx'
import Panel from '../../components/ui/Panel.jsx'
import Icon from '../../components/ui/Icon.jsx'
import MaterialRow from '../../components/materials/MaterialRow.jsx'
import { useAuth } from '../../context/useAuth.js'
import { api } from '../../services/api.js'
import { groupBySubject } from '../../utils/materials.js'

export default function MaterialsPage() {
  const { token } = useAuth()
  const [items, setItems] = useState(null)
  const [subject, setSubject] = useState('all')
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    api('/materials', { token })
      .then(setItems)
      .catch((err) => setError(err.message))
  }, [token])

  const groups = groupBySubject(items ?? [])
  const text = search.trim().toLowerCase()
  const shown = groups
    .filter(([name]) => subject === 'all' || name === subject)
    .map(([name, list]) => [
      name,
      text ? list.filter((m) => `${m.title} ${m.note ?? ''}`.toLowerCase().includes(text)) : list,
    ])
    .filter(([, list]) => list.length > 0)

  return (
    <>
      <PageHeader
        kicker="Study material"
        title="Study material"
        subtitle="Notes and PDFs shared with your batch, sorted by subject."
        stats={[
          { label: 'Subjects', value: items ? groups.length : '...', note: 'with material' },
          { label: 'Files', value: items ? items.length : '...', note: 'shared so far' },
        ]}
      />

      {error && (
        <p className="login__error" role="alert">
          {error}
        </p>
      )}

      <Panel>
        <div className="material-tools">
          <div className="chips" role="group" aria-label="Subject">
            <button
              type="button"
              className={`chip ${subject === 'all' ? 'is-active' : ''}`}
              onClick={() => setSubject('all')}
              aria-pressed={subject === 'all'}
            >
              All <span>{items?.length ?? 0}</span>
            </button>
            {groups.map(([name, list]) => (
              <button
                key={name}
                type="button"
                className={`chip ${subject === name ? 'is-active' : ''}`}
                onClick={() => setSubject(name)}
                aria-pressed={subject === name}
              >
                {name} <span>{list.length}</span>
              </button>
            ))}
          </div>
          <label className="search search--light">
            <Icon name="search" size={18} />
            <span className="sr-only">Search material</span>
            <input type="search" placeholder="Search titles" value={search} onChange={(e) => setSearch(e.target.value)} />
          </label>
        </div>

        {items && items.length === 0 && <p className="empty-note">Nothing shared with your batch yet.</p>}
        {items && items.length > 0 && shown.length === 0 && <p className="empty-note">No files match that search.</p>}

        {shown.map(([name, list]) => (
          <section key={name} className="material-group">
            <h2 className="material-group__title">
              {name} <span>{list.length}</span>
            </h2>
            {list.map((item) => (
              <MaterialRow key={item._id} item={item} />
            ))}
          </section>
        ))}
      </Panel>
    </>
  )
}
