import { useState } from 'react';
import { AdminProducts } from '../features/admin/AdminProducts';
import { AdminOrders } from '../features/admin/AdminOrders';
import { AdminUsers } from '../features/admin/AdminUsers';
import { AdminTaxonomy } from '../features/admin/AdminTaxonomy';
import { AdminAudit } from '../features/admin/AdminAudit';

const sections = ['Products', 'Orders', 'Users', 'Categories & brands', 'Audit log'] as const;
type Section = (typeof sections)[number];

export function AdminPage() {
  const [section, setSection] = useState<Section>('Products');
  return (
    <div className="container standard-page admin-page">
      <div className="page-intro">
        <span className="section-label">Core Shop / Operations</span>
        <h1>Admin workspace</h1>
        <p>Manage the catalog, orders, and customers.</p>
      </div>
      <nav className="admin-tabs" aria-label="Admin sections">
        {sections.map((item) => (
          <button
            type="button"
            aria-current={section === item ? 'page' : undefined}
            className={section === item ? 'active' : ''}
            key={item}
            onClick={() => setSection(item)}
          >
            {item}
          </button>
        ))}
      </nav>
      {section === 'Products' && <AdminProducts />}
      {section === 'Orders' && <AdminOrders />}
      {section === 'Users' && <AdminUsers />}
      {section === 'Categories & brands' && <AdminTaxonomy />}
      {section === 'Audit log' && <AdminAudit />}
    </div>
  );
}
