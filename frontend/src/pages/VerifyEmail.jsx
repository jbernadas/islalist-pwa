import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { authAPI } from '../services/api';
import './Auth.css';

const VerifyEmail = () => {
  const { key } = useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('verifying'); // verifying, success, error
  const [message, setMessage] = useState('');

  useEffect(() => {
    verifyEmail();
  }, [key]);

  const verifyEmail = async () => {
    try {
      await authAPI.verifyEmail(key);
      setStatus('success');
      setMessage('Your email has been verified successfully! You can now login and start posting.');

      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (error) {
      setStatus('error');
      if (error.response?.data?.detail) {
        setMessage(error.response.data.detail);
      } else {
        setMessage('Email verification failed. The link may be invalid or expired.');
      }
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1 onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>🏝️ IslaList</h1>
        <h2>Email Verification</h2>

        {status === 'verifying' && (
          <div className="loading-container">
            <p>Verifying your email address...</p>
          </div>
        )}

        {status === 'success' && (
          <div className="success-message">
            <p>✅ {message}</p>
            <p style={{ marginTop: '20px', fontSize: '0.9rem', color: '#666' }}>
              Redirecting to login page...
            </p>
          </div>
        )}

        {status === 'error' && (
          <div className="error-message">
            <p>❌ {message}</p>
            <div style={{ marginTop: '20px' }}>
              <Link to="/login" className="btn-primary" style={{ display: 'inline-block', textDecoration: 'none' }}>
                Go to Login
              </Link>
            </div>
          </div>
        )}

        <p className="auth-link" style={{ marginTop: '30px' }}>
          <Link to="/">🡐 Back to Home</Link>
        </p>
      </div>
    </div>
  );
};

export default VerifyEmail;
