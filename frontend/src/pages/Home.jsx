import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import api, { locationsAPI, municipalitiesAPI } from '../services/api';
import './Home.css';

const Home = () => {
  const navigate = useNavigate();
  const [provinces, setProvinces] = useState([]);
  const [provincesLoading, setProvincesLoading] = useState(true);
  const [featuredCities, setFeaturedCities] = useState([]);
  const [featuredLoading, setFeaturedLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchRef = useRef(null);
  const searchTimeoutRef = useRef(null);

  // Sort featured cities alphabetically, ignoring "City of " prefix
  const sortFeaturedCities = (cities) => {
    return [...cities].sort((a, b) => {
      const nameA = a.name.replace(/^City of /, '');
      const nameB = b.name.replace(/^City of /, '');
      return nameA.localeCompare(nameB);
    });
  };

  useEffect(() => {
    // Auto-redirect to last visited province/municipality if available
    const lastProvince = localStorage.getItem('lastProvince');
    const lastMunicipality = localStorage.getItem('lastMunicipality');

    if (lastProvince && lastMunicipality && lastMunicipality !== 'all') {
      // Redirect to specific municipality
      navigate(`/${lastProvince}/${lastMunicipality}`);
      return;
    } else if (lastProvince) {
      // Redirect to province page
      navigate(`/${lastProvince}`);
      return;
    }

    // No saved location, show home page
    fetchData();
  }, [navigate]);

  useEffect(() => {
    // Close autocomplete when clicking outside
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowAutocomplete(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      // Clear search timeout on unmount
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  const fetchData = async () => {
    try {
      const now = Date.now();
      const cacheExpiry = 24 * 60 * 60 * 1000; // 24 hours
      const CACHE_VERSION = '3'; // Increment this to force cache refresh (v3: added psgc_code)

      // Try to get provinces from cache first
      const cachedProvinces = localStorage.getItem('provinces');
      const provinceCacheTime = localStorage.getItem('provinces_cache_time');
      const cachedVersion = localStorage.getItem('provinces_cache_version');

      if (
        cachedProvinces &&
        provinceCacheTime &&
        cachedVersion === CACHE_VERSION &&
        (now - parseInt(provinceCacheTime)) < cacheExpiry
      ) {
        // Use cached provinces - instant load!
        const provincesData = JSON.parse(cachedProvinces);
        setProvinces(provincesData);
        setProvincesLoading(false);
      } else {
        // Fetch provinces fresh
        const provincesResponse = await api.get('/api/provinces/');
        // Handle both array and paginated response formats
        const provincesData = Array.isArray(provincesResponse.data)
          ? provincesResponse.data
          : (provincesResponse.data.results || provincesResponse.data);

        // Cache provinces
        localStorage.setItem('provinces', JSON.stringify(provincesData));
        localStorage.setItem('provinces_cache_time', now.toString());
        localStorage.setItem('provinces_cache_version', CACHE_VERSION);

        setProvinces(provincesData);
        setProvincesLoading(false);
      }

    } catch (error) {
      console.error('Error fetching provinces:', error);
      setProvincesLoading(false);
    }

    // Fetch featured cities
    try {
      const featuredResponse = await municipalitiesAPI.getFeatured();
      const sortedFeatured = sortFeaturedCities(featuredResponse.data);
      setFeaturedCities(sortedFeatured);
    } catch (error) {
      console.error('Error fetching featured cities:', error);
    } finally {
      setFeaturedLoading(false);
    }
  };

  const handleSearch = (query) => {
    setSearchQuery(query);

    // Clear any pending search timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (!query.trim() || query.trim().length < 2) {
      setSearchResults([]);
      setShowAutocomplete(false);
      setSearchLoading(false);
      return;
    }

    // Debounce the API call by 300ms
    setSearchLoading(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const response = await locationsAPI.search(query.trim());
        setSearchResults(response.data);
        setShowAutocomplete(response.data.length > 0);
      } catch (error) {
        console.error('Error searching locations:', error);
        setSearchResults([]);
        setShowAutocomplete(false);
      } finally {
        setSearchLoading(false);
      }
    }, 300);
  };

  const handleResultClick = (result) => {
    if (result.type === 'province') {
      navigate(`/${result.slug}`);
    } else {
      navigate(`/${result.provinceSlug}/${result.slug}`);
    }
    setSearchQuery('');
    setShowAutocomplete(false);
  };

  const handleFeaturedCityClick = (city) => {
    navigate(`/${city.province_slug}/${city.slug}`);
  };

  return (
    <div className="home-container">
      <Header showTagline={true} />

      <main className="home-content">
        {/* Search Section */}
        <div className="search-section">
          <div className="search-container" ref={searchRef}>
            <div className="search-input-wrapper">
              <span className="search-icon">🔍</span>
              <input
                type="text"
                className="search-input"
                placeholder="Search for a city or province..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                onFocus={() => searchQuery && setShowAutocomplete(true)}
              />
            </div>

            {showAutocomplete && searchResults.length > 0 && (
              <div className="autocomplete-dropdown">
                {searchResults.map((result, index) => (
                  <button
                    key={index}
                    className="autocomplete-item"
                    onClick={() => handleResultClick(result)}
                  >
                    <span className="result-icon">
                      {result.type === 'province' ? '📍' : '🏘️'}
                    </span>
                    <span className="result-text">{result.displayText}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Featured Cities Section */}
        {featuredCities.length > 0 && (
          <div className="featured-cities-section">
            <h3 className="section-title">Popular Destinations</h3>
            <p className="section-description">
              Select a popular destination to explore local listings
            </p>
            <div className="featured-cities-list">
              {featuredCities.map((city) => (
                <button
                  key={city.id}
                  className="featured-city-link"
                  onClick={() => handleFeaturedCityClick(city)}
                >
                  {city.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Browse by Province Section */}
        <div className="browse-section">
          <h3 className="section-title">Browse by Province</h3>
          <p className="section-description">
            Select a province to explore local listings and cities/municipalities
          </p>

          {provincesLoading ? (
            <div className="loading-state">
              <p>Loading provinces...</p>
            </div>
          ) : (
            <div className="provinces-list">
              {provinces.map((province) => (
                <Link
                  key={province.id}
                  to={`/${province.slug}`}
                  className="province-link"
                >
                  {province.name}
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Home;
