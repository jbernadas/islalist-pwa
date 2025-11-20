import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { listingsAPI, categoriesAPI, provincesAPI, barangaysAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { slugify } from '../utils/slugify';
import Header from '../components/Header';
import './Listings.css';

const Listings = () => {
  const navigate = useNavigate();
  const { province, municipality } = useParams();
  const { isAuthenticated } = useAuth();
  const [listings, setListings] = useState([]);
  const [categories, setCategories] = useState([]);
  const [provinces, setProvinces] = useState([]);
  const [municipalities, setMunicipalities] = useState([]);
  const [barangays, setBarangays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingLocations, setLoadingLocations] = useState(true);
  const [loadingBarangays, setLoadingBarangays] = useState(false);
  const [favoritingIds, setFavoritingIds] = useState(new Set());
  const [filters, setFilters] = useState({
    search: '',
    category: '',
    property_type: '',
    min_price: '',
    max_price: '',
    province: '',
    barangay: '',
  });

  // Fetch provinces and cities/municipalities from API (with caching)
  useEffect(() => {
    // If no province in URL, redirect to home page
    if (!province) {
      navigate('/');
      return;
    }

    // Save current province and municipality to localStorage for remembering last location
    localStorage.setItem('lastProvince', province);
    if (municipality) {
      localStorage.setItem('lastMunicipality', municipality);
    }

    const fetchLocations = async () => {
      try {
        setLoadingLocations(true);

        // Try to get from cache first (24 hour cache)
        const cachedProvinces = localStorage.getItem('provinces');
        const cacheTime = localStorage.getItem('provinces_cache_time');
        const now = Date.now();
        const cacheExpiry = 24 * 60 * 60 * 1000; // 24 hours

        if (cachedProvinces && cacheTime && (now - parseInt(cacheTime)) < cacheExpiry) {
          // Use cached data
          const provincesData = JSON.parse(cachedProvinces);
          setProvinces(provincesData);

          // Find current province to get cities/municipalities
          const currentProv = provincesData.find(p => p.slug === province?.toLowerCase());
          if (currentProv) {
            const munResponse = await provincesAPI.getMunicipalities(currentProv.slug);
            setMunicipalities(munResponse.data);
          }
        } else {
          // Fetch fresh data
          const response = await provincesAPI.getAll();
          const provincesData = response.data.results || response.data;
          setProvinces(Array.isArray(provincesData) ? provincesData : []);

          // Cache the data
          localStorage.setItem('provinces', JSON.stringify(provincesData));
          localStorage.setItem('provinces_cache_time', now.toString());

          // Fetch cities/municipalities for current province
          if (province) {
            const munResponse = await provincesAPI.getMunicipalities(province.toLowerCase());
            setMunicipalities(munResponse.data);
          }
        }
      } catch (error) {
        console.error('Error fetching locations:', error);
        setProvinces([]);
        setMunicipalities([]);
      } finally {
        setLoadingLocations(false);
      }
    };

    fetchLocations();
  }, [province]);

  // Fetch barangays for current municipality
  useEffect(() => {
    const fetchBarangays = async () => {
      // Only fetch if we have both province and municipality, and municipality is not 'all'
      if (!province || !municipality || municipality.toLowerCase() === 'all') {
        setBarangays([]);
        // Clear barangay filter when viewing all municipalities
        setFilters(prev => ({ ...prev, barangay: '' }));
        return;
      }

      // Find the municipality object to get its ID
      const currentMun = municipalities.find(m => slugify(m.name) === municipality);
      if (!currentMun) {
        console.log('Municipality not found in municipalities array');
        return;
      }

      try {
        setLoadingBarangays(true);
        const response = await barangaysAPI.getAll({ municipality: currentMun.id });
        setBarangays(response.data || []);
      } catch (error) {
        console.error('Error fetching barangays:', error);
        setBarangays([]);
      } finally {
        setLoadingBarangays(false);
      }
    };

    fetchBarangays();
    // Clear barangay filter when municipality changes
    setFilters(prev => ({ ...prev, barangay: '' }));
  }, [province, municipality, municipalities]);

  // Derive province names for dropdown (from API data)
  const PHILIPPINE_PROVINCES = provinces.map(p => p.name).sort();

  // Get cities/municipalities for current province
  const currentMunicipalities = municipalities.map(m => m.name);

  useEffect(() => {
    // Always fetch categories (doesn't depend on provinces)
    fetchCategories();

    // Only fetch listings if:
    // 1. No province in URL (will show all listings), OR
    // 2. Provinces have been loaded (to avoid race condition)
    if (!province || provinces.length > 0) {
      fetchListings();

      // Pre-populate province filter from URL using actual province name from API data
      if (province) {
        const provinceObj = provinces.find(p => p.slug === province);
        const provinceName = provinceObj ? provinceObj.name : province;
        setFilters(prev => ({
          ...prev,
          province: provinceName
        }));
      }
    }
  }, [province, municipality, provinces]);

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
      if (filters.barangay) params.barangay = filters.barangay;

      // ALWAYS filter by province from URL (use actual province name from API data)
      if (province) {
        const provinceObj = provinces.find(p => p.slug === province);
        const provinceName = provinceObj ? provinceObj.name : province;
        params.island = provinceName; // Backend uses 'island' field for province
        params.province = province; // Also send slug format for municipality filtering logic
      }

      // Add city/municipality filter from URL if not 'all'
      if (municipality && municipality.toLowerCase() !== 'all') {
        params.municipality = municipality;
      }

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

  const handleProvinceChange = (e) => {
    const selectedProvince = e.target.value;
    if (selectedProvince) {
      const provinceSlug = slugify(selectedProvince);
      navigate(`/${provinceSlug}`);
    } else {
      // "All Provinces" selected - clear saved location and go to home page
      localStorage.removeItem('lastProvince');
      localStorage.removeItem('lastMunicipality');
      navigate('/');
    }
  };

  const handleMunicipalityChange = (e) => {
    const selectedMunicipality = e.target.value;
    if (selectedMunicipality) {
      const municipalitySlug = slugify(selectedMunicipality);
      navigate(`/${province}/${municipalitySlug}/listings`);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchListings();
  };

  const clearFilters = () => {
    // Use actual province name from API data
    const provinceObj = provinces.find(p => p.slug === province);
    const provinceName = provinceObj ? provinceObj.name : (province || '');
    setFilters({
      search: '',
      category: '',
      property_type: '',
      min_price: '',
      max_price: '',
      province: provinceName,
      barangay: '',
    });
    setTimeout(() => fetchListings(), 0);
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

  // Helper function to build municipality-scoped URLs
  const getMunicipalityPath = (path = '') => {
    return `/${province}/${municipality}${path}`;
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

  // Get proper display names from API data
  const currentProvince = provinces.find(p => p.slug === province);
  const displayProvince = currentProvince?.name || province
    ?.split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  const currentMunicipalityObj = municipalities.find(m => slugify(m.name) === municipality);
  const displayMunicipality = municipality === 'all'
    ? 'All Cities/Municipalities'
    : currentMunicipalityObj?.name || municipality
        ?.split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');

  return (
    <div className="listings-container">
      <Header
        showProvinceSelector={true}
        showMunicipalitySelector={true}
        province={province}
        municipality={municipality}
        provinces={PHILIPPINE_PROVINCES}
        municipalities={currentMunicipalities}
        onProvinceChange={handleProvinceChange}
        onMunicipalityChange={handleMunicipalityChange}
      />

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

            {municipality && municipality.toLowerCase() !== 'all' && (
              <div className="filter-group">
                <label>Barangay</label>
                <select
                  name="barangay"
                  value={filters.barangay}
                  onChange={handleFilterChange}
                  disabled={loadingBarangays}
                >
                  <option value="">All Barangays</option>
                  {barangays.map(brgy => (
                    <option key={brgy.id} value={brgy.id}>
                      {brgy.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

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
          <div className="listings-navigation">
            <button onClick={() => navigate(`/${province}`)} className="nav-link breadcrumb">
              🡐 Back to {displayProvince} {displayProvince === 'Metro Manila (NCR)' ? '' : 'Province'} Bulletin Board
            </button>
            <span className="nav-separator">❯</span>
            <button onClick={() => navigate(`/${province}/${municipality}`)} className="nav-link breadcrumb">
              {displayMunicipality}
            </button>
            <span className="nav-separator">❯</span>
            <span className="breadcrumb">Goods, Jobs & Services</span>
          </div>
          {loading || loadingLocations ? (
            <div className="loading">
              <p>{loadingLocations ? 'Loading location data...' : 'Loading listings...'}</p>
            </div>
          ) : listings.length === 0 ? (
            <div className="no-listings">
              <h2>No Listings Yet</h2>
              <p>Be the first to post a property on IslaList!</p>
              {isAuthenticated ? (
                <button onClick={() => navigate(getMunicipalityPath('/create-listing'))} className="btn-primary">
                  + Create First Listing
                </button>
              ) : (
                <div>
                  <button onClick={() => navigate('/register')} className="w-auto btn-primary">
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
                  className="listing-card featured-card"
                  onClick={() => navigate(getMunicipalityPath(`/listings/${listing.id}`))}
                >
                  <div className="listing-image featured-image">
                    {listing.first_image ? (
                      <img src={listing.first_image} alt={listing.title} />
                    ) : (
                      <div className="no-image no-image-ad-listings">🏝️ IslaList</div>
                    )}
                    {listing.category_name === 'Real Estate' && listing.property_type && (
                      <span className="property-badge">
                        {listing.property_type}
                      </span>
                    )}
                    {listing.category_name === 'Vehicles' && listing.vehicle_type && (
                      <span className="property-badge">
                        {listing.vehicle_type}
                      </span>
                    )}
                    {listing.category_name === 'Jobs' && listing.pay_period && listing.pay_period !== 'not_applicable' && (
                      <span className="property-badge">
                        {listing.pay_period.replace('_', ' ')}
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
                    <p className="price">{formatPrice(listing.price, listing.pay_period)}</p>
                    <div className="listing-details">
                      {/* Real Estate Details */}
                      {listing.bedrooms && (
                        <span>🛏️ {listing.bedrooms} bed</span>
                      )}
                      {listing.bathrooms && (
                        <span>🚿 {listing.bathrooms} bath</span>
                      )}
                      {listing.area_sqm && (
                        <span>📏 {listing.area_sqm} m²</span>
                      )}
                      {/* Vehicle Details */}
                      {listing.vehicle_year && (
                        <span>📅 {listing.vehicle_year}</span>
                      )}
                      {listing.vehicle_make && listing.vehicle_model && (
                        <span>🚗 {listing.vehicle_make} {listing.vehicle_model}</span>
                      )}
                    </div>
                    <p className="location">
                      📍 {listing.barangay_name ? `${listing.barangay_name}, ` : ''}{listing.location}, {listing.island}
                    </p>
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
