import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authAPI } from '../services/api';
import './Auth.css';

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await authAPI.requestPasswordReset(email);
      setSuccess(true);
    } catch (err) {
      console.error('Password reset request error:', err);
      if (err.response?.data?.email) {
        setError(err.response.data.email[0]);
      } else if (err.response?.data?.detail) {
        setError(err.response.data.detail);
      } else {
        setError('Failed to send password reset email. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <h1 onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>🏝️ IslaList</h1>
          <h2>Check Your Email</h2>

          <div className="success-message">
            <p>✅ Password reset email sent!</p>
            <p style={{ marginTop: '15px', fontSize: '0.95rem', lineHeight: '1.6' }}>
              We've sent a password reset link to <strong>{email}</strong>.
              Please check your email and follow the instructions to reset your password.
            </p>
            <p style={{ marginTop: '15px', fontSize: '0.9rem', color: '#666' }}>
              The link will expire in 1 hour.
            </p>
          </div>

          <div style={{ marginTop: '30px' }}>
            <Link to="/login" className="btn-primary" style={{ display: 'inline-block', textDecoration: 'none', width: '100%', textAlign: 'center' }}>
              Back to Login
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
        <h2>Forgot Password</h2>

        <p style={{ marginBottom: '20px', fontSize: '0.95rem', color: '#666' }}>
          Enter your email address and we'll send you a link to reset your password.
        </p>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
              placeholder="your.email@example.com"
            />
          </div>

          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>

        <p className="auth-link">
          Remember your password? <Link to="/login">Login here</Link>
        </p>

        <p className="auth-link">
          <Link to="/">🡐 Back to Home</Link>
        </p>
      </div>
    </div>
  );
};

export default ForgotPassword;
