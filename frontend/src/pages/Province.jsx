import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
        <div className="province-hero">
          <h1>Welcome to {provinceName}</h1>
          <p>Select a city/municipality to browse local listings</p>
        </div>

        {loading ? (
          <div className="loading">
            <p>Loading cities/municipalities...</p>
          </div>
        ) : municipalityNames.length > 0 ? (
          <div className="municipalities-grid">
            {/* All municipalities option */}
            <div
              className="municipality-card all-municipalities"
              onClick={() => navigate(`/${province}/all`)}
            >
              <div className="municipality-icon">🗺️</div>
              <h3 className="borderless">All Cities/Municipalities</h3>
            </div>

            {municipalityNames.map((municipality) => (
              <div
                key={municipality}
                className="municipality-card"
                onClick={() => handleMunicipalityClick(municipality)}
              >
                <div className="municipality-icon">🏘️</div>
                <h3 className="borderless">{municipality}</h3>
              </div>
            ))}
          </div>
        ) : (
          <div className="no-municipalities">
            <h2>Coming Soon</h2>
            <p>Cities/Municipalities for {provinceName} will be available soon.</p>
            <button onClick={() => navigate('/siquijor')} className="btn-primary">
              Visit Siquijor
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Province;
