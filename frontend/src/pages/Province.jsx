import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { provincesAPI } from '../services/api';
import { slugify } from '../utils/slugify';
import Header from '../components/Header';
import './Province.css';

const Province = () => {
  const { province } = useParams();
  const navigate = useNavigate();
  const [provinces, setProvinces] = useState([]);
  const [municipalities, setMunicipalities] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch provinces and cities/municipalities from API (with caching)
  useEffect(() => {
    // If no province in URL, redirect to home page
    if (!province) {
      navigate('/');
      return;
    }

    // Save current province to localStorage for remembering last location
    localStorage.setItem('lastProvince', province);
    localStorage.removeItem('lastMunicipality'); // Clear municipality when on province page

    const fetchLocations = async () => {
      try {
        setLoading(true);

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
        setLoading(false);
      }
    };

    fetchLocations();
  }, [province]);

  // Get city/municipality names for current province
  const municipalityNames = municipalities.map(m => m.name);
  const PHILIPPINE_PROVINCES = provinces.map(p => p.name).sort();

  // Get proper display name from API data
  const currentProvince = provinces.find(p => p.slug === province);
  const provinceName = currentProvince?.name || province
    ?.split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ') || '';

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

  const handleMunicipalityClick = (municipality) => {
    const municipalitySlug = slugify(municipality);
    navigate(`/${province}/${municipalitySlug}`);
  };

  const handleMunicipalityChange = (e) => {
    const selectedMunicipality = e.target.value;
    if (selectedMunicipality && selectedMunicipality !== 'all') {
      const municipalitySlug = slugify(selectedMunicipality);
      navigate(`/${province}/${municipalitySlug}`);
    }
    // "All Cities/Municipalities" keeps user on province page
  };

  if (loading) {
    return (
      <div className="province-container">
        <Header
          showProvinceSelector={true}
          showMunicipalitySelector={true}
          province={province}
          municipality="all"
          provinces={PHILIPPINE_PROVINCES}
          municipalities={municipalityNames}
          onProvinceChange={handleProvinceChange}
          onMunicipalityChange={handleMunicipalityChange}
        />
        <div className="loading-container">
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="province-container">
      <Header
        showProvinceSelector={true}
        showMunicipalitySelector={true}
        province={province}
        municipality="all"
        provinces={PHILIPPINE_PROVINCES}
        municipalities={municipalityNames}
        onProvinceChange={handleProvinceChange}
        onMunicipalityChange={handleMunicipalityChange}
      />

      {/* Hero Section */}
      <div className="province-hero">
        <div className="hero-overlay"></div>
        <div className="hero-content">
          <h1 className="hero-title">Welcome to {provinceName}</h1>
          <p className="hero-subtitle">Discover the Island Paradise of the Philippines</p>
          <p className="hero-description">
            Explore local listings, community announcements, and connect with your island community
          </p>
        </div>
      </div>

      <div className="province-content">
        {/* Quick Stats */}
        <div className="stats-section">
          <div className="stat-card">
            <div className="stat-icon">🏘️</div>
            <div className="stat-number">{municipalities.length}</div>
            <div className="stat-label">Municipalities</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">🏝️</div>
            <div className="stat-number">1</div>
            <div className="stat-label">Beautiful Island</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">🌊</div>
            <div className="stat-number">∞</div>
            <div className="stat-label">Opportunities</div>
          </div>
        </div>

        {/* Explore Section */}
        <div className="explore-section">
          <h2 className="section-heading">Explore by Municipality</h2>
          <p className="section-subheading">Choose your city or town to see local listings and community updates</p>

          {municipalityNames.length > 0 && (
            <div className="municipalities-grid">
              {municipalityNames.map((municipality) => (
                <div
                  key={municipality}
                  className="municipality-card"
                  onClick={() => handleMunicipalityClick(municipality)}
                >
                  <div className="municipality-icon">📍</div>
                  <h3 className="municipality-name">{municipality}</h3>
                  <p className="municipality-tagline">Explore community</p>
                  <div className="municipality-arrow">→</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* What's Available Section */}
        <div className="features-section">
          <h2 className="section-heading">What's Available</h2>
          <p className="section-subheading">Everything you need in one island marketplace</p>

          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">🏷️</div>
              <h3>Buy & Sell Locally</h3>
              <p>Browse classifieds, find great deals, and sell your items to the island community</p>
              <Link to={`/${province}/all/listings`} className="feature-link">
                View All Listings →
              </Link>
            </div>

            <div className="feature-card">
              <div className="feature-icon">📢</div>
              <h3>Community Updates</h3>
              <p>Stay informed with local announcements, alerts, and important community news</p>
              <Link to={`/${province}/all/announcements`} className="feature-link">
                View Announcements →
              </Link>
            </div>

            <div className="feature-card disabled">
              <div className="feature-icon">📅</div>
              <h3>Local Events</h3>
              <p>Discover festivals, gatherings, and activities happening around the island</p>
              <span className="feature-link coming-soon">Coming Soon</span>
            </div>

            <div className="feature-card disabled">
              <div className="feature-icon">🏪</div>
              <h3>Business Directory</h3>
              <p>Find local businesses, services, and support your island economy</p>
              <span className="feature-link coming-soon">Coming Soon</span>
            </div>
          </div>
        </div>

        {/* Call to Action */}
        <div className="cta-section">
          <div className="cta-card">
            <h2>Join the {provinceName} Community</h2>
            <p>Start buying, selling, and connecting with your neighbors today</p>
            <div className="cta-buttons">
              <Link to={`/${province}/all/listings`} className="btn-cta-primary">
                Browse Listings
              </Link>
              <Link to="/register" className="btn-cta-secondary">
                Create Account
              </Link>
            </div>
          </div>
        </div>

        {/* Back to All Provinces */}
        <div className="back-link">
          <Link to="/">← View All Provinces</Link>
        </div>
      </div>
    </div>
  );
};

export default Province;
