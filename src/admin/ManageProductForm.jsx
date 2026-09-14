import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { uploadImage, slugify, discountPercent } from '../lib/helpers';

export default function ManageProductForm() {
  const { id } = useParams();
  const isNew = id === 'new';
  const navigate = useNavigate();

  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({
    name: '', category_id: '', regular_price: '', discounted_price: '', stock: '',
    description: '', delivery_info: '', featured: false, images: [],
  });
  const [newImageFiles, setNewImageFiles] = useState([]);
  const [variants, setVariants] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from('categories').select('*').order('position').then(({ data }) => setCategories(data || []));
    if (!isNew) {
      supabase.from('products').select('*').eq('id', id).maybeSingle().then(({ data }) => {
        if (data) setForm(data);
      });
      supabase.from('product_variants').select('*').eq('product_id', id).order('position').then(({ data }) => setVariants(data || []));
      supabase.from('product_reviews').select('*').eq('product_id', id).order('created_at', { ascending: false }).then(({ data }) => setReviews(data || []));
    }
  }, [id]);

  function set(key, value) { setForm((f) => ({ ...f, [key]: value })); }

  async function removeExistingImage(url) {
    set('images', form.images.filter((i) => i !== url));
  }

  async function saveProduct(e) {
    e.preventDefault();
    setSaving(true);
    const uploaded = [];
    for (const file of newImageFiles) {
      uploaded.push(await uploadImage(file, 'products'));
    }
    const images = [...(form.images || []), ...uploaded];
    const payload = {
      name: form.name,
      slug: form.slug || slugify(form.name),
      category_id: form.category_id || null,
      regular_price: Number(form.regular_price) || 0,
      discounted_price: Number(form.discounted_price) || 0,
      stock: Number(form.stock) || 0,
      description: form.description,
      delivery_info: form.delivery_info,
      featured: form.featured,
      images,
    };

    let productId = id;
    if (isNew) {
      const { data, error } = await supabase.from('products').insert(payload).select().single();
      if (error) { alert(error.message); setSaving(false); return; }
      productId = data.id;
    } else {
      const { error } = await supabase.from('products').update(payload).eq('id', id);
      if (error) { alert(error.message); setSaving(false); return; }
    }
    setSaving(false);
    navigate(`/admin/products/${productId}`);
    if (isNew) window.location.reload();
  }

  // --- Variants (options / checkboxes with photo) ---
  const [variantDraft, setVariantDraft] = useState({ option_group: 'Size', name: '', file: null });
  async function addVariant(e) {
    e.preventDefault();
    if (isNew) { alert('Save the product first, then add options.'); return; }
    let image_url = '';
    if (variantDraft.file) image_url = await uploadImage(variantDraft.file, 'variants');
    await supabase.from('product_variants').insert({
      product_id: id, option_group: variantDraft.option_group, name: variantDraft.name,
      image_url, position: variants.length,
    });
    setVariantDraft({ option_group: variantDraft.option_group, name: '', file: null });
    const { data } = await supabase.from('product_variants').select('*').eq('product_id', id).order('position');
    setVariants(data || []);
  }
  async function removeVariant(vid) {
    await supabase.from('product_variants').delete().eq('id', vid);
    setVariants((v) => v.filter((x) => x.id !== vid));
  }

  // --- Reviews ---
  const [reviewDraft, setReviewDraft] = useState({ author: '', rating: 5, comment: '' });
  async function addReview(e) {
    e.preventDefault();
    if (isNew) { alert('Save the product first, then add reviews.'); return; }
    await supabase.from('product_reviews').insert({ product_id: id, ...reviewDraft });
    setReviewDraft({ author: '', rating: 5, comment: '' });
    const { data } = await supabase.from('product_reviews').select('*').eq('product_id', id).order('created_at', { ascending: false });
    setReviews(data || []);
  }
  async function removeReview(rid) {
    await supabase.from('product_reviews').delete().eq('id', rid);
    setReviews((r) => r.filter((x) => x.id !== rid));
  }

  const off = discountPercent(form.regular_price, form.discounted_price);

  return (
    <div>
      <div className="admin-header"><h2>{isNew ? 'Add Product' : `Edit: ${form.name}`}</h2></div>

      <form className="admin-card" onSubmit={saveProduct}>
        <div className="admin-form-row">
          <label>Product Name</label>
          <input required value={form.name} onChange={(e) => set('name', e.target.value)} />
        </div>
        <div className="admin-form-row">
          <label>Category</label>
          <select value={form.category_id || ''} onChange={(e) => set('category_id', e.target.value)}>
            <option value="">— none —</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', gap: 14 }}>
          <div className="admin-form-row" style={{ flex: 1 }}>
            <label>Regular Price (৳)</label>
            <input type="number" required value={form.regular_price} onChange={(e) => set('regular_price', e.target.value)} />
          </div>
          <div className="admin-form-row" style={{ flex: 1 }}>
            <label>Discounted Price (৳)</label>
            <input type="number" value={form.discounted_price} onChange={(e) => set('discounted_price', e.target.value)} />
          </div>
          <div className="admin-form-row" style={{ flex: 1 }}>
            <label>Stock Quantity</label>
            <input type="number" required value={form.stock} onChange={(e) => set('stock', e.target.value)} />
          </div>
        </div>
        {off > 0 && <p style={{ color: '#1a9d5c', fontSize: 13 }}>Auto-calculated discount: {off}% off</p>}

        <div className="admin-form-row">
          <label>Product Images</label>
          <div className="thumb-row" style={{ marginBottom: 8 }}>
            {(form.images || []).map((img) => (
              <div key={img} style={{ position: 'relative' }}>
                <img src={img} />
                <button type="button" onClick={() => removeExistingImage(img)} style={{ position: 'absolute', top: -6, right: -6, background: '#e2483a', color: '#fff', border: 'none', borderRadius: '50%', width: 18, height: 18, fontSize: 10 }}>✕</button>
              </div>
            ))}
          </div>
          <input type="file" accept="image/*" multiple onChange={(e) => setNewImageFiles(Array.from(e.target.files))} />
        </div>

        <div className="admin-form-row">
          <label>Featured (show boosted in Featured Picks)</label>
          <input type="checkbox" checked={form.featured} onChange={(e) => set('featured', e.target.checked)} style={{ width: 18 }} />
        </div>

        <div className="admin-form-row">
          <label>Description</label>
          <textarea rows={4} value={form.description} onChange={(e) => set('description', e.target.value)} />
        </div>
        <div className="admin-form-row">
          <label>Delivery Info</label>
          <textarea rows={3} value={form.delivery_info} onChange={(e) => set('delivery_info', e.target.value)} />
        </div>

        <button className="btn btn-teal" disabled={saving}>{saving ? 'Saving…' : isNew ? 'Create Product' : 'Save Changes'}</button>
      </form>

      {!isNew && (
        <>
          <div className="admin-card">
            <h4 style={{ marginTop: 0 }}>Options / Variants (e.g. Size, Type — each with its own photo)</h4>
            <form onSubmit={addVariant} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
              <input placeholder="Option group (e.g. Size)" value={variantDraft.option_group} onChange={(e) => setVariantDraft({ ...variantDraft, option_group: e.target.value })} style={{ padding: 8, border: '1px solid var(--border)', borderRadius: 6 }} />
              <input placeholder="Value (e.g. Large / Red)" required value={variantDraft.name} onChange={(e) => setVariantDraft({ ...variantDraft, name: e.target.value })} style={{ padding: 8, border: '1px solid var(--border)', borderRadius: 6 }} />
              <input type="file" accept="image/*" onChange={(e) => setVariantDraft({ ...variantDraft, file: e.target.files[0] })} />
              <button className="btn btn-teal btn-sm">Add Option</button>
            </form>
            <table className="admin-table">
              <thead><tr><th>Group</th><th>Value</th><th>Photo</th><th></th></tr></thead>
              <tbody>
                {variants.map((v) => (
                  <tr key={v.id}>
                    <td>{v.option_group}</td>
                    <td>{v.name}</td>
                    <td>{v.image_url && <img src={v.image_url} style={{ width: 32, height: 32, borderRadius: 6 }} />}</td>
                    <td><button className="btn btn-sm btn-danger" onClick={() => removeVariant(v.id)}>Delete</button></td>
                  </tr>
                ))}
                {variants.length === 0 && <tr><td colSpan={4} style={{ color: '#999' }}>No options yet</td></tr>}
              </tbody>
            </table>
          </div>

          <div className="admin-card">
            <h4 style={{ marginTop: 0 }}>Reviews</h4>
            <form onSubmit={addReview} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
              <input placeholder="Author" value={reviewDraft.author} onChange={(e) => setReviewDraft({ ...reviewDraft, author: e.target.value })} style={{ padding: 8, border: '1px solid var(--border)', borderRadius: 6 }} />
              <select value={reviewDraft.rating} onChange={(e) => setReviewDraft({ ...reviewDraft, rating: Number(e.target.value) })}>
                {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} ★</option>)}
              </select>
              <input placeholder="Comment" required value={reviewDraft.comment} onChange={(e) => setReviewDraft({ ...reviewDraft, comment: e.target.value })} style={{ padding: 8, border: '1px solid var(--border)', borderRadius: 6, flex: 1, minWidth: 200 }} />
              <button className="btn btn-teal btn-sm">Add Review</button>
            </form>
            <table className="admin-table">
              <tbody>
                {reviews.map((r) => (
                  <tr key={r.id}>
                    <td>{r.author}</td>
                    <td>{'★'.repeat(r.rating)}</td>
                    <td>{r.comment}</td>
                    <td><button className="btn btn-sm btn-danger" onClick={() => removeReview(r.id)}>Delete</button></td>
                  </tr>
                ))}
                {reviews.length === 0 && <tr><td colSpan={4} style={{ color: '#999' }}>No reviews yet</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
