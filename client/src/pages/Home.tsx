import { Link } from 'react-router-dom';
import { api, money, type Category, type Page, type Product } from '../lib/api';
import { useRequest } from '../hooks/useRequest';
import { ProductVisual } from '../components/ProductVisual';
import { ProductTile } from '../components/ProductTile';
import { RequestState } from '../components/Feedback';
import { Icon } from '../components/Icon';

export function Home() {
  const products = useRequest(() => api<Page<Product>>('/products?limit=8'), []);
  const categories = useRequest(() => api<{ data: Category[] }>('/categories'), []);
  const featured = products.data?.data.find((item) => item.stock > 0) ?? products.data?.data[0];
  return (
    <>
      <section className="hero">
        <div className="container hero-inner">
          <div className="hero-copy">
            <div className="hero-kicker">
              <span className="signal-dot" /> The component store for deliberate builds
            </div>
            <h1>
              Build beyond
              <br />
              <em>the expected.</em>
            </h1>
            <p>
              Processors, graphics, and storage selected for the systems you want to make. Find your
              next essential component.
            </p>
            <Link to="/catalog" className="button orange">
              Explore components <Icon name="arrow" />
            </Link>
            <div className="hero-note">
              <span>PARTS / PURPOSE / PERFORMANCE</span>
              <span>EST. FOR THE NEXT BUILD</span>
            </div>
          </div>
          <div className="hero-visual">
            <div className="hero-topline">
              <span>Workbench / Featured component</span>
              <span>CS—001</span>
            </div>
            <ProductVisual
              imageUrl={featured?.images[0]?.url}
              altText={featured?.images[0]?.altText}
              name={featured?.name ?? 'Featured component'}
              categorySlug={featured?.category.slug}
              large
            />
            <div className="hero-product">
              {featured ? (
                <>
                  <div>
                    <span>Featured component</span>
                    <Link to={`/products/${featured.slug}`}>{featured.name}</Link>
                  </div>
                  <strong>{money(featured.priceCents)}</strong>
                </>
              ) : (
                <span>Live catalog loading…</span>
              )}
            </div>
          </div>
        </div>
      </section>
      <section className="category-section container">
        <div className="section-heading">
          <div>
            <span className="section-label">Find your starting point</span>
            <h2>Shop by component</h2>
          </div>
          <Link to="/catalog" className="under-link">
            View all components <Icon name="arrow" size={17} />
          </Link>
        </div>
        <div className="category-list">
          {(categories.data?.data ?? []).map((category, index) => (
            <Link
              to={`/catalog?category=${category.slug}`}
              className="category-row"
              key={category.id}
            >
              <span className="category-num">{String(index + 1).padStart(2, '0')}</span>
              <strong>{category.name}</strong>
              <span className="category-description">{category.description}</span>
              <Icon name="arrow" />
            </Link>
          ))}
        </div>
        <RequestState error={categories.error} loading={categories.loading && !categories.data} />
      </section>
      <section className="featured-section container">
        <div className="section-heading">
          <div>
            <span className="section-label">On the bench</span>
            <h2>Available components</h2>
          </div>
          <Link to="/catalog" className="under-link">
            Browse the catalog <Icon name="arrow" size={17} />
          </Link>
        </div>
        <div className="product-grid">
          {products.data?.data.slice(0, 4).map((product, index) => (
            <ProductTile key={product.id} product={product} index={index} />
          ))}
        </div>
        <RequestState error={products.error} loading={products.loading && !products.data} />
      </section>
      <section className="closing-band">
        <div className="container closing-inner">
          <span>THE RIGHT PART CHANGES EVERYTHING.</span>
          <Link to="/catalog">
            Find yours <Icon name="arrow" />
          </Link>
        </div>
      </section>
    </>
  );
}
