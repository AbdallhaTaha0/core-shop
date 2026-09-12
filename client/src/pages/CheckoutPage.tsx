import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, body, money, type Address, type Order } from '../lib/api';
import { errorText } from '../lib/errors';
import { useShop } from '../app/shop-context';
import { useRequest } from '../hooks/useRequest';
import { AddressForm } from '../components/AddressForm';
import { RequestState } from '../components/Feedback';
import { Icon } from '../components/Icon';

export function CheckoutPage() {
  const { cart, refreshCart, notify } = useShop();
  const navigate = useNavigate();
  const addresses = useRequest(() => api<{ data: Address[] }>('/addresses'), []);
  const [selected, setSelected] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    if (addresses.data && !selected)
      setSelected(
        addresses.data.data.find((item) => item.isDefault)?.id ?? addresses.data.data[0]?.id ?? '',
      );
  }, [addresses.data, selected]);
  const create = async (value: Omit<Address, 'id' | 'isDefault'>) => {
    const result = await api<{ address: Address }>('/addresses', {
      method: 'POST',
      body: body({
        ...value,
        label: value.label ?? undefined,
        line2: value.line2 ?? undefined,
        isDefault: true,
      }),
    });
    addresses.setData({
      data: [...(addresses.data?.data ?? []), result.address],
    });
    setSelected(result.address.id);
    setShowForm(false);
    notify('Address saved.');
  };
  const place = async () => {
    setError('');
    setBusy(true);
    try {
      const result = await api<{ order: Order }>('/checkout', {
        method: 'POST',
        body: body(selected ? { addressId: selected } : {}),
      });
      await refreshCart();
      navigate(`/orders/${result.order.id}`, { state: { placed: true } });
    } catch (cause) {
      setError(errorText(cause));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="container standard-page">
      <div className="page-intro">
        <span className="section-label">Final assembly</span>
        <h1>Checkout</h1>
        <p>Review your parts and where they are going.</p>
      </div>
      {!cart?.items.length ? (
        <div className="empty-state">
          <h2>Your cart is empty.</h2>
          <p>Add components before checking out.</p>
          <Link className="button orange" to="/catalog">
            Browse components
          </Link>
        </div>
      ) : (
        <div className="transaction-grid">
          <div className="checkout-main">
            <section>
              <div className="subsection-head">
                <h2>Delivery address</h2>
                <span>01</span>
              </div>
              <RequestState
                error={addresses.error}
                loading={addresses.loading && !addresses.data}
              />
              {addresses.data?.data.map((address) => (
                <label
                  className={`address-choice ${selected === address.id ? 'selected' : ''}`}
                  key={address.id}
                >
                  <input
                    type="radio"
                    name="address"
                    checked={selected === address.id}
                    onChange={() => setSelected(address.id)}
                  />
                  <span>
                    <strong>
                      {address.label || address.fullName}
                      {address.isDefault ? ' · Default' : ''}
                    </strong>
                    <small>
                      {address.fullName}, {address.line1}, {address.city}, {address.postalCode},{' '}
                      {address.country}
                    </small>
                  </span>
                </label>
              ))}
              {!showForm ? (
                <button className="add-address" onClick={() => setShowForm(true)}>
                  + Add a delivery address
                </button>
              ) : (
                <AddressForm onSave={create} onCancel={() => setShowForm(false)} />
              )}
            </section>
            <section>
              <div className="subsection-head">
                <h2>Parts in this order</h2>
                <span>02</span>
              </div>
              {cart.items.map((item) => (
                <div className="checkout-line" key={item.id}>
                  <span>
                    {item.quantity} × {item.product.name}
                  </span>
                  <strong>{money(item.lineTotalCents)}</strong>
                </div>
              ))}
            </section>
          </div>
          <aside className="summary">
            <h2>Order total</h2>
            <div className="summary-line">
              <span>Subtotal</span>
              <strong>{money(cart.subtotalCents)}</strong>
            </div>
            <div className="summary-line total">
              <span>Total</span>
              <strong>{money(cart.subtotalCents)}</strong>
            </div>
            <p>Payment uses a demo provider. No real card details are collected.</p>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <button
              className="button orange wide"
              disabled={busy || !selected || cart.unavailableCount > 0}
              onClick={place}
            >
              {busy ? 'Placing order…' : 'Place order'} <Icon name="arrow" />
            </button>
            {!selected && <p>Add a delivery address to place the order.</p>}
          </aside>
        </div>
      )}
    </div>
  );
}
