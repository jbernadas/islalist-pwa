import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { provincesAPI, municipalitiesAPI, listingsAPI, announcementsAPI, barangaysAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { slugify } from '../utils/slugify';
import Header from '../components/Header';
import BarangayModal from '../components/BarangayModal';
import './CityMunBulletinBoard.css';

const CityMunBulletinBoard = () => {
  const { province, municipality } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [provinces, setProvinces] = useState([]);
  const [municipalities, setMunicipalities] = useState([]);
  const [barangays, setBarangays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [recentListings, setRecentListings] = useState([]);
  const [recentAnnouncements, setRecentAnnouncements] = useState([]);
  const [urgentAnnouncements, setUrgentAnnouncements] = useState([]);
  const [stats, setStats] = useState({ listings: 0, announcements: 0 });
  const [isBarangayModalOpen, setIsBarangayModalOpen] = useState(false);
  const [isManila, setIsManila] = useState(false); // Track if current municipality is City of Manila

  // Fetch provinces and municipalities
  useEffect(() => {
    if (!province) {
      navigate('/siquijor');
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
        const cachedVersion = localStorage.getItem('provinces_cache_version');
        const now = Date.now();
        const cacheExpiry = 24 * 60 * 60 * 1000; // 24 hours
        const CACHE_VERSION = '3'; // Must match Home.jsx version

        if (cachedProvinces && cacheTime && cachedVersion === CACHE_VERSION && (now - parseInt(cacheTime)) < cacheExpiry) {
          const provincesData = JSON.parse(cachedProvinces);
          setProvinces(provincesData);

          const currentProv = provincesData.find(p => p.slug === province?.toLowerCase());
          if (currentProv) {
            const munResponse = await provincesAPI.getMunicipalities(currentProv.slug);
            setMunicipalities(munResponse.data);

            // Fetch barangays/districts for the current municipality
            const currentMun = munResponse.data.find(m => slugify(m.name) === municipality);
            if (currentMun) {
              // Check if this is City of Manila
              setIsManila(currentMun.name === 'City of Manila');

              // Use psgc_code if available (unique), otherwise fall back to slug
              // This ensures municipalities with duplicate names (like Morong) work correctly
              const municipalityIdentifier = currentMun.psgc_code || currentMun.slug;
              const barResponse = await municipalitiesAPI.getDistrictsOrBarangays(municipalityIdentifier);
              setBarangays(barResponse.data || []);
            }
          }
        } else {
          const response = await provincesAPI.getAll();
          const provincesData = response.data.results || response.data;
          setProvinces(Array.isArray(provincesData) ? provincesData : []);

          localStorage.setItem('provinces', JSON.stringify(provincesData));
          localStorage.setItem('provinces_cache_time', now.toString());
          localStorage.setItem('provinces_cache_version', CACHE_VERSION);

          if (province) {
            const munResponse = await provincesAPI.getMunicipalities(province.toLowerCase());
            setMunicipalities(munResponse.data);

            // Fetch barangays/districts for the current municipality
            const currentMun = munResponse.data.find(m => slugify(m.name) === municipality);
            if (currentMun) {
              // Check if this is City of Manila
              setIsManila(currentMun.name === 'City of Manila');

              // Use psgc_code if available (unique), otherwise fall back to slug
              // This ensures municipalities with duplicate names (like Morong) work correctly
              const municipalityIdentifier = currentMun.psgc_code || currentMun.slug;
              const barResponse = await municipalitiesAPI.getDistrictsOrBarangays(municipalityIdentifier);
              setBarangays(barResponse.data || []);
            }
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

  // Fetch recent content
  useEffect(() => {
    if (provinces.length > 0 && municipalities.length > 0) {
      fetchRecentContent();
    }
  }, [province, municipality, provinces, municipalities]);

  const fetchRecentContent = async () => {
    try {
      const currentProvince = provinces.find(p => p.slug === province);
      const currentMunicipality = municipalities.find(m => slugify(m.name) === municipality);

      if (!currentProvince || !currentMunicipality) return;

      // Use PSGC codes for filtering (reliable, portable identifiers)
      const listingsParams = {
        province: currentProvince.psgc_code,
        municipality: currentMunicipality.psgc_code,
      };

      // Announcements also use PSGC codes
      const announcementsParams = {
        province: currentProvince.psgc_code,
        municipality: currentMunicipality.psgc_code,
      };

      // Fetch recent listings (limit 3)
      const listingsResponse = await listingsAPI.getAll({ ...listingsParams, page_size: 3, ordering: '-created_at' });
      const listingsData = listingsResponse.data.results || listingsResponse.data;
      setRecentListings(Array.isArray(listingsData) ? listingsData.slice(0, 3) : []);

      // Fetch all announcements for counts
      const allAnnouncementsResponse = await announcementsAPI.getAll(announcementsParams);
      const allAnnouncements = allAnnouncementsResponse.data.results || allAnnouncementsResponse.data;

      // Fetch recent announcements (limit 3)
      const announcementsResponse = await announcementsAPI.getAll({ ...announcementsParams, page_size: 3, ordering: '-created_at' });
      const announcementsData = announcementsResponse.data.results || announcementsResponse.data;
      const announcements = Array.isArray(announcementsData) ? announcementsData : [];

      // Separate urgent from recent
      const urgent = announcements.filter(a => a.priority === 'urgent');
      const nonUrgent = announcements.filter(a => a.priority !== 'urgent').slice(0, 3);

      setUrgentAnnouncements(urgent);
      setRecentAnnouncements(nonUrgent);

      // Get stats from paginated response
      const listingsCount = listingsResponse.data.count !== undefined
        ? listingsResponse.data.count
        : (Array.isArray(listingsData) ? listingsData.length : 0);
      const announcementsCount = allAnnouncementsResponse.data.count !== undefined
        ? allAnnouncementsResponse.data.count
        : (Array.isArray(allAnnouncements) ? allAnnouncements.length : 0);

      setStats({
        listings: listingsCount,
        announcements: announcementsCount
      });

    } catch (error) {
      console.error('Error fetching recent content:', error);
    }
  };

  const currentMunicipalities = municipalities.map(m => m.name);
  const PHILIPPINE_PROVINCES = provinces.map(p => p.name).sort();

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
    if (selectedMunicipality && selectedMunicipality !== 'all') {
      const municipalitySlug = slugify(selectedMunicipality);
      navigate(`/${province}/${municipalitySlug}`);
    } else if (selectedMunicipality === 'all') {
      // Navigate back to province page
      navigate(`/${province}`);
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

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 0
    }).format(price);
  };

  const getTimeAgo = (dateString) => {
    const now = new Date();
    const date = new Date(dateString);
    const seconds = Math.floor((now - date) / 1000);

    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;
    return date.toLocaleDateString();
  };

  const getPriorityIcon = (priority) => {
    switch (priority) {
      case 'urgent': return '⚠️';
      case 'high': return '🔴';
      case 'medium': return '🟡';
      case 'low': return '🟢';
      default: return '📢';
    }
  };

  const getAnnouncementScope = (announcement) => {
    if (announcement.is_province_wide) {
      return { label: 'Province-wide', className: 'scope-province' };
    } else if (announcement.is_municipality_wide || !announcement.barangay) {
      return { label: 'Municipality-wide', className: 'scope-municipality' };
    } else {
      const barangayName = announcement.barangay_details?.name || 'Unknown Barangay';
      return { label: `Barangay: ${barangayName}`, className: 'scope-barangay' };
    }
  };

  const getListingScope = (listing) => {
    // Check if listing has barangay field populated (now barangay is ID, use barangay_name for display)
    if (listing.barangay && listing.barangay_name) {
      return { label: `Barangay: ${listing.barangay_name}`, className: 'scope-barangay' };
    }
    // Check if location matches province (province-wide)
    else if (listing.location === displayProvince) {
      return { label: 'Province-wide', className: 'scope-province' };
    }
    // Otherwise it's municipality-wide
    else {
      return { label: 'Municipality-wide', className: 'scope-municipality' };
    }
  };

  const handleOpenBarangayModal = () => {
    setIsBarangayModalOpen(true);
  };

  const handleCloseBarangayModal = () => {
    setIsBarangayModalOpen(false);
  };

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

      {/* Hero Section */}
      <div className="bulletin-hero">
        <div className="hero-overlay"></div>
        <div className="hero-content">
          <div className="d-flex justify-content-between flex-column">
            {/* Breadcrumb Navigation */}
            <div className="hero-breadcrumb">
              <Link to={`/${province}`} className="breadcrumb-link">{displayProvince}</Link>
              <span className="breadcrumb-separator"> / </span>
              <span className="breadcrumb-current">{displayMunicipality}</span>
            </div>
            <div className="hero-main">
              <div className="hero-info">
                <h1 className="hero-title">{displayMunicipality}</h1>
                <p className="hero-subtitle">
                  {displayMunicipality !== "All Cities/Municipalities"
                    ? (currentMunicipalityObj?.type === 'City' ? "City Hub" : "Municipality Hub")
                    : (displayProvince !== "Metro Manila (NCR)" ? displayProvince + " Provincial Hub" : "Metro Manila Hub")}
                </p>
              </div>
            </div>
          </div>
          {barangays.length > 0 && (
            <div
              className="hero-stats clickable-stat"
              onClick={handleOpenBarangayModal}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleOpenBarangayModal();
                }
              }}
              aria-label={`View all ${barangays.length} barangays`}
              title="Click to explore all barangays"
            >
              <div className="hero-stat-item">
                <span className="hero-stat-number">{barangays.length}</span>
                <span className="hero-stat-label">{isManila ? 'Districts' : 'Barangays'} →</span>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Sidebar Left */}    
      <div className="bulletin-board-content container-fluid">
        <div className="row d-flex justify-content-between">
          <div className="col-md-3">
            {/* Stats Section */}
            <div className="sidebar-stats">
              <div className="stat-item">
                <span className="stat-number">{stats.listings}</span>
                <span className="stat-label">Listings</span>
              </div>
              <div className="stat-item">
                <span className="stat-number">{stats.announcements}</span>
                <span className="stat-label">Announcements</span>
              </div>
            </div>

            {/* Activity Feed - Combined Recent Activity */}
            <div className="activity-feed">
              <h2>⚡ Recent Activity</h2>
              <div className="activity-list">
                {[...recentListings.map(l => ({ ...l, type: 'listing', time: l.created_at })),
                  ...recentAnnouncements.map(a => ({ ...a, type: 'announcement', time: a.created_at }))]
                  .sort((a, b) => new Date(b.time) - new Date(a.time))
                  .slice(0, 8)
                  .map((item) => (
                    <div
                      key={`${item.type}-${item.id}`}
                      className={`activity-item ${item.type}`}
                      onClick={() => navigate(`/${item.province_slug}/${item.municipality_slug}/${item.type === 'listing' ? 'listings' : 'announcements'}/${item.id}`)}
                    >
                      <span className="activity-icon">{item.type === 'listing' ? '🏷️' : '📢'}</span>
                      <span className="activity-text">
                        {item.type === 'listing'
                          ? `${item.title} - ${formatPrice(item.price)}`
                          : item.title}
                      </span>
                      <span className="activity-time">{getTimeAgo(item.time)}</span>
                    </div>
                  ))}
                {recentListings.length === 0 && recentAnnouncements.length === 0 && (
                  <div className="activity-empty">
                    <p>No recent activity in this area</p>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="col-md-9">
            {/* Urgent Alerts Banner */}
            {urgentAnnouncements.length > 0 && (
              <div className="urgent-alerts">
                <div className="urgent-header">
                  <span className="urgent-icon">🚨</span>
                  <strong>URGENT ALERTS</strong>
                </div>
                {urgentAnnouncements.map(announcement => (
                  <div
                    key={announcement.id}
                    className="urgent-item"
                    onClick={() => navigate(`/${province}/${municipality}/announcements/${announcement.id}`)}
                  >
                    <span className="urgent-title">{announcement.title}</span>
                    <span className="urgent-time">{getTimeAgo(announcement.created_at)}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Welcome Hero for Completely Empty Municipality */}
            {stats.listings === 0 && stats.announcements === 0 && (
              <div className="welcome-hero">
                <div className="welcome-content">
                  <div className="hero-icon">🏝️</div>
                  <h2>Welcome to {displayMunicipality}!</h2>
                  <p className="welcome-description">
                    This community is just getting started. Be a pioneer and help build this local hub!
                  </p>
                  {isAuthenticated ? (
                    <div className="hero-actions">
                      <Link
                        to={`/${province}/${municipality}/create-listing`}
                        className="btn-hero btn-hero-primary"
                      >
                        📝 Post First Listing
                      </Link>
                      <Link
                        to={`/${province}/${municipality}/create-announcement`}
                        className="btn-hero btn-hero-secondary"
                      >
                        📢 Post First Announcement
                      </Link>
                    </div>
                  ) : (
                    <p className="hero-hint">
                      <Link to="/register" className="hero-link">Register</Link> to post first listing or announcement
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Latest Announcements Section - Only show if announcements exist */}
            {recentAnnouncements.length > 0 && (
              <div className="announcements-section">
                <div className="section-header">
                  <h2>📢 Latest Announcements</h2>
                  <Link to={`/${province}/${municipality}/announcements`} className="view-all-link">
                    View all {stats.announcements} →
                  </Link>
                </div>
                <div className="announcements-grid">
                  {recentAnnouncements.map(announcement => {
                    const scope = getAnnouncementScope(announcement);
                    return (
                      <div
                        key={announcement.id}
                        className="announcement-card"
                        onClick={() => navigate(`/${province}/${municipality}/announcements/${announcement.id}`)}
                      >
                        <div className="announcement-header-inline">
                          <span className="priority-indicator">{getPriorityIcon(announcement.priority)}</span>
                          <span className="announcement-type-badge">{announcement.announcement_type}</span>
                        </div>
                        <h4 className="announcement-title">{announcement.title}</h4>
                        <span className={`scope-badge ${scope.className}`}>{scope.label}</span>
                        <p className="announcement-preview">
                          {announcement.description.length > 120
                            ? `${announcement.description.substring(0, 120)}...`
                            : announcement.description}
                        </p>
                        <p className="announcement-time-bottom">{getTimeAgo(announcement.created_at)}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Featured Listings Section - Only show if listings exist */}
            {recentListings.length > 0 && (
              <div className="featured-section">
                <div className="section-header">
                  <h2>🏷️ Featured Listings</h2>
                  <Link to={`/${province}/${municipality}/listings`} className="view-all-link">
                    View all {stats.listings} →
                  </Link>
                </div>
                <div className="featured-listings-grid">
                  {recentListings.map(listing => {
                    const scope = getListingScope(listing);
                    return (
                      <div
                        key={listing.id}
                        className="featured-card"
                        onClick={() => navigate(`/${listing.province_slug}/${listing.municipality_slug}/listings/${listing.id}`)}
                      >
                        {listing.first_image ? (
                          <div className="featured-image">
                            <img src={listing.first_image} alt={listing.title} />
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
                        ) : (
                          <div className="featured-image">
                            <span className="display-5">🏝️ IslaList</span>
                          </div>
                        )}
                        <div className="featured-info">
                          <h3>{listing.title}</h3>
                          <span className={`scope-badge ${scope.className}`}>{scope.label}</span>
                          <p className="featured-price">{formatPrice(listing.price)}</p>
                          <p className="featured-meta">
                            <span>{listing.category_name}</span>
                            {listing.category_name === 'Vehicles' && listing.vehicle_year && (
                              <>
                                <span>•</span>
                                <span>{listing.vehicle_year}</span>
                              </>
                            )}
                            {listing.category_name === 'Vehicles' && listing.vehicle_make && listing.vehicle_model && (
                              <>
                                <span>•</span>
                                <span>{listing.vehicle_make} {listing.vehicle_model}</span>
                              </>
                            )}
                            <span>•</span>
                            <span>{getTimeAgo(listing.created_at)}</span>
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="back-link">
              <Link to={`/${province}`}>
                ← Back to {displayProvince} {displayProvince !== "Metro Manila (NCR)" ? "Province" : ""}
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Barangay Modal */}
      <BarangayModal
        isOpen={isBarangayModalOpen}
        onClose={handleCloseBarangayModal}
        barangays={barangays}
        province={province}
        municipality={municipality}
        municipalityName={displayMunicipality}
        isManila={isManila}
      />
    </div>
  );
};

export default CityMunBulletinBoard;
