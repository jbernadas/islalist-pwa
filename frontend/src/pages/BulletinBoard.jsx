import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { provincesAPI } from '../services/api';
import { slugify } from '../utils/slugify';
import Header from '../components/Header';
import './BulletinBoard.css';

const BulletinBoard = () => {
  const { province, municipality } = useParams();
  const navigate = useNavigate();
  const [provinces, setProvinces] = useState([]);
  const [municipalities, setMunicipalities] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch provinces and municipalities
  useEffect(() => {
    if (!province) {
      navigate('/');
      return;
    }

    // Redirect "all" municipality to province page
    if (municipality === 'all') {
      navigate(`/${province}`, { replace: true });
      return;
    }

    // Save current location to localStorage
    localStorage.setItem('lastProvince', province);
    if (municipality) {
      localStorage.setItem('lastMunicipality', municipality);
    }

    const fetchLocations = async () => {
      try {
        setLoading(true);

        // Try to get from cache first (24 hour cache)
        const cachedProvinces = localStorage.getItem('provinces');
        const cacheTime = localStorage.getItem('provinces_cache_time');
        const now = Date.now();
        const cacheExpiry = 24 * 60 * 60 * 1000; // 24 hours

        if (cachedProvinces && cacheTime && (now - parseInt(cacheTime)) < cacheExpiry) {
          const provincesData = JSON.parse(cachedProvinces);
          setProvinces(provincesData);

          const currentProv = provincesData.find(p => p.slug === province?.toLowerCase());
          if (currentProv) {
            const munResponse = await provincesAPI.getMunicipalities(currentProv.slug);
            setMunicipalities(munResponse.data);
          }
        } else {
          const response = await provincesAPI.getAll();
          const provincesData = response.data.results || response.data;
          setProvinces(Array.isArray(provincesData) ? provincesData : []);

          localStorage.setItem('provinces', JSON.stringify(provincesData));
          localStorage.setItem('provinces_cache_time', now.toString());

          if (province) {
            const munResponse = await provincesAPI.getMunicipalities(province.toLowerCase());
            setMunicipalities(munResponse.data);
          }
        }
      } catch (error) {
        console.error('Error fetching locations:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLocations();
  }, [province, municipality, navigate]);

  const PHILIPPINE_PROVINCES = provinces.map(p => p.name).sort();
  const currentMunicipalities = municipalities.map(m => m.name);

  const handleProvinceChange = (e) => {
    const selectedProvince = e.target.value;
    if (selectedProvince) {
      const provinceSlug = slugify(selectedProvince);
      navigate(`/${provinceSlug}`);
    } else {
      navigate('/');
    }
  };

  const handleMunicipalityChange = (e) => {
    const selectedMunicipality = e.target.value;
    if (selectedMunicipality) {
      const municipalitySlug = slugify(selectedMunicipality);
      navigate(`/${province}/${municipalitySlug}`);
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

  if (loading) {
    return (
      <div>
        <Header />
        <div className="container py-5">
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bulletin-board-container">
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

      <div className="bulletin-board-content">
        <div className="welcome-section">
          <h1>{displayMunicipality}</h1>
          <p className="subtitle">{displayMunicipality != "All Cities/Municipalities" ? " Community " : ( displayProvince != "Metro Manila (NCR)" ? displayProvince + " Provincial " : "Metro Manila ")} Bulletin Board</p>
        </div>

        <div className="sections-grid">
          <div className="section-card active">
            <div className="section-icon">🏷️</div>
            <h3>Listings & Classifieds</h3>
            <p>Browse and post classified ads, items for sale, rentals, and more.</p>
            <Link
              to={`/${province}/${municipality}/listings`}
              className="btn-primary btn-width-available"
            >
              View Listings
            </Link>
          </div>

          <div className="section-card disabled">
            <div className="section-icon">📅</div>
            <h3>Events</h3>
            <p>Discover local events and activities happening in your community.</p>
            <button className="btn-secondary" disabled>
              Coming Soon
            </button>
          </div>

          <div className="section-card active">
            <div className="section-icon">📢</div>
            <h3>Announcements</h3>
            <p>Stay updated with community announcements and important notices.</p>
            <Link
              to={`/${province}/${municipality}/announcements`}
              className="btn-primary btn-width-available"
            >
              View Announcements
            </Link>
          </div>
        </div>

        <div className="back-link">
          <Link to={`/${province}`}>
            🡐 View {displayProvince} {displayProvince != "Metro Manila (NCR)" ? "Province" : ""} Bulletin Board
          </Link>
        </div>
      </div>
    </div>
  );
};

export default BulletinBoard;
