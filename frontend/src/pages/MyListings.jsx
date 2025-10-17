import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { listingsAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import './MyListings.css';

const MyListings = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, active, sold

  useEffect(() => {
    fetchMyListings();
  }, []);

  const fetchMyListings = async () => {
    try {
      setLoading(true);
      const response = await listingsAPI.getMyListings();
      setListings(response.data);
    } catch (error) {
      console.error('Error fetching listings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkSold = async (id) => {
    if (!confirm('Mark this listing as sold?')) return;

    try {
      await listingsAPI.markSold(id);
      fetchMyListings(); // Refresh list
    } catch (error) {
      console.error('Error marking as sold:', error);
      alert('Failed to mark as sold. Please try again.');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this listing?')) return;

    try {
      await listingsAPI.delete(id);
      fetchMyListings(); // Refresh list
    } catch (error) {
      console.error('Error deleting listing:', error);
      alert('Failed to delete listing. Please try again.');
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

  const filteredListings = listings.filter(listing => {
    if (filter === 'all') return true;
    return listing.status === filter;
  });

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className="my-listings-container">
      <header className="listings-header">
        <div className="header-content">
          <button onClick={() => navigate('/')} className="btn-back">← Home</button>
          <h1>My Listings</h1>
          <div className="header-actions">
            <button onClick={() => navigate('/profile')} className="btn-secondary">
              Profile
            </button>
            <button onClick={() => navigate('/create-listing')} className="btn-create">
              + New Listing
            </button>
            <button onClick={handleLogout} className="btn-logout">
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="my-listings-content">
        <div className="filter-tabs">
          <button
            className={filter === 'all' ? 'active' : ''}
            onClick={() => setFilter('all')}
          >
            All ({listings.length})
          </button>
          <button
            className={filter === 'active' ? 'active' : ''}
            onClick={() => setFilter('active')}
          >
            Active ({listings.filter(l => l.status === 'active').length})
          </button>
          <button
            className={filter === 'sold' ? 'active' : ''}
            onClick={() => setFilter('sold')}
          >
            Sold ({listings.filter(l => l.status === 'sold').length})
          </button>
        </div>

        {loading ? (
          <div className="loading">Loading your listings...</div>
        ) : filteredListings.length === 0 ? (
          <div className="no-listings">
            <p>{filter === 'all' ? "You haven't created any listings yet" : `No ${filter} listings`}</p>
            <button onClick={() => navigate('/create-listing')} className="btn-primary">
              Create Your First Listing
            </button>
          </div>
        ) : (
          <div className="listings-list">
            {filteredListings.map(listing => (
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
                      onClick={() => navigate(`/edit-listing/${listing.id}`)}
                      className="btn-edit"
                    >
                      ✏️ Edit
                    </button>
                    {listing.status === 'active' && (
                      <button
                        onClick={() => handleMarkSold(listing.id)}
                        className="btn-sold"
                      >
                        ✓ Mark Sold
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(listing.id)}
                      className="btn-delete"
                    >
                      🗑️ Delete
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

export default MyListings;
