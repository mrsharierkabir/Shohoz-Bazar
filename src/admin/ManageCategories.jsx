import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { uploadImage } from '../lib/helpers';

const empty = { name: '', name_bn: '', icon_url: '', active: true };

export default function ManageCategories() {
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState(empty);
  const [file, setFile] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    const { data } = await supabase.from('categories').select('*').order('position');
    setCategories(data || []);
  }
  useEffect(() => { load(); }, []);

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    let icon_url = form.icon_url;
    if (file) icon_url = await uploadImage(file, 'categories');
    if (editingId) {
      await supabase.from('categories').update({ ...form, icon_url }).eq('id', editingId);
    } else {
      await supabase.from('categories').insert({ ...form, icon_url, position: categories.length });
    }
    setForm(empty);
    setFile(null);
    setEditingId(null);
    setSaving(false);
    load();
  }

  function edit(c) {
    setForm({ name: c.name, name_bn: c.name_bn, icon_url: c.icon_url, active: c.active });
    setEditingId(c.id);
  }

  async function remove(id) {
    await supabase.from('categories').delete().eq('id', id);
    load();
  }

  return (
    <div>
      <div className="admin-header"><h2>Categories</h2></div>
      <form className="admin-card" onSubmit={save}>
        <h4 style={{ marginTop: 0 }}>{editingId ? 'Edit Category' : 'Add Category'}</h4>
        <div className="admin-form-row">
          <label>Name (English)</label>
          <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div className="admin-form-row">
          <label>Name (Bangla, optional)</label>
          <input value={form.name_bn} onChange={(e) => setForm({ ...form, name_bn: e.target.value })} />
        </div>
        <div className="admin-form-row">
          <label>Icon</label>
          <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files[0])} />
          {form.icon_url && <img src={form.icon_url} style={{ width: 50, height: 50, borderRadius: '50%', marginTop: 6 }} />}
        </div>
        <button className="btn btn-teal" disabled={saving}>{saving ? 'Saving…' : editingId ? 'Update' : 'Add Category'}</button>
        {editingId && <button type="button" className="btn btn-outline" style={{ marginLeft: 8 }} onClick={() => { setForm(empty); setEditingId(null); }}>Cancel</button>}
      </form>

      <div className="admin-card">
        <table className="admin-table">
          <thead><tr><th>Icon</th><th>Name</th><th></th></tr></thead>
          <tbody>
            {categories.map((c) => (
              <tr key={c.id}>
                <td>{c.icon_url ? <img src={c.icon_url} style={{ width: 32, height: 32, borderRadius: '50%' }} /> : '—'}</td>
                <td>{c.name}</td>
                <td className="row-actions">
                  <button className="btn btn-sm btn-outline" onClick={() => edit(c)}>Edit</button>
                  <button className="btn btn-sm btn-danger" onClick={() => remove(c.id)}>Delete</button>
                </td>
              </tr>
            ))}
            {categories.length === 0 && <tr><td colSpan={3} style={{ color: '#999' }}>No categories yet</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
