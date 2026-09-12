import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api, body, money } from '../lib/api';
import { errorText } from '../lib/errors';
import { useShop } from '../app/shop-context';
import { ComponentArt } from '../components/ComponentArt';
import { Icon } from '../components/Icon';
import { Loading } from '../components/Feedback';

export function CartPage() {
  const { cart, refreshCart, notify, user, ready } = useShop();
  const [busy, setBusy] = useState<string | null>(null);
  const change = async (id: string, quantity: number) => {
    setBusy(id);
    try {
      await api(`/cart/items/${id}`, {
        method: 'PATCH',
        body: body({ quantity }),
      });
      await refreshCart();
    } catch (error) {
      notify(errorText(error));
    } finally {
      setBusy(null);
    }
  };
  const remove = async (id: string) => {
    setBusy(id);
    try {
      await api(`/cart/items/${id}`, { method: 'DELETE' });
      await refreshCart();
    } catch (error) {
      notify(errorText(error));
    } finally {
      setBusy(null);
    }
  };
  if (!ready) return <Loading />;
  return (
    <div className="container standard-page">
      <div className="page-intro">
        <span className="section-label">Your build list</span>
        <h1>Your cart</h1>
        <p>
          {cart?.itemCount ?? 0} {cart?.itemCount === 1 ? 'component' : 'components'} in your cart
        </p>
      </div>
      {!cart?.items.length ? (
        <div className="empty-state">
          <h2>Your cart is ready for parts.</h2>
          <p>Browse the component shelf and add what your next build needs.</p>
          <Link to="/catalog" className="button orange">
            Browse components <Icon name="arrow" />
          </Link>
        </div>
      ) : (
        <div className="transaction-grid">
          <div className="cart-items">
            {cart.items.map((item) => (
              <article className="cart-item" key={item.id}>
                <Link
                  to={`/products/${item.product.slug}`}
                  className="cart-item-art"
                  aria-label={`View ${item.product.name}`}
                >
                  <ComponentArt
                    kind={
                      item.product.slug.includes('rtx') || item.product.slug.includes('rx-')
                        ? 'gpus'
                        : item.product.slug.includes('nvme')
                          ? 'ssds'
                          : 'cpus'
                    }
                  />
                </Link>
                <div className="cart-item-main">
                  <Link to={`/products/${item.product.slug}`} className="cart-item-name">
                    {item.product.name}
                  </Link>
                  <span className={item.available ? 'in-stock' : 'out-stock'}>
                    {item.available ? 'Available' : 'Currently unavailable'}
                  </span>
                  <button
                    className="text-button remove-button"
                    disabled={busy === item.id}
                    onClick={() => remove(item.id)}
                  >
                    Remove
                  </button>
                </div>
                <div className="cart-item-end">
                  <strong>{money(item.lineTotalCents)}</strong>
                  <div className="quantity-control small">
                    <button
                      aria-label={`Decrease ${item.product.name} quantity`}
                      disabled={busy === item.id || item.quantity <= 1}
                      onClick={() => change(item.id, item.quantity - 1)}
                    >
                      <Icon name="minus" size={15} />
                    </button>
                    <output>{item.quantity}</output>
                    <button
                      aria-label={`Increase ${item.product.name} quantity`}
                      disabled={busy === item.id || item.quantity >= item.maxQuantity}
                      onClick={() => change(item.id, item.quantity + 1)}
                    >
                      <Icon name="plus" size={15} />
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
          <aside className="summary">
            <h2>Order summary</h2>
            <div className="summary-line">
              <span>Subtotal</span>
              <strong>{money(cart.subtotalCents)}</strong>
            </div>
            <p>Shipping details are selected at checkout.</p>
            {cart.unavailableCount > 0 && (
              <p className="warning">Remove unavailable items before checkout.</p>
            )}
            <Link
              to={user ? '/checkout' : '/auth?next=checkout'}
              className={`button orange wide ${cart.unavailableCount > 0 ? 'disabled-link' : ''}`}
              aria-disabled={cart.unavailableCount > 0}
              onClick={(event) => {
                if (cart.unavailableCount > 0) event.preventDefault();
              }}
            >
              Continue to checkout <Icon name="arrow" />
            </Link>
            <Link to="/catalog" className="under-link back-shopping">
              Continue shopping
            </Link>
          </aside>
        </div>
      )}
    </div>
  );
}
