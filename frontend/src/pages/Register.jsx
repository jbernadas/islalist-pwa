import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Auth.css';

const Register = () => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    password_confirm: '',
    first_name: '',
    last_name: '',
    phone_number: '',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');

  const { register, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Redirect if already logged in
  useEffect(() => {
    if (isAuthenticated) {
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
  }, [isAuthenticated, navigate]);

  const handleChange = (e) => {
    let value = e.target.value;

    // Format phone number as user types
    if (e.target.name === 'phone_number') {
      // Remove non-digits
      const cleaned = value.replace(/\D/g, '');

      // Convert 63 prefix to 0 prefix automatically
      if (cleaned.startsWith('63') && cleaned.length <= 12) {
        value = '0' + cleaned.substring(2);
      } else {
        value = cleaned;
      }
    }

    setFormData({
      ...formData,
      [e.target.name]: value,
    });
  };

  const validateForm = () => {
    const newErrors = {};

    if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    if (formData.password !== formData.password_confirm) {
      newErrors.password_confirm = 'Passwords do not match';
    }

    if (!formData.email.includes('@')) {
      newErrors.email = 'Please enter a valid email';
    }

    // Validate phone number if provided
    if (formData.phone_number) {
      const cleaned = formData.phone_number.replace(/\D/g, '');
      if (cleaned.length !== 11 || !cleaned.startsWith('0')) {
        newErrors.phone_number = 'Phone must be 11 digits starting with 0';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    const result = await register(formData);

    if (result.success) {
      // Show email verification message instead of logging in
      setRegistrationSuccess(true);
      setRegisteredEmail(formData.email);
    } else {
      setErrors(result.error);
    }

    setLoading(false);
  };

  // Show success message after registration
  if (registrationSuccess) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <h1 onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>🏝️ IslaList</h1>
          <h2>Check Your Email</h2>

          <div className="success-message">
            <p>✅ Registration successful!</p>
            <p style={{ marginTop: '15px', fontSize: '0.95rem', lineHeight: '1.6' }}>
              We've sent a verification email to <strong>{registeredEmail}</strong>.
            </p>
            <p style={{ marginTop: '15px', fontSize: '0.95rem', lineHeight: '1.6' }}>
              Please check your email and click the verification link to activate your account.
              Once verified, you'll be able to post listings and announcements.
            </p>
            <p style={{ marginTop: '15px', fontSize: '0.9rem', color: '#666' }}>
              The verification link will expire in 24 hours.
            </p>
          </div>

          <div style={{ marginTop: '30px' }}>
            <Link to="/login" className="btn-primary" style={{ display: 'inline-block', textDecoration: 'none', width: '100%', textAlign: 'center' }}>
              Go to Login
            </Link>
          </div>

          <p className="auth-link" style={{ marginTop: '20px' }}>
            <Link to="/">🡐 Back to Home</Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1 onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>🏝️ IslaList</h1>
        <h2>Register</h2>

        {errors.detail && <div className="error-message">{errors.detail}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="first_name">First Name</label>
              <input
                type="text"
                id="first_name"
                name="first_name"
                value={formData.first_name}
                onChange={handleChange}
                required
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="last_name">Last Name</label>
              <input
                type="text"
                id="last_name"
                name="last_name"
                value={formData.last_name}
                onChange={handleChange}
                required
                disabled={loading}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              required
              disabled={loading}
            />
            {errors.username && <span className="field-error">{errors.username}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              disabled={loading}
            />
            {errors.email && <span className="field-error">{errors.email}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="phone_number">Phone Number (optional)</label>
            <input
              type="tel"
              id="phone_number"
              name="phone_number"
              value={formData.phone_number}
              onChange={handleChange}
              placeholder="09651234567 or 639651234567"
              maxLength="12"
              disabled={loading}
            />
            {errors.phone_number && <span className="field-error">{errors.phone_number}</span>}
            <small style={{ display: 'block', marginTop: '4px', color: '#666', fontSize: '0.85em' }}>
              Enter 11-digit number starting with 0, or 12-digit with country code 63
            </small>
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              disabled={loading}
            />
            {errors.password && <span className="field-error">{errors.password}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="password_confirm">Confirm Password</label>
            <input
              type="password"
              id="password_confirm"
              name="password_confirm"
              value={formData.password_confirm}
              onChange={handleChange}
              required
              disabled={loading}
            />
            {errors.password_confirm && (
              <span className="field-error">{errors.password_confirm}</span>
            )}
          </div>

          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Creating account...' : 'Register'}
          </button>
        </form>

        <p className="auth-link">
          Already have an account? <Link to="/login">Login here</Link>
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

export default Register;
