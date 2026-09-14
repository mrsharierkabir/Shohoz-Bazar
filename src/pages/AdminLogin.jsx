import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function onSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      navigate('/admin/dashboard');
    }
  }

  return (
    <div className="container">
      <div className="admin-login-box">
        <h2 style={{ marginTop: 0 }}>Admin Login</h2>
        <p style={{ fontSize: 13, color: '#777' }}>
          Sign in with the admin account created in your Supabase project (Authentication → Users).
        </p>
        <form onSubmit={onSubmit}>
          <div className="admin-form-row">
            <label>Email</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="admin-form-row">
            <label>Password</label>
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          {error && <p style={{ color: '#e2483a', fontSize: 13 }}>{error}</p>}
          <button className="btn btn-teal btn-block" disabled={loading}>{loading ? 'Signing in…' : 'Sign In'}</button>
        </form>
      </div>
    </div>
  );
}
