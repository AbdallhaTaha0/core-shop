import { useState, type FormEvent } from 'react';
import {
  api,
  body,
  money,
  type Brand,
  type Category,
  type Page,
  type Product,
} from '../../lib/api';
import { errorText } from '../../lib/errors';
import { useShop } from '../../app/shop-context';
import { useRequest } from '../../hooks/useRequest';
import { RequestState } from '../../components/Feedback';

type Draft = {
  name: string;
  description: string;
  price: string;
  stock: string;
  categoryId: string;
  brandId: string;
  isActive: boolean;
  imageUrl: string;
};
const blank: Draft = {
  name: '',
  description: '',
  price: '',
  stock: '0',
  categoryId: '',
  brandId: '',
  isActive: true,
  imageUrl: '',
};

export function AdminProducts() {
  const { notify } = useShop();
  const [revision, setRevision] = useState(0);
  const [editing, setEditing] = useState<Product | 'new' | null>(null);
  const [draft, setDraft] = useState<Draft>(blank);
  const [busy, setBusy] = useState(false);
  const products = useRequest(
    () => api<Page<Product>>('/admin/products?limit=100&includeInactive=true'),
    [revision],
  );
  const categories = useRequest(() => api<{ data: Category[] }>('/categories'), []);
  const brands = useRequest(() => api<{ data: Brand[] }>('/brands'), []);
  const begin = (product?: Product) => {
    setEditing(product ?? 'new');
    setDraft(
      product
        ? {
            name: product.name,
            description: product.description ?? '',
            price: String(product.priceCents / 100),
            stock: String(product.stock),
            categoryId: product.category.id,
            brandId: product.brand.id,
            isActive: product.isActive,
            imageUrl: product.images[0]?.url ?? '',
          }
        : {
            ...blank,
            categoryId: categories.data?.data[0]?.id ?? '',
            brandId: brands.data?.data[0]?.id ?? '',
          },
    );
  };
  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!editing) return;
    const priceCents = Math.round(Number(draft.price) * 100);
    if (!Number.isSafeInteger(priceCents) || priceCents < 0) {
      notify('Enter a valid price.');
      return;
    }
    setBusy(true);
    const imageUrl = draft.imageUrl.trim();
    const images = imageUrl ? [{ url: imageUrl, altText: draft.name.trim() }] : [];
    const updateImages = editing === 'new' || imageUrl !== (editing.images[0]?.url ?? '');
    const payload = {
      name: draft.name.trim(),
      description: draft.description,
      priceCents,
      stock: Number(draft.stock),
      categoryId: draft.categoryId,
      brandId: draft.brandId,
      isActive: draft.isActive,
      ...(updateImages ? { images } : {}),
    };
    try {
      await api(editing === 'new' ? '/admin/products' : `/admin/products/${editing.id}`, {
        method: editing === 'new' ? 'POST' : 'PATCH',
        body: body(payload),
      });
      setEditing(null);
      setRevision((value) => value + 1);
      notify(editing === 'new' ? 'Product created.' : 'Product updated.');
    } catch (cause) {
      notify(errorText(cause));
    } finally {
      setBusy(false);
    }
  };
  const remove = async (product: Product) => {
    if (!window.confirm(`Delete ${product.name}? This cannot be undone.`)) return;
    try {
      await api(`/admin/products/${product.id}`, { method: 'DELETE' });
      setRevision((value) => value + 1);
      notify('Product deleted.');
    } catch (cause) {
      notify(errorText(cause));
    }
  };
  return (
    <section>
      <div className="subsection-head">
        <h2>Products</h2>
        <button className="button orange" onClick={() => begin()}>
          Add product
        </button>
      </div>
      {editing && (
        <form className="admin-editor" onSubmit={save}>
          <h3>{editing === 'new' ? 'New product' : `Edit ${editing.name}`}</h3>
          <div className="admin-form-grid">
            <label>
              Name
              <input
                required
                maxLength={200}
                value={draft.name}
                onChange={(event) => setDraft({ ...draft, name: event.target.value })}
              />
            </label>
            <label>
              Price (USD)
              <input
                required
                type="number"
                min="0"
                step="0.01"
                value={draft.price}
                onChange={(event) => setDraft({ ...draft, price: event.target.value })}
              />
            </label>
            <label>
              Stock
              <input
                required
                type="number"
                min="0"
                step="1"
                value={draft.stock}
                onChange={(event) => setDraft({ ...draft, stock: event.target.value })}
              />
            </label>
            <label>
              Category
              <select
                required
                value={draft.categoryId}
                onChange={(event) => setDraft({ ...draft, categoryId: event.target.value })}
              >
                <option value="">Select category</option>
                {categories.data?.data.map((item) => (
                  <option value={item.id} key={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Brand
              <select
                required
                value={draft.brandId}
                onChange={(event) => setDraft({ ...draft, brandId: event.target.value })}
              >
                <option value="">Select brand</option>
                {brands.data?.data.map((item) => (
                  <option value={item.id} key={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Image URL (optional)
              <input
                type="url"
                value={draft.imageUrl}
                onChange={(event) => setDraft({ ...draft, imageUrl: event.target.value })}
              />
            </label>
          </div>
          <label>
            Description
            <textarea
              rows={3}
              maxLength={5000}
              value={draft.description}
              onChange={(event) => setDraft({ ...draft, description: event.target.value })}
            />
          </label>
          <label className="check-label">
            <input
              type="checkbox"
              checked={draft.isActive}
              onChange={(event) => setDraft({ ...draft, isActive: event.target.checked })}
            />{' '}
            Active in catalog
          </label>
          <div className="form-actions">
            <button
              className="button orange"
              disabled={busy || !draft.categoryId || !draft.brandId}
              type="submit"
            >
              {busy ? 'Saving…' : 'Save product'}
            </button>
            <button type="button" className="button quiet" onClick={() => setEditing(null)}>
              Cancel
            </button>
          </div>
        </form>
      )}
      <RequestState error={products.error} loading={products.loading && !products.data} />
      <div className="admin-table-wrap">
        <table>
          <thead>
            <tr>
              <th>Product</th>
              <th>Price</th>
              <th>Stock</th>
              <th>State</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.data?.data.map((product) => (
              <tr key={product.id}>
                <td>
                  {product.name}
                  <small>
                    {product.category.name} / {product.brand.name}
                  </small>
                </td>
                <td>{money(product.priceCents)}</td>
                <td>{product.stock}</td>
                <td>{product.isActive ? 'Active' : 'Inactive'}</td>
                <td>
                  <div className="table-actions">
                    <button className="text-button" onClick={() => begin(product)}>
                      Edit
                    </button>
                    <button className="text-button danger" onClick={() => remove(product)}>
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
