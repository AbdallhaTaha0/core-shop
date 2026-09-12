import { useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api, type Brand, type Category, type Page, type Product } from '../lib/api';
import { useRequest } from '../hooks/useRequest';
import { ProductTile } from '../components/ProductTile';
import { RequestState } from '../components/Feedback';
import { Icon } from '../components/Icon';

export function Catalog() {
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState(params.get('q') ?? '');
  const query = params.toString();
  const products = useRequest(
    () =>
      api<Page<Product>>(
        `/products?${new URLSearchParams({ limit: '12', ...Object.fromEntries(params) })}`,
      ),
    [query],
  );
  const categories = useRequest(() => api<{ data: Category[] }>('/categories'), []);
  const brands = useRequest(() => api<{ data: Brand[] }>('/brands'), []);
  const update = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    value ? next.set(key, value) : next.delete(key);
    if (key !== 'page') next.delete('page');
    setParams(next);
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    update('q', search.trim());
  };
  return (
    <div className="container catalog-page">
      <div className="page-intro">
        <span className="section-label">The parts shelf</span>
        <h1>Components</h1>
        <p>Find the right pieces for your next system.</p>
      </div>
      <div className="catalog-toolbar">
        <form className="search-box" onSubmit={submit}>
          <label className="sr-only" htmlFor="product-search">
            Search components
          </label>
          <Icon name="search" />
          <input
            id="product-search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search components"
          />
          <button type="submit">Search</button>
        </form>
        <label className="sort-control">
          Sort{' '}
          <select
            value={params.get('sort') ?? 'newest'}
            onChange={(event) => update('sort', event.target.value)}
          >
            <option value="newest">Newest</option>
            <option value="price_asc">Price: low to high</option>
            <option value="price_desc">Price: high to low</option>
            <option value="name_asc">Name: A to Z</option>
          </select>
        </label>
      </div>
      <div className="catalog-layout">
        <aside className="filters" aria-label="Product filters">
          <div className="filters-heading">
            <strong>Refine results</strong>
            <button
              className="text-button"
              onClick={() => {
                setParams({});
                setSearch('');
              }}
            >
              Clear all
            </button>
          </div>
          <fieldset>
            <legend>Component</legend>
            <label className="filter-choice">
              <input
                type="radio"
                name="category"
                checked={!params.get('category')}
                onChange={() => update('category', '')}
              />{' '}
              All components
            </label>
            {categories.data?.data.map((category) => (
              <label className="filter-choice" key={category.id}>
                <input
                  type="radio"
                  name="category"
                  checked={params.get('category') === category.slug}
                  onChange={() => update('category', category.slug)}
                />{' '}
                {category.name}
              </label>
            ))}
          </fieldset>
          <fieldset>
            <legend>Brand</legend>
            <label className="filter-choice">
              <input
                type="radio"
                name="brand"
                checked={!params.get('brand')}
                onChange={() => update('brand', '')}
              />{' '}
              All brands
            </label>
            {brands.data?.data.map((brand) => (
              <label className="filter-choice" key={brand.id}>
                <input
                  type="radio"
                  name="brand"
                  checked={params.get('brand') === brand.slug}
                  onChange={() => update('brand', brand.slug)}
                />{' '}
                {brand.name}
              </label>
            ))}
          </fieldset>
          <label className="filter-choice stock-filter">
            <input
              type="checkbox"
              checked={params.get('inStock') === 'true'}
              onChange={(event) => update('inStock', event.target.checked ? 'true' : '')}
            />{' '}
            In stock only
          </label>
        </aside>
        <div className="catalog-results">
          <div className="results-line">
            <span>
              {products.data ? `${products.data.meta.total} components` : 'Loading components'}
            </span>
            <span>{params.get('category') || 'All categories'}</span>
          </div>
          <RequestState error={products.error} loading={products.loading && !products.data} />
          {products.data?.data.length === 0 && (
            <div className="empty-state">
              <h2>No components found</h2>
              <p>Try a different search or clear a filter to see more parts.</p>
              <button
                className="button outline"
                onClick={() => {
                  setParams({});
                  setSearch('');
                }}
              >
                Clear filters
              </button>
            </div>
          )}
          <div className="product-grid catalog-grid">
            {products.data?.data.map((product, index) => (
              <ProductTile key={product.id} product={product} index={index} />
            ))}
          </div>
          {products.data && products.data.meta.totalPages > 1 && (
            <div className="pagination">
              <button
                disabled={products.data.meta.page <= 1}
                onClick={() => update('page', String(products.data!.meta.page - 1))}
              >
                Previous
              </button>
              <span>
                Page {products.data.meta.page} of {products.data.meta.totalPages}
              </span>
              <button
                disabled={products.data.meta.page >= products.data.meta.totalPages}
                onClick={() => update('page', String(products.data!.meta.page + 1))}
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
