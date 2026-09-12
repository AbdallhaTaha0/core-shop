import { Link, useParams } from 'react-router-dom';
import { api, money, type Order } from '../lib/api';
import { useRequest } from '../hooks/useRequest';
import { RequestState } from '../components/Feedback';

export function OrderDetail() {
  const { id } = useParams();
  const order = useRequest(() => api<{ order: Order }>(`/orders/${id}`), [id]);
  if (!order.data)
    return (
      <div className="container">
        <RequestState error={order.error} loading={order.loading} />
      </div>
    );
  const item = order.data.order;
  return (
    <div className="container standard-page">
      <div className="breadcrumbs">
        <Link to="/account">Account</Link>
        <span>/</span>
        <span>Order {item.id.slice(0, 8)}</span>
      </div>
      <div className="page-intro">
        <span className="section-label">Order confirmed</span>
        <h1>Order {item.id.slice(0, 8)}</h1>
        <p>
          Placed {new Date(item.createdAt).toLocaleDateString()} · {item.status}
        </p>
      </div>
      <div className="transaction-grid">
        <div>
          <div className="subsection-head">
            <h2>Components</h2>
            <span>{item.items.length}</span>
          </div>
          {item.items.map((line) => (
            <div className="checkout-line" key={line.id}>
              <span>
                {line.quantity} ×{' '}
                <Link to={`/products/${line.product.slug}`}>{line.product.name}</Link>
              </span>
              <strong>{money(line.lineTotalCents)}</strong>
            </div>
          ))}
        </div>
        <aside className="summary">
          <h2>Order details</h2>
          <div className="summary-line total">
            <span>Total</span>
            <strong>{money(item.totalCents)}</strong>
          </div>
          <p>
            Status: <strong>{item.status}</strong>
          </p>
          {item.shipping && (
            <p>
              Deliver to:
              <br />
              {item.shipping.fullName}
              <br />
              {item.shipping.line1}
              <br />
              {item.shipping.city}, {item.shipping.postalCode}
              <br />
              {item.shipping.country}
            </p>
          )}
          <Link className="under-link" to="/account">
            Back to account
          </Link>
        </aside>
      </div>
    </div>
  );
}
