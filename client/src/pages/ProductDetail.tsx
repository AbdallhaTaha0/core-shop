import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, body, money, type Product } from '../lib/api';
import { errorText } from '../lib/errors';
import { useShop } from '../app/shop-context';
import { useRequest } from '../hooks/useRequest';
import { ProductVisual } from '../components/ProductVisual';
import { RequestState } from '../components/Feedback';
import { Icon } from '../components/Icon';

export function ProductDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { refreshCart, notify } = useShop();
  const product = useRequest(() => api<{ product: Product }>(`/products/${slug}`), [slug]);
  const [quantity, setQuantity] = useState(1);
  const [busy, setBusy] = useState(false);
  const add = async () => {
    if (!product.data) return;
    setBusy(true);
    try {
      await api('/cart/items', {
        method: 'POST',
        body: body({ productId: product.data.product.id, quantity }),
      });
      await refreshCart();
      notify(`${product.data.product.name} added to cart.`);
    } catch (error) {
      notify(errorText(error));
    } finally {
      setBusy(false);
    }
  };
  if (!product.data)
    return (
      <div className="container">
        <RequestState error={product.error} loading={product.loading} />
      </div>
    );
  const item = product.data.product;
  return (
    <div className="container detail-page">
      <div className="breadcrumbs">
        <Link to="/catalog">Components</Link>
        <span>/</span>
        <Link to={`/catalog?category=${item.category.slug}`}>{item.category.name}</Link>
        <span>/</span>
        <span>{item.name}</span>
      </div>
      <div className="detail-grid">
        <div className="detail-visual">
          <div className="detail-visual-label">
            <span>
              {item.category.name} / {item.brand.name}
            </span>
            <span>CS / PRODUCT</span>
          </div>
          <ProductVisual
            imageUrl={item.images[0]?.url}
            altText={item.images[0]?.altText}
            name={item.name}
            categorySlug={item.category.slug}
            large
          />
          <div className="detail-visual-foot">
            ENGINEERED FOR THE NEXT BUILD <span>↗</span>
          </div>
        </div>
        <div className="detail-info">
          <span className="section-label">
            {item.brand.name} / {item.category.name}
          </span>
          <h1>{item.name}</h1>
          <p className="detail-description">
            {item.description || 'A component for your next build.'}
          </p>
          <div className="detail-specs">
            <div>
              <span>Availability</span>
              <strong className={item.stock ? 'in-stock' : 'out-stock'}>
                {item.stock ? `${item.stock} in stock` : 'Out of stock'}
              </strong>
            </div>
            <div>
              <span>Category</span>
              <strong>{item.category.name}</strong>
            </div>
            <div>
              <span>Brand</span>
              <strong>{item.brand.name}</strong>
            </div>
          </div>
          <div className="purchase-panel">
            <div className="purchase-price">
              <span>Price</span>
              <strong>{money(item.priceCents)}</strong>
            </div>
            <div className="purchase-actions">
              <div className="quantity-control" aria-label="Quantity">
                <button
                  aria-label="Decrease quantity"
                  disabled={quantity <= 1}
                  onClick={() => setQuantity(quantity - 1)}
                >
                  <Icon name="minus" size={17} />
                </button>
                <output>{quantity}</output>
                <button
                  aria-label="Increase quantity"
                  disabled={quantity >= item.stock}
                  onClick={() => setQuantity(quantity + 1)}
                >
                  <Icon name="plus" size={17} />
                </button>
              </div>
              <button className="button orange" disabled={!item.stock || busy} onClick={add}>
                {busy ? 'Adding…' : item.stock ? 'Add to cart' : 'Unavailable'}{' '}
                <Icon name="arrow" />
              </button>
            </div>
            <button className="text-button cart-shortcut" onClick={() => navigate('/cart')}>
              View your cart <Icon name="arrow" size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
