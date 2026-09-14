import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useCart } from '../context/CartContext';
import { formatPrice } from '../lib/helpers';

const PHONE_REGEX = /^01\d{9}$/; // 01 followed by 9 more digits = 11 digits total

export default function Checkout() {
  const { items, itemCount, subtotal, clearCart } = useCart();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', phone: '', address: '', note: '' });
  const [phoneError, setPhoneError] = useState('');
  const [placing, setPlacing] = useState(false);
  const [placed, setPlaced] = useState(false);
  const [placedInvoice, setPlacedInvoice] = useState('');

  if (items.length === 0 && !placed) {
    return (
      <div className="container">
        <div className="cart-page-box cart-empty">
          <h3>Your cart is empty</h3>
          <button className="btn btn-teal" onClick={() => navigate('/shop')}>Browse Shop →</button>
        </div>
      </div>
    );
  }

  if (placed) {
    return (
      <div className="container">
        <div className="cart-page-box cart-empty">
          <h3>🎉 Order placed successfully!</h3>
          {placedInvoice && <p style={{ fontWeight: 600 }}>Your invoice number: {placedInvoice}</p>}
          <p style={{ color: '#777' }}>We'll contact you shortly to confirm delivery.</p>
          <button className="btn btn-teal" onClick={() => navigate('/shop')}>Continue Shopping →</button>
        </div>
      </div>
    );
  }

  function onPhoneChange(e) {
    // Only allow digits, cap at 11 characters, as the person types.
    const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 11);
    setForm({ ...form, phone: digitsOnly });
    if (phoneError) setPhoneError('');
  }

  async function placeOrder(e) {
    e.preventDefault();
    if (!PHONE_REGEX.test(form.phone)) {
      setPhoneError('Enter a valid 11-digit number starting with 01 (e.g. 01712345678)');
      return;
    }
    setPlacing(true);
    const { data } = await supabase.from('orders').insert({
      customer_name: form.name,
      customer_phone: form.phone,
      customer_address: form.address,
      note: form.note,
      items,
      subtotal,
      total: subtotal,
      status: 'pending',
    }).select().single();
    setPlacing(false);
    setPlaced(true);
    setPlacedInvoice(data?.invoice_no || '');
    clearCart();
  }

  return (
    <div className="container">
      <div className="cart-page-box">
        <h2>Checkout</h2>
        <p style={{ color: '#777' }}>You have {itemCount} item{itemCount !== 1 ? 's' : ''} in your bag</p>
        <div className="cart-page-grid">
          <form className="admin-card" onSubmit={placeOrder}>
            <div className="admin-form-row">
              <label>Full Name</label>
              <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="admin-form-row">
              <label>Phone Number</label>
              <input
                required
                type="tel"
                inputMode="numeric"
                placeholder="01XXXXXXXXX"
                maxLength={11}
                value={form.phone}
                onChange={onPhoneChange}
                style={phoneError ? { borderColor: 'var(--danger)' } : undefined}
              />
              {phoneError && <span style={{ color: 'var(--danger)', fontSize: 12 }}>{phoneError}</span>}
            </div>
            <div className="admin-form-row">
              <label>Delivery Address</label>
              <textarea required rows={3} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </div>
            <div className="admin-form-row">
              <label>Order Note (optional)</label>
              <textarea rows={2} placeholder="e.g. call before delivery, leave at the gate…" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
            </div>
            <button className="btn btn-teal btn-block" disabled={placing}>{placing ? 'Placing order…' : 'Place Order (Cash on Delivery)'}</button>
          </form>

          <div className="order-summary">
            <h4 style={{ marginTop: 0 }}>Order Summary</h4>
            {items.map((it) => (
              <div className="order-summary-row" key={it.key}>
                <span>{it.name} × {it.qty}</span>
                <span>{formatPrice(it.qty * it.unitPrice)}</span>
              </div>
            ))}
            <div className="order-summary-row order-summary-total"><span>Total Payable</span><span>{formatPrice(subtotal)}</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
