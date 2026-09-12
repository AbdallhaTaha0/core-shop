import { useState, type FormEvent } from 'react';
import { api, body, type Brand, type Category } from '../../lib/api';
import { errorText } from '../../lib/errors';
import { useShop } from '../../app/shop-context';
import { useRequest } from '../../hooks/useRequest';
import { RequestState } from '../../components/Feedback';

type Kind = 'categories' | 'brands';
type Entry = Category | Brand;

function TaxonomyList({ kind }: { kind: Kind }) {
  const { notify } = useShop();
  const [revision, setRevision] = useState(0);
  const [editing, setEditing] = useState<Entry | 'new' | null>(null);
  const [name, setName] = useState('');
  const entries = useRequest(() => api<{ data: Entry[] }>(`/${kind}`), [kind, revision]);
  const begin = (entry?: Entry) => {
    setEditing(entry ?? 'new');
    setName(entry?.name ?? '');
  };
  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!editing) return;
    try {
      await api(editing === 'new' ? `/admin/${kind}` : `/admin/${kind}/${editing.id}`, {
        method: editing === 'new' ? 'POST' : 'PATCH',
        body: body({ name: name.trim() }),
      });
      setEditing(null);
      setRevision((value) => value + 1);
      notify(`${kind === 'brands' ? 'Brand' : 'Category'} saved.`);
    } catch (cause) {
      notify(errorText(cause));
    }
  };
  const remove = async (entry: Entry) => {
    if (!window.confirm(`Delete ${entry.name}? This cannot be undone.`)) return;
    try {
      await api(`/admin/${kind}/${entry.id}`, { method: 'DELETE' });
      setRevision((value) => value + 1);
      notify(`${kind === 'brands' ? 'Brand' : 'Category'} deleted.`);
    } catch (cause) {
      notify(errorText(cause));
    }
  };
  return (
    <section className="taxonomy-section">
      <div className="subsection-head">
        <h2>{kind === 'brands' ? 'Brands' : 'Categories'}</h2>
        <button className="text-button" onClick={() => begin()}>
          + Add {kind === 'brands' ? 'brand' : 'category'}
        </button>
      </div>
      {editing && (
        <form className="taxonomy-form" onSubmit={save}>
          <label>
            {kind === 'brands' ? 'Brand' : 'Category'} name
            <input
              required
              maxLength={120}
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          <button className="button orange" type="submit">
            Save
          </button>
          <button className="button quiet" type="button" onClick={() => setEditing(null)}>
            Cancel
          </button>
        </form>
      )}
      <RequestState error={entries.error} loading={entries.loading && !entries.data} />
      {entries.data?.data.map((entry) => (
        <div className="taxonomy-row" key={entry.id}>
          <span>
            <strong>{entry.name}</strong>
            <small>{entry.slug}</small>
          </span>
          <div className="table-actions">
            <button className="text-button" onClick={() => begin(entry)}>
              Rename
            </button>
            <button className="text-button danger" onClick={() => remove(entry)}>
              Delete
            </button>
          </div>
        </div>
      ))}
    </section>
  );
}

export function AdminTaxonomy() {
  return (
    <div className="taxonomy-grid">
      <TaxonomyList kind="categories" />
      <TaxonomyList kind="brands" />
    </div>
  );
}
