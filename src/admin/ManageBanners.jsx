import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { uploadImage } from '../lib/helpers';

const empty = { image_url: '', headline: '', subheadline: '', link_url: '', active: true };

export default function ManageBanners() {
  const [banners, setBanners] = useState([]);
  const [form, setForm] = useState(empty);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [editingId, setEditingId] = useState(null);

  async function load() {
    const { data } = await supabase.from('banners').select('*').order('position');
    setBanners(data || []);
  }
  useEffect(() => { load(); }, []);

  async function save(e) {
    e.preventDefault();
    setUploading(true);
    let image_url = form.image_url;
    if (file) image_url = await uploadImage(file, 'banners');
    if (editingId) {
      await supabase.from('banners').update({ ...form, image_url }).eq('id', editingId);
    } else {
      await supabase.from('banners').insert({ ...form, image_url, position: banners.length });
    }
    setForm(empty);
    setFile(null);
    setEditingId(null);
    setUploading(false);
    load();
  }

  function edit(b) {
    setForm({ image_url: b.image_url, headline: b.headline, subheadline: b.subheadline, link_url: b.link_url, active: b.active });
    setEditingId(b.id);
  }

  async function remove(id) {
    await supabase.from('banners').delete().eq('id', id);
    load();
  }

  async function move(index, dir) {
    const target = index + dir;
    if (target < 0 || target >= banners.length) return;
    const a = banners[index], b = banners[target];
    await supabase.from('banners').update({ position: b.position }).eq('id', a.id);
    await supabase.from('banners').update({ position: a.position }).eq('id', b.id);
    load();
  }

  return (
    <div>
      <div className="admin-header"><h2>Banners</h2></div>
      <p style={{ color: '#666', fontSize: 13 }}>The hero carousel auto-advances every 5 seconds; visitors can also click the left/right arrows.</p>

      <form className="admin-card" onSubmit={save}>
        <h4 style={{ marginTop: 0 }}>{editingId ? 'Edit Banner' : 'Add Banner'}</h4>
        <div className="admin-form-row">
          <label>Image</label>
          <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files[0])} />
          {form.image_url && <img src={form.image_url} style={{ width: 120, marginTop: 6, borderRadius: 6 }} />}
        </div>
        <div className="admin-form-row">
          <label>Headline (optional)</label>
          <input value={form.headline} onChange={(e) => setForm({ ...form, headline: e.target.value })} />
        </div>
        <div className="admin-form-row">
          <label>Subheadline (optional)</label>
          <input value={form.subheadline} onChange={(e) => setForm({ ...form, subheadline: e.target.value })} />
        </div>
        <div className="admin-form-row">
          <label>Link URL (optional)</label>
          <input value={form.link_url} onChange={(e) => setForm({ ...form, link_url: e.target.value })} />
        </div>
        <button className="btn btn-teal" disabled={uploading}>{uploading ? 'Saving…' : editingId ? 'Update Banner' : 'Add Banner'}</button>
        {editingId && <button type="button" className="btn btn-outline" style={{ marginLeft: 8 }} onClick={() => { setForm(empty); setFile(null); setEditingId(null); }}>Cancel</button>}
      </form>

      <div className="admin-card">
        <table className="admin-table">
          <thead><tr><th>Preview</th><th>Headline</th><th>Order</th><th></th></tr></thead>
          <tbody>
            {banners.map((b, i) => (
              <tr key={b.id}>
                <td><img src={b.image_url} style={{ width: 80, height: 44, objectFit: 'cover', borderRadius: 6 }} /></td>
                <td>{b.headline}</td>
                <td>
                  <button className="btn-sm btn-outline" onClick={() => move(i, -1)}>↑</button>{' '}
                  <button className="btn-sm btn-outline" onClick={() => move(i, 1)}>↓</button>
                </td>
                <td className="row-actions">
                  <button className="btn btn-sm btn-outline" onClick={() => edit(b)}>Edit</button>
                  <button className="btn btn-sm btn-danger" onClick={() => remove(b.id)}>Delete</button>
                </td>
              </tr>
            ))}
            {banners.length === 0 && <tr><td colSpan={4} style={{ color: '#999' }}>No banners yet</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
