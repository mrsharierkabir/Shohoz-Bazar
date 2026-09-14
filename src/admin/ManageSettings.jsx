import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { uploadImage } from '../lib/helpers';
import { useSite } from '../context/SiteContext';

export default function ManageSettings() {
  const { settings, refreshSettings } = useSite();
  const [form, setForm] = useState(settings);
  const [iconFile, setIconFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    let payload = { ...form };
    if (iconFile) payload.logo_icon_url = await uploadImage(iconFile, 'settings');
    await supabase.from('settings').update(payload).eq('id', 1);
    await refreshSettings();
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div>
      <div className="admin-header"><h2>Site Settings</h2></div>
      <form className="admin-card" onSubmit={save} style={{ maxWidth: 520 }}>
        <div className="admin-form-row">
          <label>Hotline Number</label>
          <input value={form.hotline} onChange={(e) => set('hotline', e.target.value)} />
        </div>
        <div className="admin-form-row">
          <label>Whatsapp Number</label>
          <input value={form.whatsapp} onChange={(e) => set('whatsapp', e.target.value)} />
        </div>
        <div className="admin-form-row">
          <label>Hours Text</label>
          <input value={form.hours_text} onChange={(e) => set('hours_text', e.target.value)} />
        </div>
        <div className="admin-form-row">
          <label>Cash on Delivery Text</label>
          <input value={form.cash_on_delivery_text} onChange={(e) => set('cash_on_delivery_text', e.target.value)} />
        </div>
        <div className="admin-form-row">
          <label>Logo Line 1</label>
          <input value={form.logo_text_1} onChange={(e) => set('logo_text_1', e.target.value)} />
        </div>
        <div className="admin-form-row">
          <label>Logo Line 2</label>
          <input value={form.logo_text_2} onChange={(e) => set('logo_text_2', e.target.value)} />
        </div>
        <div className="admin-form-row">
          <label>Small Logo / Avatar Icon (shown next to "Daily Essentials" on the home page)</label>
          <input type="file" accept="image/*" onChange={(e) => setIconFile(e.target.files[0])} />
          {form.logo_icon_url && <img src={form.logo_icon_url} style={{ width: 42, height: 42, borderRadius: '50%', marginTop: 6 }} />}
        </div>
        <div className="admin-form-row">
          <label>Footer About Text</label>
          <textarea rows={3} value={form.footer_about} onChange={(e) => set('footer_about', e.target.value)} />
        </div>
        <div className="admin-form-row">
          <label>Footer Copyright Line</label>
          <input value={form.footer_copyright} onChange={(e) => set('footer_copyright', e.target.value)} />
        </div>
        <button className="btn btn-teal" disabled={saving}>{saving ? 'Saving…' : 'Save Settings'}</button>
        {saved && <span style={{ color: '#1a9d5c', marginLeft: 12, fontSize: 13 }}>✓ Saved</span>}
      </form>
    </div>
  );
}
