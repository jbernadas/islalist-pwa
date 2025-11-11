import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { authAPI } from '../services/api';
import Header from '../components/Header';
import './Profile.css';

const Profile = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone_number: '',
  });

  useEffect(() => {
    if (user) {
      setFormData({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        email: user.email || '',
        phone_number: user.phone_number || '',
      });
    }
  }, [user]);

  const handleChange = (e) => {
    let value = e.target.value;

    // Format phone number as user types
    if (e.target.name === 'phone_number') {
      const cleaned = value.replace(/\D/g, '');
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

    if (!formData.email.includes('@')) {
      newErrors.email = 'Please enter a valid email';
    }

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

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      const response = await authAPI.updateProfile(formData);

      // Update local user state with new data
      const updatedUser = { ...user, ...response.data };
      localStorage.setItem('user', JSON.stringify(updatedUser));

      // Trigger a page reload to refresh user context
      window.location.reload();

      setIsEditing(false);
    } catch (error) {
      console.error('Profile update error:', error);

      if (error.response?.data) {
        setErrors(error.response.data);
      } else {
        setErrors({
          detail: 'Failed to update profile. Please try again.'
        });
      }
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="profile-container">
      <Header pageTitle="My Profile" />

      <div className="profile-content">
        <div className="profile-card">
          <div className="profile-avatar">
            <div className="avatar-placeholder">
              {user.first_name?.[0]?.toUpperCase() || user.username?.[0]?.toUpperCase()}
            </div>
          </div>

          <div className="profile-info">
            <h2>@{user.username}</h2>

            {!isEditing ? (
              <>
                <div className="info-section">
                  <div className="info-item">
                    <span className="label">Name</span>
                    <span className="value">
                      {user.first_name} {user.last_name}
                    </span>
                  </div>
                  <div className="info-item">
                    <span className="label">Email</span>
                    <span className="value">{user.email}</span>
                  </div>
                  <div className="info-item">
                    <span className="label">Phone</span>
                    <span className="value">
                      {user.phone_number || 'Not provided'}
                    </span>
                  </div>
                </div>

                <div className="profile-actions">
                  <button
                    onClick={() => setIsEditing(true)}
                    className="btn-edit"
                  >
                    Edit Profile
                  </button>
                  <button
                    onClick={() => navigate('/my-posts')}
                    className="btn-secondary"
                  >
                    My Posts
                  </button>
                </div>
              </>
            ) : (
              <form onSubmit={handleSubmit} className="edit-form">
                {errors.detail && (
                  <div className="error-message" style={{
                    color: '#dc3545',
                    background: '#f8d7da',
                    padding: '1rem',
                    borderRadius: '6px',
                    marginBottom: '1rem'
                  }}>
                    {errors.detail}
                  </div>
                )}

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
                  {errors.email && (
                    <span className="field-error">{errors.email}</span>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="phone_number">Phone Number</label>
                  <input
                    type="tel"
                    id="phone_number"
                    name="phone_number"
                    value={formData.phone_number}
                    onChange={handleChange}
                    placeholder="09651234567"
                    maxLength="11"
                    disabled={loading}
                  />
                  {errors.phone_number && (
                    <span className="field-error">{errors.phone_number}</span>
                  )}
                </div>

                <div className="form-actions">
                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-save"
                  >
                    {loading ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditing(false);
                      setErrors({});
                      // Reset form data
                      setFormData({
                        first_name: user.first_name || '',
                        last_name: user.last_name || '',
                        email: user.email || '',
                        phone_number: user.phone_number || '',
                      });
                    }}
                    disabled={loading}
                    className="btn-cancel"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
