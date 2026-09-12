import { useState } from 'react';
import { api, body, money, type Order, type Page } from '../../lib/api';
import { errorText } from '../../lib/errors';
import { useShop } from '../../app/shop-context';
import { useRequest } from '../../hooks/useRequest';
import { RequestState } from '../../components/Feedback';

const nextStatus: Record<string, string[]> = {
  pending: ['paid', 'cancelled'],
  paid: ['processing', 'cancelled'],
  processing: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: [],
  cancelled: [],
};

export function AdminOrders() {
  const { notify } = useShop();
  const [revision, setRevision] = useState(0);
  const orders = useRequest(() => api<Page<Order>>('/admin/orders?limit=100'), [revision]);
  const changeStatus = async (order: Order, status: string) => {
    try {
      await api(`/admin/orders/${order.id}`, {
        method: 'PATCH',
        body: body({ status }),
      });
      setRevision((value) => value + 1);
      notify('Order status updated.');
    } catch (cause) {
      notify(errorText(cause));
    }
  };
  return (
    <section>
      <div className="subsection-head">
        <h2>Orders</h2>
        <span>{orders.data?.meta.total ?? '—'}</span>
      </div>
      <RequestState error={orders.error} loading={orders.loading && !orders.data} />
      <div className="admin-table-wrap">
        <table>
          <thead>
            <tr>
              <th>Order</th>
              <th>Date</th>
              <th>Total</th>
              <th>Status</th>
              <th>Move to</th>
            </tr>
          </thead>
          <tbody>
            {orders.data?.data.map((order) => (
              <tr key={order.id}>
                <td>{order.id.slice(0, 8)}</td>
                <td>{new Date(order.createdAt).toLocaleDateString()}</td>
                <td>{money(order.totalCents)}</td>
                <td>{order.status}</td>
                <td>
                  <select
                    aria-label={`Change status for order ${order.id.slice(0, 8)}`}
                    value=""
                    disabled={!nextStatus[order.status]?.length}
                    onChange={(event) => changeStatus(order, event.target.value)}
                  >
                    <option value="">Choose status</option>
                    {(nextStatus[order.status] ?? []).map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
