import React, { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useAdmin } from '@/features/admin/context/adminContext';
import { AdminEmptyState } from '@/features/admin/components/states/AdminEmptyState';
import { createVideoAsset, deleteVideoAsset, fetchVideoAssets, fetchVideoProviders } from '@/features/admin/data/adminFetchers';
import type { AdminVideoAsset, AdminVideoProvider } from '@/features/admin/types';

export const VideoHostingView: React.FC = () => {
  useAdmin();
  const [providers, setProviders] = useState<AdminVideoProvider[]>([]);
  const [assets, setAssets] = useState<AdminVideoAsset[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ slug: '', title: '', provider: '' });

  const load = async () => {
    setLoading(true);
    try {
      const [p, a] = await Promise.all([fetchVideoProviders(), fetchVideoAssets()]);
      setProviders(p.results as AdminVideoProvider[]);
      setAssets(a.results as AdminVideoAsset[]);
      const def = (p.results as AdminVideoProvider[]).find((x) => x.isDefault && x.enabled);
      if (def && !form.provider) {
        setForm((prev) => ({ ...prev, provider: def.code }));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createVideoAsset({ slug: form.slug, title: form.title, provider: form.provider || undefined });
      setForm({ slug: '', title: '', provider: form.provider });
      load();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteVideoAsset(id);
      load();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="admin-view">
      <div className="admin-toolbar">
        <h2 className="admin-section-title">استضافة الفيديو</h2>
      </div>

      <div className="admin-card" style={{ marginBottom: 16 }}>
        <div className="admin-card-head">
          <div className="admin-card-title">إضافة فيديو</div>
        </div>
        <form onSubmit={handleCreate} className="admin-form-grid" style={{ padding: 16 }}>
          <div className="admin-field">
            <label className="admin-field-label">معرّف الفيديو (slug)</label>
            <input className="admin-input" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} required />
          </div>
          <div className="admin-field">
            <label className="admin-field-label">العنوان</label>
            <input className="admin-input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div className="admin-field">
            <label className="admin-field-label">مزود استضافة الفيديو</label>
            <select className="admin-select admin-select-full" value={form.provider} onChange={(e) => setForm({ ...form, provider: e.target.value })}>
              <option value="">—</option>
              {providers.map((p) => (
                <option key={p.code} value={p.code} disabled={!p.enabled}>
                  {p.name} {!p.enabled ? '(غير متاح مؤقتًا)' : ''}
                </option>
              ))}
            </select>
            {providers.find((p) => p.code === 'telegram' && !p.enabled) && (
              <div className="admin-form-hint">مُعطّل مؤقتًا — البنية التحتية المطلوبة غير مُهيأة.</div>
            )}
          </div>
          <div className="admin-form-footer" style={{ gridColumn: '1 / -1' }}>
            <button type="submit" className="admin-primary-btn">
              <Plus size={15} />
              <span>إضافة</span>
            </button>
          </div>
        </form>
      </div>

      {assets.length > 0 ? (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>المعرّف</th>
                <th>العنوان</th>
                <th>الحالة</th>
                <th>المزود</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {assets.map((a) => (
                <tr key={a.id}>
                  <td>{a.slug}</td>
                  <td>{a.title || '-'}</td>
                  <td>{a.status}</td>
                  <td>{a.provider || '-'}</td>
                  <td>
                    <button type="button" className="admin-icon-btn" onClick={() => handleDelete(a.id)} aria-label="حذف">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <AdminEmptyState title={loading ? 'جاري التحميل...' : 'لا توجد عناصر بعد'} />
      )}
    </div>
  );
};
