import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { listingsAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import './ListingDetail.css';

const ListingDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showContactInfo, setShowContactInfo] = useState(false);

  useEffect(() => {
    fetchListing();
  }, [id]);

  const fetchListing = async () => {
    try {
      const response = await listingsAPI.getById(id);
      setListing(response.data);
    } catch (error) {
      console.error('Error fetching listing:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price) => {
    if (!price) return 'Contact for price';
    return `₱${Number(price).toLocaleString()}`;
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
          Back to Listings
        </button>
      </div>
    );
  }

  const isOwner = user && listing.seller.id === user.id;

  return (
    <div className="listing-detail-container">
      <header className="detail-header">
        <button onClick={() => navigate('/')} className="btn-back">
          ← Back to Listings
        </button>
      </header>

      <div className="detail-content">
        <div className="image-gallery">
          {listing.images && listing.images.length > 0 ? (
            <>
              <div className="main-image">
                <img
                  src={listing.images[currentImageIndex].image_url}
                  alt={listing.title}
                />
                {listing.images.length > 1 && (
                  <>
                    <button className="nav-btn prev" onClick={prevImage}>‹</button>
                    <button className="nav-btn next" onClick={nextImage}>›</button>
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
            <p className="price">{formatPrice(listing.price)}</p>
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
              <p>📍 {listing.location}, {listing.island}</p>
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
                  onClick={() => navigate(`/my-listings`)}
                  className="btn-manage"
                >
                  Manage My Listings
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
  );
};

export default ListingDetail;
