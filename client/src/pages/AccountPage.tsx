import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api, body, money, type Address, type Order, type Page } from '../lib/api';
import { errorText } from '../lib/errors';
import { useShop } from '../app/shop-context';
import { useRequest } from '../hooks/useRequest';
import { AddressForm } from '../components/AddressForm';
import { RequestState } from '../components/Feedback';
import { Icon } from '../components/Icon';

export function AccountPage() {
  const { user, notify, setUser, refreshCart } = useShop();
  const orders = useRequest(() => api<Page<Order>>('/orders?limit=20'), []);
  const addresses = useRequest(() => api<{ data: Address[] }>('/addresses'), []);
  const [showForm, setShowForm] = useState(false);
  const create = async (value: Omit<Address, 'id' | 'isDefault'>) => {
    const result = await api<{ address: Address }>('/addresses', {
      method: 'POST',
      body: body({
        ...value,
        label: value.label ?? undefined,
        line2: value.line2 ?? undefined,
      }),
    });
    addresses.setData({
      data: [...(addresses.data?.data ?? []), result.address],
    });
    setShowForm(false);
    notify('Address saved.');
  };
  const remove = async (id: string) => {
    if (!window.confirm('Remove this address?')) return;
    try {
      await api(`/addresses/${id}`, { method: 'DELETE' });
      const result = await api<{ data: Address[] }>('/addresses');
      addresses.setData(result);
      notify('Address removed.');
    } catch (cause) {
      notify(errorText(cause));
    }
  };
  const logout = async () => {
    try {
      await api('/auth/logout', { method: 'POST' });
      setUser(null);
      await refreshCart();
    } catch (cause) {
      notify(errorText(cause));
    }
  };
  return (
    <div className="container standard-page">
      <div className="page-intro">
        <span className="section-label">Your workspace</span>
        <h1>Account</h1>
        <p>{user?.email}</p>
      </div>
      <div className="account-layout">
        <div>
          <section className="account-section">
            <div className="subsection-head">
              <h2>Orders</h2>
              <span>{orders.data?.meta.total ?? '—'}</span>
            </div>
            <RequestState error={orders.error} loading={orders.loading && !orders.data} />
            {orders.data?.data.length === 0 && (
              <div className="empty-state compact">
                <h3>No orders yet</h3>
                <p>Your completed builds will appear here. Start with the component catalog.</p>
                <Link to="/catalog" className="under-link">
                  Browse components <Icon name="arrow" size={16} />
                </Link>
              </div>
            )}
            {orders.data?.data.map((order) => (
              <Link to={`/orders/${order.id}`} className="order-row" key={order.id}>
                <span>
                  <strong>Order {order.id.slice(0, 8)}</strong>
                  <small>{new Date(order.createdAt).toLocaleDateString()}</small>
                </span>
                <span className="status-label">{order.status}</span>
                <strong>{money(order.totalCents)}</strong>
                <Icon name="arrow" size={17} />
              </Link>
            ))}
          </section>
          <section className="account-section">
            <div className="subsection-head">
              <h2>Delivery addresses</h2>
              <button className="text-button" onClick={() => setShowForm(!showForm)}>
                {showForm ? 'Cancel' : '+ Add address'}
              </button>
            </div>
            <RequestState error={addresses.error} loading={addresses.loading && !addresses.data} />
            {showForm && <AddressForm onSave={create} onCancel={() => setShowForm(false)} />}
            <div className="address-list">
              {addresses.data?.data.map((address) => (
                <div className="address-entry" key={address.id}>
                  <div>
                    <strong>
                      {address.label || address.fullName}
                      {address.isDefault && <span className="default-tag">Default</span>}
                    </strong>
                    <p>
                      {address.fullName}
                      <br />
                      {address.line1}
                      {address.line2 && `, ${address.line2}`}
                      <br />
                      {address.city}, {address.postalCode}, {address.country}
                    </p>
                  </div>
                  <button className="text-button" onClick={() => remove(address.id)}>
                    Remove
                  </button>
                </div>
              ))}
            </div>
            {addresses.data?.data.length === 0 && !showForm && (
              <p className="muted">No saved addresses. Add one for a faster checkout.</p>
            )}
          </section>
        </div>
        <aside className="account-aside">
          <div className="aside-label">Account details</div>
          <strong>{user?.email}</strong>
          <span>Member account</span>
          {user?.role === 'admin' && (
            <Link to="/admin" className="under-link">
              Open admin workspace <Icon name="arrow" size={16} />
            </Link>
          )}
          <button className="text-button" onClick={logout}>
            Sign out
          </button>
        </aside>
      </div>
    </div>
  );
}
