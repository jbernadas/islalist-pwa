import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { slugify } from '../utils/slugify';
import api from '../services/api';
import './Home.css';

const Home = () => {
  const navigate = useNavigate();
  const [provinces, setProvinces] = useState([]);
  const [allMunicipalities, setAllMunicipalities] = useState([]);
  const [provincesLoading, setProvincesLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const searchRef = useRef(null);

  // Featured major cities across Philippines
  const FEATURED_CITIES = [
    { name: 'Manila', province: 'Metro Manila (NCR)' },
    { name: 'Quezon City', province: 'Metro Manila (NCR)' },
    { name: 'Cebu City', province: 'Cebu' },
    { name: 'Davao City', province: 'Davao del Sur' },
    { name: 'Baguio City', province: 'Benguet' },
    { name: 'Iloilo City', province: 'Iloilo' },
    { name: 'Cagayan de Oro', province: 'Misamis Oriental' },
    { name: 'Bacolod', province: 'Negros Occidental' },
    { name: 'Makati', province: 'Metro Manila (NCR)' },
    { name: 'Zamboanga City', province: 'Zamboanga del Sur' },
    { name: 'Puerto Princesa', province: 'Palawan' },
    { name: 'Tagaytay', province: 'Cavite' },
    { name: 'Vigan', province: 'Ilocos Sur' },
    { name: 'Dumaguete', province: 'Negros Oriental' },
  ];

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    // Close autocomplete when clicking outside
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowAutocomplete(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchData = async () => {
    try {
      const now = Date.now();
      const cacheExpiry = 24 * 60 * 60 * 1000; // 24 hours

      // Try to get provinces from cache first
      const cachedProvinces = localStorage.getItem('provinces');
      const provinceCacheTime = localStorage.getItem('provinces_cache_time');

      if (cachedProvinces && provinceCacheTime && (now - parseInt(provinceCacheTime)) < cacheExpiry) {
        // Use cached provinces - instant load!
        const provincesData = JSON.parse(cachedProvinces);
        setProvinces(provincesData);
        setProvincesLoading(false);

        // Fetch municipalities in background for cached provinces
        fetchMunicipalities(provincesData);
      } else {
        // Fetch provinces fresh
        const provincesResponse = await api.get('/api/provinces/');
        const provincesData = provincesResponse.data;

        // Cache provinces
        localStorage.setItem('provinces', JSON.stringify(provincesData));
        localStorage.setItem('provinces_cache_time', now.toString());

        setProvinces(provincesData);
        setProvincesLoading(false);

        // Fetch municipalities in background
        fetchMunicipalities(provincesData);
      }

    } catch (error) {
      console.error('Error fetching provinces:', error);
      setProvincesLoading(false);
    }
  };

  const fetchMunicipalities = async (provincesData) => {
    try {
      const now = Date.now();
      const cacheExpiry = 24 * 60 * 60 * 1000; // 24 hours

      // Check cache for municipalities
      const cachedMunicipalities = localStorage.getItem('all_municipalities');
      const munCacheTime = localStorage.getItem('municipalities_cache_time');

      if (cachedMunicipalities && munCacheTime && (now - parseInt(munCacheTime)) < cacheExpiry) {
        // Use cached municipalities
        setAllMunicipalities(JSON.parse(cachedMunicipalities));
        return;
      }

      // Fetch all municipalities in background (non-blocking)
      const municipalitiesPromises = provincesData.map(async (province) => {
        try {
          const response = await api.get(`/api/provinces/${province.slug}/municipalities/`);
          return response.data.map(mun => ({
            ...mun,
            provinceName: province.name,
            provinceSlug: province.slug
          }));
        } catch (error) {
          console.error(`Error fetching municipalities for ${province.name}:`, error);
          return [];
        }
      });

      const municipalitiesArrays = await Promise.all(municipalitiesPromises);
      const allMuns = municipalitiesArrays.flat();

      // Cache municipalities
      localStorage.setItem('all_municipalities', JSON.stringify(allMuns));
      localStorage.setItem('municipalities_cache_time', now.toString());

      setAllMunicipalities(allMuns);
    } catch (error) {
      console.error('Error fetching municipalities:', error);
    }
  };

  const handleSearch = (query) => {
    setSearchQuery(query);

    if (!query.trim()) {
      setSearchResults([]);
      setShowAutocomplete(false);
      return;
    }

    const lowerQuery = query.toLowerCase();

    // Search provinces
    const provinceResults = provinces
      .filter(p => p.name.toLowerCase().includes(lowerQuery))
      .map(p => ({
        type: 'province',
        name: p.name,
        slug: p.slug,
        displayText: p.name
      }));

    // Search municipalities
    const municipalityResults = allMunicipalities
      .filter(m => m.name.toLowerCase().includes(lowerQuery))
      .map(m => ({
        type: 'municipality',
        name: m.name,
        provinceName: m.provinceName,
        provinceSlug: m.provinceSlug,
        displayText: `${m.name}, ${m.provinceName}`
      }));

    const combinedResults = [...provinceResults, ...municipalityResults].slice(0, 8);
    setSearchResults(combinedResults);
    setShowAutocomplete(combinedResults.length > 0);
  };

  const handleResultClick = (result) => {
    if (result.type === 'province') {
      navigate(`/${result.slug}`);
    } else {
      const munSlug = slugify(result.name);
      navigate(`/${result.provinceSlug}/${munSlug}`);
    }
    setSearchQuery('');
    setShowAutocomplete(false);
  };

  const handleFeaturedCityClick = (city) => {
    const provinceSlug = slugify(city.province);
    const citySlug = slugify(city.name);
    navigate(`/${provinceSlug}/${citySlug}`);
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
        <div className="featured-cities-section">
          <h3 className="section-title">Popular Cities</h3>
          <div className="featured-cities-list">
            {FEATURED_CITIES.map((city, index) => (
              <button
                key={index}
                className="featured-city-link"
                onClick={() => handleFeaturedCityClick(city)}
              >
                {city.name}
              </button>
            ))}
          </div>
        </div>

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
