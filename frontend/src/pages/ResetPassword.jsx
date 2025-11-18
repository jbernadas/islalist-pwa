import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { authAPI } from '../services/api';
import './Auth.css';

const ResetPassword = () => {
  const { uid, token } = useParams();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    new_password1: '',
    new_password2: '',
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (formData.new_password1 !== formData.new_password2) {
      setError('Passwords do not match.');
      return;
    }

    if (formData.new_password1.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    setLoading(true);

    try {
      await authAPI.confirmPasswordReset(
        uid,
        token,
        formData.new_password1,
        formData.new_password2
      );
      setSuccess(true);

      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err) {
      console.error('Password reset error:', err);
      if (err.response?.data?.new_password2) {
        setError(err.response.data.new_password2[0]);
      } else if (err.response?.data?.token) {
        setError('Invalid or expired reset link. Please request a new password reset.');
      } else if (err.response?.data?.detail) {
        setError(err.response.data.detail);
      } else {
        setError('Failed to reset password. Please try again or request a new reset link.');
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
          <h2>Password Reset Successful</h2>

          <div className="success-message">
            <p>✅ Your password has been reset successfully!</p>
            <p style={{ marginTop: '15px', fontSize: '0.95rem' }}>
              You can now login with your new password.
            </p>
            <p style={{ marginTop: '15px', fontSize: '0.9rem', color: '#666' }}>
              Redirecting to login page...
            </p>
          </div>

          <div style={{ marginTop: '30px' }}>
            <Link to="/login" className="btn-primary" style={{ display: 'inline-block', textDecoration: 'none', width: '100%', textAlign: 'center' }}>
              Go to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1 onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>🏝️ IslaList</h1>
        <h2>Reset Password</h2>

        <p style={{ marginBottom: '20px', fontSize: '0.95rem', color: '#666' }}>
          Enter your new password below.
        </p>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="new_password1">New Password</label>
            <input
              type="password"
              id="new_password1"
              name="new_password1"
              value={formData.new_password1}
              onChange={handleChange}
              required
              disabled={loading}
              minLength="8"
              placeholder="At least 8 characters"
            />
          </div>

          <div className="form-group">
            <label htmlFor="new_password2">Confirm New Password</label>
            <input
              type="password"
              id="new_password2"
              name="new_password2"
              value={formData.new_password2}
              onChange={handleChange}
              required
              disabled={loading}
              minLength="8"
              placeholder="Re-enter your password"
            />
          </div>

          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Resetting...' : 'Reset Password'}
          </button>
        </form>

        <p className="auth-link">
          <Link to="/login">🡐 Back to Login</Link>
        </p>

        <p className="auth-link">
          <Link to="/">🡐 Back to Home</Link>
        </p>
      </div>
    </div>
  );
};

export default ResetPassword;
