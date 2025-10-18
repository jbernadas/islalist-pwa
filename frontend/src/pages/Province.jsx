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

  // Derive province names for dropdown (from API data)
  const PHILIPPINE_PROVINCES = provinces.map(p => p.name).sort();

  // Get city/municipality names for current province
  const municipalityNames = municipalities.map(m => m.name);

  // Get proper display name from API data
  const currentProvince = provinces.find(p => p.slug === province);
  const provinceName = currentProvince?.name || province
    ?.split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ') || '';

  const handleMunicipalityClick = (municipality) => {
    const municipalitySlug = slugify(municipality);
    navigate(`/${province}/${municipalitySlug}`);
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

  return (
    <div className="province-container">
      <Header
        showProvinceSelector={true}
        province={province}
        provinces={PHILIPPINE_PROVINCES}
        onProvinceChange={handleProvinceChange}
      />

      <div className="province-content">
        <div className="welcome-section province-bulletin-board">
          <h1>{provinceName}</h1>
          <p className="subtitle">
            {provinceName !== 'Metro Manila (NCR)' ? 'Provincial' : 'Metro Manila'} Bulletin Board
          </p>
        </div>

        {/* Horizontal City Navigation */}
        {!loading && municipalityNames.length > 0 && (
          <nav className="cities-nav">
            <div className="cities-nav-container">
              {municipalityNames.map((municipality, index) => (
                <span key={municipality}>
                  <button
                    className="city-link"
                    onClick={() => handleMunicipalityClick(municipality)}
                  >
                    {municipality}
                  </button>
                  {index < municipalityNames.length - 1 && <span className="city-separator"> • </span>}
                </span>
              ))}
            </div>
          </nav>
        )}

        <div className="sections-grid">
          <div className="section-card active">
            <div className="section-icon">🏷️</div>
            <h3>Listings & Classifieds</h3>
            <p>Browse and post province-wide classified ads, items for sale, rentals, and more.</p>
            <Link
              to={`/${province}/all/listings`}
              className="btn-primary btn-width-available"
            >
              View Province Listings
            </Link>
          </div>

          <div className="section-card disabled">
            <div className="section-icon">📅</div>
            <h3>Events</h3>
            <p>Discover province-wide events and activities.</p>
            <button className="btn-secondary" disabled>
              Coming Soon
            </button>
          </div>

          <div className="section-card disabled">
            <div className="section-icon">📢</div>
            <h3>Announcements</h3>
            <p>Stay updated with provincial announcements and important notices.</p>
            <button className="btn-secondary" disabled>
              Coming Soon
            </button>
          </div>
        </div>

        <div className="back-link">
          <Link to="/">🡐 View All Provinces</Link>
        </div>
      </div>
    </div>
  );
};

export default Province;
