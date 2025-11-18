import { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Auth.css';

const Login = () => {
  const [credentials, setCredentials] = useState({
    username: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Redirect if already logged in
  useEffect(() => {
    if (isAuthenticated) {
      // Check for returnUrl query parameter
      const searchParams = new URLSearchParams(location.search);
      const returnUrl = searchParams.get('returnUrl');

      if (returnUrl && isValidReturnUrl(returnUrl)) {
        // Redirect to the intended page
        navigate(returnUrl, { replace: true });
      } else {
        // Redirect to last visited location or home
        const lastProvince = localStorage.getItem('lastProvince');
        const lastMunicipality = localStorage.getItem('lastMunicipality');

        if (lastProvince && lastMunicipality && lastMunicipality !== 'all') {
          navigate(`/${lastProvince}/${lastMunicipality}`, { replace: true });
        } else if (lastProvince) {
          navigate(`/${lastProvince}`, { replace: true });
        } else {
          navigate('/', { replace: true });
        }
      }
    }
  }, [isAuthenticated, navigate, location.search]);

  // Helper function to validate returnUrl for security
  const isValidReturnUrl = (url) => {
    if (!url) return false;
    // Must start with '/' and not start with '//' (to prevent open redirects)
    return url.startsWith('/') && !url.startsWith('//');
  };

  const handleChange = (e) => {
    setCredentials({
      ...credentials,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(credentials);

    if (result.success) {
      // Check for returnUrl query parameter
      const searchParams = new URLSearchParams(location.search);
      const returnUrl = searchParams.get('returnUrl');

      if (returnUrl && isValidReturnUrl(returnUrl)) {
        // Redirect to the intended page
        navigate(returnUrl);
      } else {
        // Redirect to last visited location or home
        const lastProvince = localStorage.getItem('lastProvince');
        const lastMunicipality = localStorage.getItem('lastMunicipality');

        if (lastProvince && lastMunicipality && lastMunicipality !== 'all') {
          navigate(`/${lastProvince}/${lastMunicipality}`);
        } else if (lastProvince) {
          navigate(`/${lastProvince}`);
        } else {
          navigate('/');
        }
      }
    } else {
      setError(result.error);
    }

    setLoading(false);
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1 onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>🏝️ IslaList</h1>
        <h2>Login</h2>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="username">Username or Email</label>
            <input
              type="text"
              id="username"
              name="username"
              value={credentials.username}
              onChange={handleChange}
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={credentials.password}
              onChange={handleChange}
              required
              disabled={loading}
            />
          </div>

          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <p className="auth-link">
          <Link to="/forgot-password">Forgot your password?</Link>
        </p>

        <p className="auth-link">
          Don't have an account? <Link to="/register">Register here</Link>
        </p>

        <p className="auth-link">
          <button
            onClick={() => navigate(-1)}
            className="btn-link"
            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', textDecoration: 'none' }}
          >
            🡐 Back to previous page
          </button>
        </p>

        <p className="auth-link">
          <Link to="/">🡐 Back to Home</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
