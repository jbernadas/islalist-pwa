import { useEffect, useState, Fragment } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { listingsAPI, announcementsAPI } from '../services/api';
import { useLocations } from '../hooks/useLocations';
import { slugify } from '../utils/slugify';
import Header from '../components/Header';
import './Province.css';

const Province = () => {
  const { province } = useParams();
  const navigate = useNavigate();

  // Use the centralized useLocations hook for all location data
  // This uses PSGC codes for lookups, avoiding slug collision issues
  const {
    provinces,
    municipalities,
    currentProvince,
    loading,
    displayProvinceName,
    buildAPIParams
  } = useLocations(province);

  // Handle redirects
  useEffect(() => {
    if (!province) {
      navigate('/');
      return;
    }
    // Clear municipality when on province page
    localStorage.removeItem('lastMunicipality');
  }, [province, navigate]);

  // State for recent content
  const [recentListings, setRecentListings] = useState([]);
  const [recentAnnouncements, setRecentAnnouncements] = useState([]);
  const [urgentAnnouncements, setUrgentAnnouncements] = useState([]);
  const [stats, setStats] = useState({ listings: 0, announcements: 0 });

  // State for collapsible sections on mobile
  const [announcementsExpanded, setAnnouncementsExpanded] = useState(true);
  const [listingsExpanded, setListingsExpanded] = useState(true);

  // Get city/municipality names for current province
  const municipalityNames = municipalities.map(m => m.name);
  const PHILIPPINE_PROVINCES = provinces.map(p => p.name).sort();

  // Display name is now provided by useLocations hook
  const provinceName = displayProvinceName;

  // Fetch recent content when province is loaded
  useEffect(() => {
    if (currentProvince) {
      fetchRecentContent();
    }
  }, [currentProvince]);

  const fetchRecentContent = async () => {
    try {
      if (!currentProvince) return;

      // Use PSGC codes from useLocations hook for province-level filtering
      const apiParams = buildAPIParams();

      // Fetch recent listings (limit 6 for province overview)
      const listingsResponse = await listingsAPI.getAll({ ...apiParams, page_size: 6, ordering: '-created_at' });
      const listingsData = listingsResponse.data.results || listingsResponse.data;
      setRecentListings(Array.isArray(listingsData) ? listingsData.slice(0, 6) : []);

      // Fetch all announcements for counts
      const allAnnouncementsResponse = await announcementsAPI.getAll(apiParams);
      const allAnnouncements = allAnnouncementsResponse.data.results || allAnnouncementsResponse.data;

      // Fetch urgent announcements separately (these should always show at top)
      const urgentResponse = await announcementsAPI.getAll({ ...apiParams, priority: 'urgent', ordering: '-created_at' });
      const urgentData = urgentResponse.data.results || urgentResponse.data;
      const urgent = Array.isArray(urgentData) ? urgentData : [];

      // Fetch recent non-urgent announcements for the announcements column
      const recentResponse = await announcementsAPI.getAll({ ...apiParams, page_size: 6, ordering: '-created_at' });
      const recentData = recentResponse.data.results || recentResponse.data;
      const recentAnnouncements = Array.isArray(recentData) ? recentData : [];

      // Filter out urgent from recent for the announcements column (since urgent shows separately)
      const nonUrgent = recentAnnouncements.filter(a => a.priority !== 'urgent').slice(0, 6);

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
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
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

      {/* Hero Section with Integrated Sticky Municipality Nav */}
      <div className="province-hero">
        <div className="hero-overlay"></div>
        <div className="hero-content">
          <h1 className="hero-title">Welcome to {provinceName}</h1>
          <p className="hero-subtitle">
            {municipalities.length} {municipalities.length === 1 ? 'municipality' : 'municipalities'}, one island community
          </p>
          <p className="hero-description">
            Your local marketplace for buying, selling, and staying connected
          </p>
        </div>
      </div>

      {/* Sticky Municipality Navigation - Visually Part of Hero */}
      {municipalityNames.length > 0 && (
        <nav className="municipalities-nav-hero">
          <div className="municipalities-nav-content">
            {municipalityNames.map((municipality, index) => (
              <Fragment key={municipality}>
                <Link
                  to={`/${province}/${slugify(municipality)}`}
                  className="municipality-nav-link"
                >
                  {municipality}
                </Link>
                {index < municipalityNames.length - 1 && (
                  <span className="municipality-nav-separator">•</span>
                )}
              </Fragment>
            ))}
          </div>
        </nav>
      )}

      <div className="province-content">
        {/* Urgent Alerts Banner */}
        {urgentAnnouncements.length > 0 && (
          <div className="urgent-alerts">
            <div className="urgent-header">
              <span className="urgent-icon">🚨</span>
              <strong>URGENT ALERTS</strong>
            </div>
            {urgentAnnouncements.map(announcement => {
              const urgentUrl = announcement.municipality_slug
                ? `/${announcement.province_slug}/${announcement.municipality_slug}/announcements/${announcement.id}`
                : `/${announcement.province_slug}/all/announcements/${announcement.id}`;
              const urgentLocation = announcement.municipality_name || 'Province-wide';

              return (
                <div
                  key={announcement.id}
                  className="urgent-item"
                  onClick={() => navigate(urgentUrl)}
                >
                  <span className="urgent-title">{announcement.title}</span>
                  <span className="urgent-location">{urgentLocation}</span>
                  <span className="urgent-time">{getTimeAgo(announcement.created_at)}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* Two-Column Layout: Announcements (Left) | Listings (Right) */}
        <div className="province-two-column">
          {/* Announcements Column */}
          <div className={`province-column announcements-column ${announcementsExpanded ? 'expanded' : 'collapsed'}`}>
            <div
              className="section-header"
              onClick={() => setAnnouncementsExpanded(!announcementsExpanded)}
            >
              <h2>📢 Announcements</h2>
              <div className="section-header-right">
                <Link
                  to={`/${province}/all/announcements`}
                  className="view-all-link"
                  onClick={(e) => e.stopPropagation()}
                >
                  View all {stats.announcements} 🡒
                </Link>
                <span className="collapse-toggle">{announcementsExpanded ? '▼' : '▶'}</span>
              </div>
            </div>
            <div className="section-content">
              {recentAnnouncements.length > 0 ? (
                <div className="province-announcements-list">
                  {recentAnnouncements.slice(0, 4).map(announcement => {
                    // Build correct URL based on scope
                    const announcementUrl = announcement.municipality_slug
                      ? `/${announcement.province_slug}/${announcement.municipality_slug}/announcements/${announcement.id}`
                      : `/${announcement.province_slug}/all/announcements/${announcement.id}`;
                    // Build location display
                    const locationDisplay = announcement.municipality_name || 'Province-wide';

                    return (
                      <div
                        key={announcement.id}
                        className="province-announcement-card"
                        onClick={() => navigate(announcementUrl)}
                      >
                        <div className="province-announcement-header">
                          <span className="priority-icon">{getPriorityIcon(announcement.priority)}</span>
                          <span className="announcement-type">{announcement.announcement_type}</span>
                        </div>
                        <h4>{announcement.title}</h4>
                        <p className="province-announcement-preview">
                          {announcement.description.length > 80
                            ? `${announcement.description.substring(0, 80)}...`
                            : announcement.description}
                        </p>
                        <p className="province-announcement-meta">
                          <span className="location">📍 {locationDisplay}</span>
                          <span className="time">{getTimeAgo(announcement.created_at)}</span>
                        </p>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="empty-section">
                  <p>No announcements yet</p>
                  <Link to={`/${province}/all/announcements`} className="btn-primary">
                    Post an announcement 🡒
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Listings Column */}
          <div className={`province-column listings-column ${listingsExpanded ? 'expanded' : 'collapsed'}`}>
            <div
              className="section-header"
              onClick={() => setListingsExpanded(!listingsExpanded)}
            >
              <h2>🏷️ Listings</h2>
              <div className="section-header-right">
                <Link
                  to={`/${province}/all/listings`}
                  className="view-all-link"
                  onClick={(e) => e.stopPropagation()}
                >
                  View all {stats.listings} 🡒
                </Link>
                <span className="collapse-toggle">{listingsExpanded ? '▼' : '▶'}</span>
              </div>
            </div>
            <div className="section-content">
              {recentListings.length > 0 ? (
                <div className="province-listings-list">
                  {recentListings.slice(0, 4).map(listing => (
                    <div
                      key={listing.id}
                      className="province-listing-card"
                      onClick={() => navigate(`/${listing.province_slug}/${listing.municipality_slug}/listings/${listing.id}`)}
                    >
                      <div className="province-listing-image">
                        {listing.first_image ? (
                          <img src={listing.first_image} alt={listing.title} />
                        ) : (
                          <span className="no-image-placeholder">🏝️</span>
                        )}
                      </div>
                      <div className="province-listing-info">
                        <h4>{listing.title}</h4>
                        <p className="province-listing-price">{formatPrice(listing.price)}</p>
                        <p className="province-listing-meta">
                          <span className="location">📍 {listing.municipality_name}</span>
                          <span className="time">{getTimeAgo(listing.created_at)}</span>
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-section">
                  <p>No listings yet</p>
                  <Link to={`/${province}/all/listings`} className="btn-primary">
                    Be the first to post 🡒
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Back to All Provinces */}
        <div className="back-link">
          <Link
            to="/"
            onClick={() => {
              localStorage.removeItem('lastProvince');
              localStorage.removeItem('lastMunicipality');
            }}
          >
            🡐 View All Provinces
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Province;
