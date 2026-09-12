import { useEffect, useState } from 'react';
import { Link, NavLink, Route, Routes } from 'react-router-dom';
import { api, type Cart, type User } from './lib/api';
import { errorText } from './lib/errors';
import { ShopContext } from './app/shop-context';
import { Icon } from './components/Icon';
import { RequireAdmin, RequireUser } from './components/Feedback';
import { Home } from './pages/Home';
import { Catalog } from './pages/Catalog';
import { ProductDetail } from './pages/ProductDetail';
import { CartPage } from './pages/CartPage';
import { AuthPage } from './pages/AuthPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { AccountPage } from './pages/AccountPage';
import { OrderDetail } from './pages/OrderDetail';
import { AdminPage } from './pages/AdminPage';

export function App() {
  const [user, setUser] = useState<User | null>(null);
  const [cart, setCart] = useState<Cart | null>(null);
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const notify = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(''), 5000);
  };
  const refreshCart = async () => {
    const result = await api<{ cart: Cart }>('/cart');
    setCart(result.cart);
  };
  useEffect(() => {
    Promise.allSettled([api<{ user: User }>('/auth/me'), api<{ cart: Cart }>('/cart')]).then(
      ([session, basket]) => {
        if (session.status === 'fulfilled') setUser(session.value.user);
        if (basket.status === 'fulfilled') setCart(basket.value.cart);
        setReady(true);
      },
    );
  }, []);
  const logout = async () => {
    try {
      await api('/auth/logout', { method: 'POST' });
      setUser(null);
      await refreshCart();
      notify('You have signed out.');
    } catch (error) {
      notify(errorText(error));
    }
  };
  return (
    <ShopContext.Provider value={{ user, cart, ready, refreshCart, setUser, notify }}>
      <a className="skip-link focus-visible:ring-2 focus-visible:ring-signal" href="#main">
        Skip to content
      </a>
      <div className="topline">
        <div className="container topline-inner">
          <span>Components for the way you build.</span>
          <span>Explore. Compare. Assemble.</span>
        </div>
      </div>
      <header className="site-header">
        <div className="container header-inner">
          <Link to="/" className="wordmark" aria-label="Core Shop home">
            <span className="logo-mark">
              <i />
              <i />
              <i />
              <i />
            </span>
            <span>
              CORE<span className="wordmark-light">/SHOP</span>
            </span>
          </Link>
          <button
            className="mobile-menu icon-button"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <Icon name={menuOpen ? 'close' : 'menu'} />
          </button>
          <nav
            className={menuOpen ? 'main-nav open' : 'main-nav'}
            aria-label="Main navigation"
            onClick={() => setMenuOpen(false)}
          >
            <NavLink to="/catalog">All components</NavLink>
            <NavLink to="/catalog?category=cpus">Processors</NavLink>
            <NavLink to="/catalog?category=gpus">Graphics cards</NavLink>
            <NavLink to="/catalog?category=ssds">Storage</NavLink>
          </nav>
          <div className="header-actions">
            <Link to="/catalog" aria-label="Search products" className="icon-button">
              <Icon name="search" />
            </Link>
            <Link to={user ? '/account' : '/auth'} aria-label="Account" className="icon-button">
              <Icon name="user" />
            </Link>
            <Link
              to="/cart"
              aria-label={`Cart, ${cart?.itemCount ?? 0} ${cart?.itemCount === 1 ? 'item' : 'items'}`}
              className="cart-link"
            >
              <Icon name="cart" />
              <span className="cart-count">{cart?.itemCount ?? 0}</span>
            </Link>
          </div>
        </div>
      </header>
      <main id="main" className="min-h-[50vh]">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/catalog" element={<Catalog />} />
          <Route path="/products/:slug" element={<ProductDetail />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route
            path="/checkout"
            element={
              <RequireUser>
                <CheckoutPage />
              </RequireUser>
            }
          />
          <Route
            path="/account"
            element={
              <RequireUser>
                <AccountPage />
              </RequireUser>
            }
          />
          <Route
            path="/orders/:id"
            element={
              <RequireUser>
                <OrderDetail />
              </RequireUser>
            }
          />
          <Route
            path="/admin"
            element={
              <RequireAdmin>
                <AdminPage />
              </RequireAdmin>
            }
          />
          <Route
            path="*"
            element={
              <div className="container empty-page">
                <h1>Page not found</h1>
                <p>That address does not lead to a shop page.</p>
                <Link className="button primary" to="/catalog">
                  Browse components <Icon name="arrow" />
                </Link>
              </div>
            }
          />
        </Routes>
      </main>
      <footer className="site-footer">
        <div className="container footer-grid">
          <div>
            <Link to="/" className="footer-wordmark">
              CORE/SHOP
            </Link>
            <p>Every build starts with the right parts.</p>
          </div>
          <div>
            <span>Explore</span>
            <Link to="/catalog">All components</Link>
            <Link to="/cart">Your cart</Link>
          </div>
          <div>
            <span>Account</span>
            <Link to={user ? '/account' : '/auth'}>{user ? 'Orders & addresses' : 'Sign in'}</Link>
            {user && (
              <button className="text-button" onClick={logout}>
                Sign out
              </button>
            )}
          </div>
          <div className="footer-end">
            A study in better builds.
            <br />
            Core Shop © {new Date().getFullYear()}
          </div>
        </div>
      </footer>
      {notice && (
        <div className="toast" role="status">
          {notice}
          <button aria-label="Dismiss message" onClick={() => setNotice('')}>
            <Icon name="close" size={16} />
          </button>
        </div>
      )}
    </ShopContext.Provider>
  );
}

export default App;
