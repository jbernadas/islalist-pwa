import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { listingsAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import './MyListings.css';

const Favorites = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFavorites();
  }, []);

  const fetchFavorites = async () => {
    try {
      setLoading(true);
      const response = await listingsAPI.getFavorites();
      setListings(response.data);
    } catch (error) {
      console.error('Error fetching favorites:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFavorite = async (id) => {
    try {
      await listingsAPI.toggleFavorite(id);
      // Remove from local state
      setListings(prev => prev.filter(listing => listing.id !== id));
    } catch (error) {
      console.error('Error removing favorite:', error);
      alert('Failed to remove from favorites');
    }
  };

  const formatPrice = (price) => {
    if (!price) return 'Contact for price';
    return `₱${Number(price).toLocaleString()}`;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className="my-listings-container">
      <header className="listings-header">
        <div className="header-content">
          <button onClick={() => navigate('/')} className="btn-back">← Home</button>
          <h1>My Favorites</h1>
          <div className="header-actions">
            <button onClick={() => navigate('/profile')} className="btn-secondary">
              Profile
            </button>
            <button onClick={handleLogout} className="btn-logout">
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="my-listings-content">
        {loading ? (
          <div className="loading">Loading favorites...</div>
        ) : listings.length === 0 ? (
          <div className="no-listings">
            <p>You haven't favorited any listings yet</p>
            <button onClick={() => navigate('/')} className="btn-primary">
              Browse Listings
            </button>
          </div>
        ) : (
          <div className="listings-list">
            {listings.map(listing => (
              <div key={listing.id} className="my-listing-card">
                <div
                  className="listing-image"
                  onClick={() => navigate(`/listings/${listing.id}`)}
                >
                  {listing.first_image ? (
                    <img src={listing.first_image} alt={listing.title} />
                  ) : (
                    <div className="no-image">📷</div>
                  )}
                  <span className={`status-badge status-${listing.status}`}>
                    {listing.status}
                  </span>
                </div>

                <div className="listing-info">
                  <div className="listing-header">
                    <h3 onClick={() => navigate(`/listings/${listing.id}`)}>
                      {listing.title}
                    </h3>
                    <p className="price">{formatPrice(listing.price)}</p>
                  </div>

                  <div className="listing-meta">
                    <span>📍 {listing.location}</span>
                    <span>👁️ {listing.views_count} views</span>
                    <span>📅 {formatDate(listing.created_at)}</span>
                  </div>

                  <div className="listing-details">
                    {listing.property_type && (
                      <span className="detail-tag">{listing.property_type}</span>
                    )}
                    {listing.bedrooms && (
                      <span className="detail-tag">🛏️ {listing.bedrooms}</span>
                    )}
                    {listing.bathrooms && (
                      <span className="detail-tag">🚿 {listing.bathrooms}</span>
                    )}
                    {listing.area_sqm && (
                      <span className="detail-tag">📏 {listing.area_sqm}m²</span>
                    )}
                  </div>

                  <div className="listing-actions">
                    <button
                      onClick={() => navigate(`/listings/${listing.id}`)}
                      className="btn-view"
                    >
                      👁️ View
                    </button>
                    <button
                      onClick={() => handleRemoveFavorite(listing.id)}
                      className="btn-remove-favorite"
                    >
                      💔 Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Favorites;
