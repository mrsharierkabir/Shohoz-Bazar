import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { formatPrice, discountPercent, whatsappLink } from '../lib/helpers';
import { useCart } from '../context/CartContext';
import { useSite } from '../context/SiteContext';
import ProductCard from '../components/ProductCard';

export default function ProductPage() {
  const { idOrSlug } = useParams();
  const navigate = useNavigate();
  const { addItem } = useCart();
  const { settings } = useSite();

  const [product, setProduct] = useState(null);
  const [category, setCategory] = useState(null);
  const [variants, setVariants] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [related, setRelated] = useState([]);
  const [activeImg, setActiveImg] = useState(0);
  const [selectedByGroup, setSelectedByGroup] = useState({});
  const [qty, setQty] = useState(1);
  const [tab, setTab] = useState('description');

  useEffect(() => {
    async function load() {
      let { data: p } = await supabase.from('products').select('*').eq('slug', idOrSlug).maybeSingle();
      if (!p) {
        const res = await supabase.from('products').select('*').eq('id', idOrSlug).maybeSingle();
        p = res.data;
      }
      if (!p) return;
      setProduct(p);
      setActiveImg(0);
      setQty(1);

      if (p.category_id) {
        const { data: cat } = await supabase.from('categories').select('*').eq('id', p.category_id).maybeSingle();
        setCategory(cat);
        const { data: rel } = await supabase.from('products').select('*').eq('category_id', p.category_id).neq('id', p.id).limit(10);
        setRelated(rel || []);
      }
      const { data: v } = await supabase.from('product_variants').select('*').eq('product_id', p.id).order('position');
      setVariants(v || []);
      setSelectedByGroup({});
      const { data: r } = await supabase.from('product_reviews').select('*').eq('product_id', p.id).order('created_at', { ascending: false });
      setReviews(r || []);
    }
    load();
  }, [idOrSlug]);

  if (!product) return <div className="container" style={{ padding: 40 }}>Loading...</div>;

  const off = discountPercent(product.regular_price, product.discounted_price);
  const images = product.images?.length ? product.images : ['https://placehold.co/500x500?text=No+Image'];

  const optionGroups = Object.entries(
    variants.reduce((acc, v) => {
      acc[v.option_group] = acc[v.option_group] || [];
      acc[v.option_group].push(v);
      return acc;
    }, {})
  );
  const needsSelection = optionGroups.length > 0;
  const allSelected = optionGroups.every(([group]) => selectedByGroup[group]);
  // If any selected variant has a price override, use it (last one chosen wins); otherwise the base product price.
  const overrideVariant = Object.values(selectedByGroup).find((v) => v && v.price_override != null && v.price_override !== '');
  const price = overrideVariant ? overrideVariant.price_override : (product.discounted_price || product.regular_price);
  const variantWithImage = Object.values(selectedByGroup).find((v) => v && v.image_url);
  const variantLabel = Object.values(selectedByGroup).filter(Boolean).map((v) => v.name).join(' / ');

  function toggleVariant(group, variant) {
    setSelectedByGroup((prev) => ({ ...prev, [group]: prev[group]?.id === variant.id ? null : variant }));
  }

  return (
    <div className="container">
      <div className="breadcrumb">Home / Shop / {category?.name} / {product.name}</div>
      <div className="product-detail">
        <div>
          <div className="product-gallery-main">
            <img src={variantWithImage?.image_url || images[activeImg]} alt={product.name} />
          </div>
          <div className="product-thumbs">
            {images.map((img, i) => (
              <img
                key={i}
                src={img}
                className={i === activeImg && !variantWithImage ? 'active' : ''}
                onClick={() => setActiveImg(i)}
              />
            ))}
          </div>
        </div>

        <div>
          {category && <div className="pd-cat">{category.name}</div>}
          <h1 className="pd-name">{product.name}</h1>
          <div className="pd-stock">{product.stock > 0 ? `In stock (${product.stock})` : 'Out of stock'}</div>

          {optionGroups.map(([group, opts]) => (
            <div className="pd-options" key={group}>
              <h5>{group}{!selectedByGroup[group] && <span style={{ color: 'var(--danger)' }}> *</span>}</h5>
              <div className="pd-option-list">
                {opts.map((o) => (
                  <div
                    key={o.id}
                    className={`pd-option-chip ${selectedByGroup[group]?.id === o.id ? 'active' : ''}`}
                    onClick={() => toggleVariant(group, o)}
                  >
                    {o.image_url && <img src={o.image_url} alt={o.name} />}
                    {o.name}
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div className="pd-price-row">
            <span className="now">{formatPrice(price)}</span>
            {off > 0 && !overrideVariant && <span className="old">{formatPrice(product.regular_price)}</span>}
            {off > 0 && !overrideVariant && <span className="save">Save {off}%</span>}
          </div>

          <div className="pd-qty-row">
            <div className="qty-stepper">
              <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))}>-</button>
              <input value={qty} readOnly />
              <button type="button" onClick={() => setQty((q) => q + 1)}>+</button>
            </div>
          </div>

          <div className="pd-actions">
            {needsSelection && !allSelected ? (
              <button className="btn btn-outline" disabled style={{ opacity: .7 }}>Select an option</button>
            ) : (
              <>
                <button
                  type="button"
                  className="btn btn-outline"
                  disabled={product.stock <= 0}
                  onClick={() => addItem({ ...product, images: variantWithImage?.image_url ? [variantWithImage.image_url] : product.images, discounted_price: price, regular_price: price }, qty, variantLabel)}
                >
                  Add to Bag
                </button>
                <button
                  type="button"
                  className="btn btn-teal"
                  disabled={product.stock <= 0}
                  onClick={() => {
                    addItem({ ...product, images: variantWithImage?.image_url ? [variantWithImage.image_url] : product.images, discounted_price: price, regular_price: price }, qty, variantLabel);
                    navigate('/checkout');
                  }}
                >
                  Buy Now
                </button>
              </>
            )}
          </div>

          <div className="pd-help">Need help? Feel free to contact us anytime</div>
          <a className="btn btn-teal pd-whatsapp" href={whatsappLink(settings.whatsapp, `Hi, I'm interested in ${product.name}`)} target="_blank" rel="noreferrer">
            💬 Whatsapp Order — {settings.whatsapp}
          </a>

          <div className="pd-tabs">
            <button className={`pd-tab ${tab === 'description' ? 'active' : ''}`} onClick={() => setTab('description')}>Description</button>
            <button className={`pd-tab ${tab === 'delivery' ? 'active' : ''}`} onClick={() => setTab('delivery')}>Delivery Info</button>
            <button className={`pd-tab ${tab === 'reviews' ? 'active' : ''}`} onClick={() => setTab('reviews')}>Reviews ({reviews.length})</button>
          </div>
          <div className="pd-tab-content">
            {tab === 'description' && (product.description || 'No description yet.')}
            {tab === 'delivery' && (product.delivery_info || 'No delivery info yet.')}
            {tab === 'reviews' && (
              reviews.length === 0 ? 'No reviews yet.' :
              reviews.map((r) => (
                <div className="review-item" key={r.id}>
                  <div className="review-stars">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</div>
                  <strong>{r.author}</strong>
                  <p style={{ margin: '4px 0 0' }}>{r.comment}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <div className="section">
          <div className="section-head"><h3>You may also like</h3></div>
          <div className="product-grid">
            {related.map((p) => <ProductCard key={p.id} product={p} categoryName={category?.name} />)}
          </div>
        </div>
      )}
    </div>
  );
}
