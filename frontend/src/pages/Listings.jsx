import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { listingsAPI, categoriesAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import './Listings.css';

const Listings = () => {
  const navigate = useNavigate();
  const { isAuthenticated, logout } = useAuth();
  const [listings, setListings] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [favoritingIds, setFavoritingIds] = useState(new Set());
  const [filters, setFilters] = useState({
    search: '',
    category: '',
    property_type: '',
    min_price: '',
    max_price: '',
    island: '',
  });

  useEffect(() => {
    fetchCategories();
    fetchListings();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await categoriesAPI.getAll();
      console.log('Categories response:', response.data);

      // Handle both paginated and non-paginated responses
      const data = response.data.results || response.data;
      setCategories(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching categories:', error);
      setCategories([]); // Set empty array on error
    }
  };

  const fetchListings = async () => {
    try {
      setLoading(true);
      const params = {};

      if (filters.search) params.search = filters.search;
      if (filters.category) params.category = filters.category;
      if (filters.property_type) params.property_type = filters.property_type;
      if (filters.min_price) params.min_price = filters.min_price;
      if (filters.max_price) params.max_price = filters.max_price;
      if (filters.island) params.island = filters.island;

      const response = await listingsAPI.getAll(params);
      console.log('Listings response:', response.data);

      // Handle both paginated and non-paginated responses
      const data = response.data.results || response.data;
      setListings(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching listings:', error);
      setListings([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchListings();
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      category: '',
      property_type: '',
      min_price: '',
      max_price: '',
      island: '',
    });
    setTimeout(() => fetchListings(), 0);
  };

  const formatPrice = (price) => {
    if (!price) return 'Contact for price';
    return `₱${Number(price).toLocaleString()}`;
  };

  const handleLogout = async () => {
    await logout();
    // Refresh the page to update the UI
    window.location.reload();
  };

  const handleToggleFavorite = async (e, listingId) => {
    e.stopPropagation(); // Prevent card click

    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    // Mark as favoriting
    setFavoritingIds(prev => new Set(prev).add(listingId));

    try {
      const response = await listingsAPI.toggleFavorite(listingId);

      // Update listing's is_favorited status
      setListings(prev =>
        prev.map(listing =>
          listing.id === listingId
            ? { ...listing, is_favorited: response.data.is_favorited }
            : listing
        )
      );
    } catch (error) {
      console.error('Error toggling favorite:', error);
      alert('Failed to update favorite');
    } finally {
      // Remove from favoriting set
      setFavoritingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(listingId);
        return newSet;
      });
    }
  };

  return (
    <div className="listings-container">
      <header className="listings-header">
        <div className="header-content">
          <div className="brand">
            <h1>🏝️ IslaList</h1>
          </div>
          <div className="header-actions">
            {isAuthenticated ? (
              <>
                <button onClick={() => navigate('/favorites')} className="btn-secondary">
                  💖 Favorites
                </button>
                <button onClick={() => navigate('/my-listings')} className="btn-secondary">
                  My Listings
                </button>
                <button onClick={() => navigate('/create-listing')} className="btn-create">
                  + Post Listing
                </button>
                <button onClick={handleLogout} className="btn-logout">
                  Logout
                </button>
              </>
            ) : (
              <>
                <button onClick={() => navigate('/login')} className="btn-secondary">
                  Login
                </button>
                <button onClick={() => navigate('/register')} className="btn-create">
                  Register
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <div className="listings-content">
        <aside className="filters-sidebar">
          <h2>Filters</h2>

          <form onSubmit={handleSearch}>
            <div className="filter-group">
              <label>Search</label>
              <input
                type="text"
                name="search"
                value={filters.search}
                onChange={handleFilterChange}
                placeholder="Search listings..."
              />
            </div>

            <div className="filter-group">
              <label>Category</label>
              <select name="category" value={filters.category} onChange={handleFilterChange}>
                <option value="">All Categories</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>
                    {cat.icon} {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label>Property Type</label>
              <select name="property_type" value={filters.property_type} onChange={handleFilterChange}>
                <option value="">All Types</option>
                <option value="house">House</option>
                <option value="land">Land</option>
                <option value="apartment">Apartment</option>
                <option value="commercial">Commercial</option>
                <option value="condo">Condominium</option>
              </select>
            </div>

            <div className="filter-group">
              <label>Island</label>
              <input
                type="text"
                name="island"
                value={filters.island}
                onChange={handleFilterChange}
                placeholder="e.g., Siquijor"
              />
            </div>

            <div className="filter-group">
              <label>Price Range</label>
              <div className="price-range">
                <input
                  type="number"
                  name="min_price"
                  value={filters.min_price}
                  onChange={handleFilterChange}
                  placeholder="Min"
                />
                <span>-</span>
                <input
                  type="number"
                  name="max_price"
                  value={filters.max_price}
                  onChange={handleFilterChange}
                  placeholder="Max"
                />
              </div>
            </div>

            <div className="filter-actions">
              <button type="submit" className="btn-apply">Apply Filters</button>
              <button type="button" onClick={clearFilters} className="btn-clear">
                Clear
              </button>
            </div>
          </form>
        </aside>

        <main className="listings-main">
          {loading ? (
            <div className="loading">
              <p>Loading listings...</p>
            </div>
          ) : listings.length === 0 ? (
            <div className="no-listings">
              <h2>No Listings Yet</h2>
              <p>Be the first to post a property on IslaList!</p>
              {isAuthenticated ? (
                <button onClick={() => navigate('/create-listing')} className="btn-primary">
                  + Create First Listing
                </button>
              ) : (
                <div>
                  <button onClick={() => navigate('/register')} className="btn-primary">
                    Register to Post
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="listings-grid">
              {listings.map(listing => (
                <div
                  key={listing.id}
                  className="listing-card"
                  onClick={() => navigate(`/listings/${listing.id}`)}
                >
                  <div className="listing-image">
                    {listing.first_image ? (
                      <img src={listing.first_image} alt={listing.title} />
                    ) : (
                      <div className="no-image no-image-ad-listings">📷 No Photo</div>
                    )}
                    {listing.property_type && (
                      <span className="property-badge">
                        {listing.property_type}
                      </span>
                    )}
                  </div>
                  <div className="listing-info">
                    <div className="listing-info-header">
                      <h3>{listing.title}</h3>
                      <button
                        className={`favorite-btn ${listing.is_favorited ? 'favorited' : ''}`}
                        onClick={(e) => handleToggleFavorite(e, listing.id)}
                        disabled={favoritingIds.has(listing.id)}
                        title={isAuthenticated
                          ? (listing.is_favorited ? 'Remove from favorites' : 'Add to favorites')
                          : 'Login to favorite'
                        }
                      >
                        {favoritingIds.has(listing.id) ? '...' : (listing.is_favorited ? '💖' : '🤍')}
                      </button>
                    </div>
                    <p className="price">{formatPrice(listing.price)}</p>
                    <div className="listing-details">
                      {listing.bedrooms && (
                        <span>🛏️ {listing.bedrooms} bed</span>
                      )}
                      {listing.bathrooms && (
                        <span>🚿 {listing.bathrooms} bath</span>
                      )}
                      {listing.area_sqm && (
                        <span>📏 {listing.area_sqm} m²</span>
                      )}
                    </div>
                    <p className="location">📍 {listing.location}, {listing.island}</p>
                    <p className="seller">👤 {listing.seller_name}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default Listings;
