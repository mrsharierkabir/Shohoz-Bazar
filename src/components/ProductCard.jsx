import { useNavigate } from 'react-router-dom';
import { formatPrice, discountPercent } from '../lib/helpers';
import { useCart } from '../context/CartContext';

export default function ProductCard({ product, categoryName }) {
  const navigate = useNavigate();
  const { addItem } = useCart();
  const off = discountPercent(product.regular_price, product.discounted_price);
  const price = product.discounted_price || product.regular_price;

  return (
    <div className="product-card">
      <div className="thumb" style={{ cursor: 'pointer' }} onClick={() => navigate(`/product/${product.slug || product.id}`)}>
        {off > 0 && <span className="badge-off">-{off}%</span>}
        <img src={product.images?.[0] || 'https://placehold.co/300x300?text=No+Image'} alt={product.name} />
      </div>
      <div className="body">
        {categoryName && <div className="cat">{categoryName}</div>}
        <div className="name" style={{ cursor: 'pointer' }} onClick={() => navigate(`/product/${product.slug || product.id}`)}>
          {product.name}
        </div>
        <div className="price-row">
          {formatPrice(price)}
          {off > 0 && <span className="old">{formatPrice(product.regular_price)}</span>}
        </div>
        <button className="btn btn-orange btn-block" onClick={() => addItem(product, 1)}>Add to Cart</button>
      </div>
    </div>
  );
}
