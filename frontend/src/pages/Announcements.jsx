import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { announcementsAPI, provincesAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { slugify } from '../utils/slugify';
import Header from '../components/Header';
import './Listings.css';

const Announcements = () => {
  const navigate = useNavigate();
  const { province, municipality } = useParams();
  const { isAuthenticated } = useAuth();
  const [announcements, setAnnouncements] = useState([]);
  const [provinces, setProvinces] = useState([]);
  const [municipalities, setMunicipalities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: '',
    priority: '',
    announcement_type: '',
    barangay: '',
  });

  useEffect(() => {
    if (!province) {
      navigate('/');
      return;
    }

    localStorage.setItem('lastProvince', province);
    if (municipality) {
      localStorage.setItem('lastMunicipality', municipality);
    }

    fetchLocations();
  }, [province]);

  useEffect(() => {
    fetchAnnouncements();
  }, [province, municipality]);

  const fetchLocations = async () => {
    try {
      const cachedProvinces = localStorage.getItem('provinces');
      const cacheTime = localStorage.getItem('provinces_cache_time');
      const now = Date.now();
      const cacheExpiry = 24 * 60 * 60 * 1000;

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
      setProvinces([]);
      setMunicipalities([]);
    }
  };

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      const params = {};

      if (filters.search) params.search = filters.search;
      if (filters.priority) params.priority = filters.priority;
      if (filters.announcement_type) params.announcement_type = filters.announcement_type;
      if (filters.barangay) params.barangay = filters.barangay;

      // Filter by province
      if (province) {
        const currentProvince = provinces.find(p => p.slug === province);
        if (currentProvince) {
          params.province = currentProvince.id;
        }
      }

      // Filter by municipality
      if (municipality && municipality.toLowerCase() !== 'all') {
        const currentMunicipality = municipalities.find(m => slugify(m.name) === municipality);
        if (currentMunicipality) {
          params.municipality = currentMunicipality.id;
        }
      }

      const response = await announcementsAPI.getAll(params);
      const data = response.data.results || response.data;
      setAnnouncements(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching announcements:', error);
      setAnnouncements([]);
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
      localStorage.removeItem('lastProvince');
      localStorage.removeItem('lastMunicipality');
      navigate('/');
    }
  };

  const handleMunicipalityChange = (e) => {
    const selectedMunicipality = e.target.value;
    if (selectedMunicipality) {
      const municipalitySlug = slugify(selectedMunicipality);
      navigate(`/${province}/${municipalitySlug}/announcements`);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchAnnouncements();
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      priority: '',
      announcement_type: '',
      barangay: '',
    });
    setTimeout(() => fetchAnnouncements(), 0);
  };

  const getPriorityBadgeClass = (priority) => {
    switch (priority) {
      case 'urgent': return 'priority-badge urgent';
      case 'high': return 'priority-badge high';
      case 'medium': return 'priority-badge medium';
      case 'low': return 'priority-badge low';
      default: return 'priority-badge';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const PHILIPPINE_PROVINCES = provinces.map(p => p.name).sort();
  const currentMunicipalities = municipalities.map(m => m.name);

  const currentProvince = provinces.find(p => p.slug === province);
  const displayProvince = currentProvince?.name || province
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
                placeholder="Search announcements..."
              />
            </div>

            <div className="filter-group">
              <label>Priority</label>
              <select name="priority" value={filters.priority} onChange={handleFilterChange}>
                <option value="">All Priorities</option>
                <option value="urgent">⚠️ Urgent</option>
                <option value="high">🔴 High</option>
                <option value="medium">🟡 Medium</option>
                <option value="low">🟢 Low</option>
              </select>
            </div>

            <div className="filter-group">
              <label>Type</label>
              <select name="announcement_type" value={filters.announcement_type} onChange={handleFilterChange}>
                <option value="">All Types</option>
                <option value="general">General</option>
                <option value="government">Government</option>
                <option value="community">Community</option>
                <option value="alert">Alert</option>
                <option value="infrastructure">Infrastructure</option>
                <option value="safety">Safety</option>
                <option value="health">Health</option>
                <option value="business">Business</option>
              </select>
            </div>

            <div className="filter-group">
              <label>Barangay</label>
              <input
                type="text"
                name="barangay"
                value={filters.barangay}
                onChange={handleFilterChange}
                placeholder="e.g., Poblacion"
              />
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
            <button onClick={() => navigate(`/${province}`)} className="nav-link">
              🡐 Back to {displayProvince} {displayProvince === 'Metro Manila (NCR)' ? '' : 'Province'} Bulletin Board
            </button>
            <span className="nav-separator">❯</span>
            <span className="nav-not-link">Announcements</span>
          </div>

          {loading ? (
            <div className="loading">
              <p>Loading announcements...</p>
            </div>
          ) : announcements.length === 0 ? (
            <div className="no-listings">
              <h2>No Announcements Yet</h2>
              <p>Be the first to post an announcement!</p>
              {isAuthenticated && (
                <button onClick={() => navigate(`/${province}/${municipality}/create-announcement`)} className="btn-primary">
                  + Create First Announcement
                </button>
              )}
            </div>
          ) : (
            <div className="announcements-grid">
              {announcements.map(announcement => (
                <div
                  key={announcement.id}
                  className="announcement-card"
                  onClick={() => navigate(`/${province}/${municipality}/announcements/${announcement.id}`)}
                >
                  <div className="announcement-header">
                    <span className={getPriorityBadgeClass(announcement.priority)}>
                      {announcement.priority.toUpperCase()}
                    </span>
                    <span className="announcement-type">{announcement.announcement_type}</span>
                  </div>
                  <h3>{announcement.title}</h3>
                  <p className="announcement-description">
                    {announcement.description.length > 150
                      ? `${announcement.description.substring(0, 150)}...`
                      : announcement.description}
                  </p>
                  <div className="announcement-meta">
                    <p className="location">
                      📍 {announcement.barangay ? `${announcement.barangay}, ` : ''}
                      {announcement.municipality_name}, {announcement.province_name}
                    </p>
                    <p className="author">👤 {announcement.author_name}</p>
                    <p className="date">📅 {formatDate(announcement.created_at)}</p>
                    {announcement.expiry_date && (
                      <p className="expiry">⏰ Expires: {formatDate(announcement.expiry_date)}</p>
                    )}
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

export default Announcements;
