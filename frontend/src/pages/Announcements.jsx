import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { announcementsAPI, provincesAPI, barangaysAPI } from '../services/api';
import { slugify } from '../utils/slugify';
import Header from '../components/Header';
import './Listings.css';

const Announcements = () => {
  const navigate = useNavigate();
  const { province, municipality } = useParams();
  const [announcements, setAnnouncements] = useState([]);
  const [provinces, setProvinces] = useState([]);
  const [municipalities, setMunicipalities] = useState([]);
  const [barangays, setBarangays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingBarangays, setLoadingBarangays] = useState(false);
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
    // Only fetch announcements after provinces and municipalities are loaded
    if (provinces.length > 0) {
      fetchAnnouncements();
    }
  }, [province, municipality, provinces, municipalities]);

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

      // Filter by province using PSGC code
      if (province) {
        const currentProvince = provinces.find(p => p.slug === province);
        if (currentProvince && currentProvince.psgc_code) {
          params.province = currentProvince.psgc_code;
        }
      }

      // Filter by municipality using PSGC code
      if (municipality && municipality.toLowerCase() !== 'all') {
        const currentMunicipality = municipalities.find(m => slugify(m.name) === municipality);
        if (currentMunicipality && currentMunicipality.psgc_code) {
          params.municipality = currentMunicipality.psgc_code;
        }
      }

      // Filter by barangay using PSGC code if present
      if (filters.barangay) {
        const barangayObj = barangays.find(b => b.id === parseInt(filters.barangay));
        if (barangayObj && barangayObj.psgc_code) {
          params.barangay = barangayObj.psgc_code;
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
  
  const currentMunicipalityObj = municipalities.find(m => slugify(m.name) === municipality);

  const currentProvince = provinces.find(p => p.slug === province);
  const displayProvince = currentProvince?.name || province
    ?.split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
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
            <span className="breadcrumb">Announcements</span>
          </div>

          {loading ? (
            <div className="loading">
              <p>Loading announcements...</p>
            </div>
          ) : announcements.length === 0 ? (
            <div className="no-listings">
              <h2>No Announcements Yet</h2>
              <p>Be the first to post an announcement!</p>
              <button onClick={() => navigate(`/${province}/${municipality}/create-announcement`)} className="btn-primary w-auto">
                + Create First Announcement
              </button>
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
                      📍 {announcement.barangay_name ? `${announcement.barangay_name}, ` : ''}
                      {announcement.municipality_name}, {announcement.province_name}
                    </p>
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
