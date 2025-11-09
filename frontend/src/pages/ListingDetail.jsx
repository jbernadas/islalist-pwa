import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { listingsAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import './ListingDetail.css';

const ListingDetail = () => {
  const { id, province, municipality } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showContactInfo, setShowContactInfo] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [showLightbox, setShowLightbox] = useState(false);

  useEffect(() => {
    fetchListing();
  }, [id]);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && showLightbox) {
        setShowLightbox(false);
      }
    };

    if (showLightbox) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [showLightbox]);

  const fetchListing = async () => {
    try {
      const response = await listingsAPI.getById(id);
      setListing(response.data);
      setIsFavorited(response.data.is_favorited || false);
    } catch (error) {
      console.error('Error fetching listing:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFavorite = async () => {
    if (!user) {
      navigate('/login');
      return;
    }

    setFavoriteLoading(true);
    try {
      const response = await listingsAPI.toggleFavorite(id);
      setIsFavorited(response.data.is_favorited);
    } catch (error) {
      console.error('Error toggling favorite:', error);
      alert('Failed to update favorite');
    } finally {
      setFavoriteLoading(false);
    }
  };

  const formatPrice = (price, payPeriod) => {
    if (!price) return 'Contact for price';
    let priceStr = `₱${Number(price).toLocaleString()}`;

    // Add pay period suffix for job listings
    if (payPeriod && payPeriod !== 'not_applicable') {
      const periodMap = {
        'per_day': '/day',
        'monthly': '/month',
        'quarterly': '/quarter'
      };
      priceStr += ` ${periodMap[payPeriod] || ''}`;
    }

    return priceStr;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const nextImage = () => {
    if (listing.images.length > 0) {
      setCurrentImageIndex((prev) =>
        prev === listing.images.length - 1 ? 0 : prev + 1
      );
    }
  };

  const prevImage = () => {
    if (listing.images.length > 0) {
      setCurrentImageIndex((prev) =>
        prev === 0 ? listing.images.length - 1 : prev - 1
      );
    }
  };

  const openLightbox = () => {
    if (listing.images && listing.images.length > 0) {
      setShowLightbox(true);
    }
  };

  const closeLightbox = () => {
    setShowLightbox(false);
  };

  const handleLightboxClick = (e) => {
    if (e.target.classList.contains('lightbox-overlay')) {
      closeLightbox();
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading">Loading listing...</div>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="error-container">
        <h2>Listing not found</h2>
        <button onClick={() => navigate('/')} className="btn-primary">
          🡐 Back to Listings
        </button>
      </div>
    );
  }

  const isOwner = user && listing.seller.id === user.id;

  // Helper function to build municipality-scoped URLs
  const getMunicipalityPath = (path = '') => {
    return `/${province}/${municipality}${path}`;
  };

  return (
    <>
      {showLightbox && (
        <div className="lightbox-overlay" onClick={handleLightboxClick}>
          <button className="lightbox-close" onClick={closeLightbox}>×</button>
          <div className="lightbox-content">
            <img
              src={listing.images[currentImageIndex].image_url}
              alt={listing.title}
            />
            {listing.images.length > 1 && (
              <>
                <button
                  className="lightbox-nav prev"
                  onClick={(e) => { e.stopPropagation(); prevImage(); }}
                >
                  ‹
                </button>
                <button
                  className="lightbox-nav next"
                  onClick={(e) => { e.stopPropagation(); nextImage(); }}
                >
                  ›
                </button>
                <div className="lightbox-counter">
                  {currentImageIndex + 1} / {listing.images.length}
                </div>
              </>
            )}
          </div>
        </div>
      )}
      <div className="listing-detail-container">
        <header className="detail-header">
        <button onClick={() => navigate(getMunicipalityPath('/listings'))} className="btn-back">
          🡐 Back to Listings
        </button>
      </header>

      <div className="detail-content">
        <div className="image-gallery">
          {listing.images && listing.images.length > 0 ? (
            <>
              <div className="main-image" onClick={openLightbox}>
                <img
                  src={listing.images[currentImageIndex].image_url}
                  alt={listing.title}
                />
                <div className="zoom-hint">🔍 Click to zoom</div>
                {listing.images.length > 1 && (
                  <>
                    <button className="nav-btn prev" onClick={(e) => { e.stopPropagation(); prevImage(); }}>‹</button>
                    <button className="nav-btn next" onClick={(e) => { e.stopPropagation(); nextImage(); }}>›</button>
                    <div className="image-counter">
                      {currentImageIndex + 1} / {listing.images.length}
                    </div>
                  </>
                )}
              </div>
              {listing.images.length > 1 && (
                <div className="thumbnail-strip">
                  {listing.images.map((image, index) => (
                    <img
                      key={image.id}
                      src={image.image_url}
                      alt={`${listing.title} ${index + 1}`}
                      className={index === currentImageIndex ? 'active' : ''}
                      onClick={() => setCurrentImageIndex(index)}
                    />
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="no-images">
              <p>📷 No photos available</p>
            </div>
          )}
        </div>

        <div className="listing-details-section">
          <div className="price-section">
            <h1>{listing.title}</h1>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <p className="price">{formatPrice(listing.price, listing.pay_period)}</p>
              {!isOwner && (
                <button
                  onClick={handleToggleFavorite}
                  disabled={favoriteLoading}
                  className={`btn-favorite ${isFavorited ? 'favorited' : ''}`}
                  style={{
                    background: isFavorited ? '#db7faa' : '#f0f0f0',
                    color: isFavorited ? 'white' : '#666',
                    border: 'none',
                    padding: '12px 24px',
                    borderRadius: '8px',
                    cursor: favoriteLoading ? 'wait' : 'pointer',
                    fontSize: '1rem',
                    fontWeight: '600',
                    transition: 'all 0.3s'
                  }}
                  title={user ? (isFavorited ? 'Remove from favorites' : 'Add to favorites') : 'Login to favorite'}
                >
                  {favoriteLoading ? '...' : isFavorited ? '💖 Favorited' : '🤍 Add to Favorites'}
                </button>
              )}
            </div>
          </div>

          <div className="property-info">
            <div className="info-grid">
              {listing.property_type && (
                <div className="info-item">
                  <span className="label">Type</span>
                  <span className="value">{listing.property_type}</span>
                </div>
              )}
              {listing.bedrooms && (
                <div className="info-item">
                  <span className="label">Bedrooms</span>
                  <span className="value">🛏️ {listing.bedrooms}</span>
                </div>
              )}
              {listing.bathrooms && (
                <div className="info-item">
                  <span className="label">Bathrooms</span>
                  <span className="value">🚿 {listing.bathrooms}</span>
                </div>
              )}
              {listing.area_sqm && (
                <div className="info-item">
                  <span className="label">Area</span>
                  <span className="value">📏 {listing.area_sqm} m²</span>
                </div>
              )}
            </div>
          </div>

          <div className="location-section">
            <h3>Location</h3>
            <div className="location-card">
              <p>📍 {listing.barangay ? `${listing.barangay}, ` : ''}{listing.location}, {listing.island}</p>
            </div>
          </div>

          <div className="description-section">
            <h3>Description</h3>
            <p>{listing.description}</p>
          </div>

          <div className="seller-section">
            <h3>Seller Information</h3>
            <div className="seller-card">
              <div className="seller-info">
                <p><strong>👤 {listing.seller.first_name} {listing.seller.last_name}</strong></p>
                <p className="username">@{listing.seller.username}</p>
              </div>
              {!isOwner && (
                <button
                  onClick={() => setShowContactInfo(!showContactInfo)}
                  className="btn-contact"
                >
                  {showContactInfo ? 'Hide Contact' : '📞 Show Contact'}
                </button>
              )}
            </div>
            {showContactInfo && !isOwner && (
              <div className="contact-info">
                <p><strong>Email:</strong> {listing.seller.email}</p>
                {listing.seller.phone_number && (
                  <p><strong>Phone:</strong> {listing.seller.phone_number}</p>
                )}
                <p className="help-text">
                  Contact the seller directly to inquire about this listing.
                </p>
              </div>
            )}
            {isOwner && (
              <div className="owner-actions">
                <p className="owner-badge">✨ This is your listing</p>
                <button
                  onClick={() => navigate(`/my-posts`)}
                  className="btn-manage"
                >
                  Manage My Posts
                </button>
              </div>
            )}
          </div>

          <div className="meta-section">
            <p><strong>Listed:</strong> {formatDate(listing.created_at)}</p>
            <p><strong>Views:</strong> {listing.views_count}</p>
            <p><strong>Status:</strong> <span className={`status-${listing.status}`}>
              {listing.status}
            </span></p>
          </div>
        </div>
      </div>
      </div>
    </>
  );
};

export default ListingDetail;
