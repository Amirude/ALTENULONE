import { useEffect, useState } from 'react';
import { apiClient, extractErrorMessage } from '../api/client';
import { findCategory } from '../categories';

export default function AdminDashboard() {
  const [pending, setPending] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const res = await apiClient.get('/admin/shops/pending');
      setPending(res.data);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function decide(shopId, action) {
    try {
      await apiClient.patch(`/admin/shops/${shopId}/${action}`);
      load();
    } catch (err) {
      setError(extractErrorMessage(err));
    }
  }

  return (
    <div className="wrap">
      <div className="card">
        <h2>Shop approval queue</h2>
        <p className="sub">New shop registrations wait here until you approve or reject them.</p>
        {error && <div className="error-banner">{error}</div>}
        {loading ? (
          <div className="empty">Loading…</div>
        ) : pending.length === 0 ? (
          <div className="empty">Nothing waiting on approval.</div>
        ) : (
          pending.map((s) => {
            const cat = findCategory(s.categoryCode);
            return (
              <div className="booking-row" key={s.id}>
                <div className="top">
                  <div><strong>{s.shopName}</strong> — {cat ? `${cat.icon} ${cat.name}` : s.categoryCode}</div>
                </div>
                <div className="details">{s.address}</div>
                <div className="actions">
                  <button className="btn small" onClick={() => decide(s.id, 'approve')}>Approve</button>
                  <button className="btn small brick" onClick={() => decide(s.id, 'reject')}>Reject</button>
                </div>
              </div>
            );
          })
        )}
        <button className="btn outline small" style={{ marginTop: 10 }} onClick={load}>Refresh</button>
      </div>
    </div>
  );
}
