import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { formatPrice } from '../lib/helpers';

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ products: 0, categories: 0, orders: 0, banners: 0 });
  const [unread, setUnread] = useState([]);
  const [showPopup, setShowPopup] = useState(false);

  async function loadStats() {
    const [p, c, o, b] = await Promise.all([
      supabase.from('products').select('id', { count: 'exact', head: true }),
      supabase.from('categories').select('id', { count: 'exact', head: true }),
      supabase.from('orders').select('id', { count: 'exact', head: true }),
      supabase.from('banners').select('id', { count: 'exact', head: true }),
    ]);
    setStats({ products: p.count || 0, categories: c.count || 0, orders: o.count || 0, banners: b.count || 0 });
  }

  async function loadUnread() {
    const { data } = await supabase.from('orders').select('*').eq('is_read', false).order('created_at', { ascending: false });
    setUnread(data || []);
    if ((data || []).length > 0) setShowPopup(true);
  }

  useEffect(() => {
    loadStats();
    loadUnread();

    // Live popup whenever a new order comes in while the admin has the dashboard open.
    const channel = supabase
      .channel('orders-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, () => {
        loadUnread();
        loadStats();
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  async function markAllRead() {
    const ids = unread.map((o) => o.id);
    if (ids.length === 0) { setShowPopup(false); return; }
    await supabase.from('orders').update({ is_read: true }).in('id', ids);
    setUnread([]);
    setShowPopup(false);
  }

  async function markOneRead(id) {
    await supabase.from('orders').update({ is_read: true }).eq('id', id);
    setUnread((prev) => prev.filter((o) => o.id !== id));
  }

  return (
    <div>
      <div className="admin-header">
        <h2>Dashboard</h2>
        {unread.length > 0 && (
          <button className="btn btn-orange btn-sm" onClick={() => setShowPopup(true)}>
            🔔 {unread.length} new order{unread.length !== 1 ? 's' : ''}
          </button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        <div className="admin-card"><div style={{ color: '#999', fontSize: 13 }}>Products</div><h2>{stats.products}</h2></div>
        <div className="admin-card"><div style={{ color: '#999', fontSize: 13 }}>Categories</div><h2>{stats.categories}</h2></div>
        <div className="admin-card"><div style={{ color: '#999', fontSize: 13 }}>Orders</div><h2>{stats.orders}</h2></div>
        <div className="admin-card"><div style={{ color: '#999', fontSize: 13 }}>Banners</div><h2>{stats.banners}</h2></div>
      </div>
      <div className="admin-card">
        <h4 style={{ marginTop: 0 }}>Welcome to Shohaz Bazar Admin</h4>
        <p style={{ color: '#666', fontSize: 14 }}>
          Use the sidebar to manage site settings, the rotating announcement titles, hero banners,
          categories, products (with options and variants), footer links, policy pages, and view incoming orders.
        </p>
      </div>

      {showPopup && (
        <div className="cart-popup-overlay" onClick={() => setShowPopup(false)}>
          <div className="cart-popup" style={{ width: 440 }} onClick={(e) => e.stopPropagation()}>
            <div className="cart-popup-header">
              <span>🔔 New Order{unread.length !== 1 ? 's' : ''} ({unread.length})</span>
              <button className="icon-btn" onClick={() => setShowPopup(false)}>✕</button>
            </div>
            <div className="cart-popup-body">
              {unread.length === 0 && <div className="cart-popup-empty">You're all caught up 🎉</div>}
              {unread.map((o) => (
                <div className="cart-popup-row" key={o.id} style={{ alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700 }}>{o.customer_name || 'Customer'}</div>
                    <div style={{ fontSize: 12, color: '#888' }}>{o.customer_phone}</div>
                    <div style={{ fontSize: 12, color: '#888' }}>{(o.items || []).map((it) => `${it.name} x${it.qty}`).join(', ')}</div>
                    <div style={{ fontSize: 12, color: '#888' }}>{new Date(o.created_at).toLocaleString()}</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                    <strong>{formatPrice(o.total)}</strong>
                    <button className="btn btn-sm btn-outline" onClick={() => markOneRead(o.id)}>Mark read</button>
                  </div>
                </div>
              ))}
            </div>
            <div className="cart-popup-footer" style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-teal btn-block" onClick={() => { setShowPopup(false); navigate('/admin/orders'); }}>View All Orders</button>
              {unread.length > 0 && <button className="btn btn-outline btn-block" onClick={markAllRead}>Mark all as read</button>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
