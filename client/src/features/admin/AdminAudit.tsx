import { api, type Page } from '../../lib/api';
import { useRequest } from '../../hooks/useRequest';
import { RequestState } from '../../components/Feedback';

type AuditEntry = {
  id: string;
  action: string;
  entityType: string | null;
  entityId: string | null;
  actorUserId: string | null;
  createdAt: string;
};

export function AdminAudit() {
  const logs = useRequest(() => api<Page<AuditEntry>>('/admin/audit-logs?limit=100'), []);
  return (
    <section>
      <div className="subsection-head">
        <h2>Audit log</h2>
        <span>{logs.data?.meta.total ?? '—'}</span>
      </div>
      <RequestState error={logs.error} loading={logs.loading && !logs.data} />
      <div className="admin-table-wrap">
        <table>
          <thead>
            <tr>
              <th>Time</th>
              <th>Action</th>
              <th>Entity</th>
              <th>Actor</th>
            </tr>
          </thead>
          <tbody>
            {logs.data?.data.map((log) => (
              <tr key={log.id}>
                <td>{new Date(log.createdAt).toLocaleString()}</td>
                <td>{log.action}</td>
                <td>
                  {log.entityType ? `${log.entityType} ${log.entityId?.slice(0, 8) ?? ''}` : '—'}
                </td>
                <td>{log.actorUserId?.slice(0, 8) ?? 'System'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
