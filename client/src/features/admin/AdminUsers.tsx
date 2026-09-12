import { useState } from 'react';
import { api, body, type Page, type User } from '../../lib/api';
import { errorText } from '../../lib/errors';
import { useShop } from '../../app/shop-context';
import { useRequest } from '../../hooks/useRequest';
import { RequestState } from '../../components/Feedback';

export function AdminUsers() {
  const { notify, user: currentUser } = useShop();
  const [revision, setRevision] = useState(0);
  const users = useRequest(() => api<Page<User>>('/admin/users?limit=100'), [revision]);
  const updateRole = async (user: User, role: User['role']) => {
    if (!window.confirm(`Change ${user.email} to ${role}?`)) return;
    try {
      await api(`/admin/users/${user.id}`, {
        method: 'PATCH',
        body: body({ role }),
      });
      setRevision((value) => value + 1);
      notify('User role updated. They need to sign in again for the change to take effect.');
    } catch (cause) {
      notify(errorText(cause));
    }
  };
  return (
    <section>
      <div className="subsection-head">
        <h2>Users</h2>
        <span>{users.data?.meta.total ?? '—'}</span>
      </div>
      <RequestState error={users.error} loading={users.loading && !users.data} />
      <div className="admin-table-wrap">
        <table>
          <thead>
            <tr>
              <th>Email</th>
              <th>Role</th>
              <th>Change role</th>
            </tr>
          </thead>
          <tbody>
            {users.data?.data.map((user) => (
              <tr key={user.id}>
                <td>{user.email}</td>
                <td>{user.role}</td>
                <td>
                  <select
                    aria-label={`Change role for ${user.email}`}
                    value={user.role}
                    disabled={user.id === currentUser?.id}
                    onChange={(event) => updateRole(user, event.target.value as User['role'])}
                  >
                    <option value="customer">Customer</option>
                    <option value="admin">Admin</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="muted admin-hint">
        You cannot change your own role. Role changes apply when the user signs in again.
      </p>
    </section>
  );
}
