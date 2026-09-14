import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import HeroBanner from '../components/HeroBanner';
import CategorySidebar from '../components/CategorySidebar';
import BrowseCategories from '../components/BrowseCategories';
import TrustBar from '../components/TrustBar';
import ProductCard from '../components/ProductCard';

export default function Home() {
  const [banners, setBanners] = useState([]);
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);

  useEffect(() => {
    supabase.from('banners').select('*').eq('active', true).order('position').then(({ data }) => setBanners(data || []));
    supabase.from('categories').select('*').eq('active', true).order('position').then(({ data }) => setCategories(data || []));
    supabase.from('products').select('*').then(({ data }) => {
      const shuffled = [...(data || [])].sort(() => Math.random() - 0.5);
      setProducts(shuffled);
    });
  }, []);

  const catMap = Object.fromEntries(categories.map((c) => [c.id, c.name]));

  return (
    <div className="container">
      <div className="home-top">
        <CategorySidebar categories={categories} />
        <HeroBanner banners={banners} />
      </div>

      <BrowseCategories categories={categories} />

      <TrustBar />

      <div className="section">
        <div className="section-head">
          <h3>Featured Picks</h3>
        </div>
        <div className="product-grid">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} categoryName={catMap[p.category_id]} />
          ))}
          {products.length === 0 && <div style={{ color: '#999' }}>No products yet — add them from the Admin Panel</div>}
        </div>
      </div>
    </div>
  );
}
