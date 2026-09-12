import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { api, body, type User } from '../lib/api';
import { errorText } from '../lib/errors';
import { useShop } from '../app/shop-context';
import { ComponentArt } from '../components/ComponentArt';
import { Icon } from '../components/Icon';

export function AuthPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user, setUser, refreshCart } = useShop();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  if (user)
    return <Navigate to={params.get('next') === 'checkout' ? '/checkout' : '/account'} replace />;
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      const result = await api<{ user: User }>(`/auth/${mode}`, {
        method: 'POST',
        body: body({ email, password }),
      });
      setUser(result.user);
      await refreshCart();
      navigate(params.get('next') === 'checkout' ? '/checkout' : '/account');
    } catch (cause) {
      setError(errorText(cause));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="auth-wrap container">
      <div className="auth-intro">
        <span className="section-label">Build with us</span>
        <h1>
          Your parts.
          <br />
          Your account.
        </h1>
        <p>
          Sign in to see your orders, save delivery addresses, and carry your cart into checkout.
        </p>
        <div className="auth-art">
          <ComponentArt kind="cpus" large />
        </div>
      </div>
      <div className="auth-form">
        <div className="auth-switch">
          <button
            className={mode === 'login' ? 'active' : ''}
            onClick={() => {
              setMode('login');
              setError('');
            }}
          >
            Sign in
          </button>
          <button
            className={mode === 'register' ? 'active' : ''}
            onClick={() => {
              setMode('register');
              setError('');
            }}
          >
            Create account
          </button>
        </div>
        <h2>{mode === 'login' ? 'Welcome back.' : 'Start your build.'}</h2>
        <p>
          {mode === 'login'
            ? 'Enter your details to continue.'
            : 'Create an account to track every part and order.'}
        </p>
        <form onSubmit={submit}>
          <label>
            Email address
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
            />
          </label>
          <label>
            Password
            <input
              type="password"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              required
              minLength={mode === 'register' ? 8 : 1}
              maxLength={72}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder={mode === 'register' ? 'At least 8 characters' : 'Your password'}
            />
          </label>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <button className="button orange wide" disabled={busy} type="submit">
            {busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}{' '}
            <Icon name="arrow" />
          </button>
        </form>
      </div>
    </div>
  );
}
