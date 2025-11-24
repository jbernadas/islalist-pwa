import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { provincesAPI, municipalitiesAPI, listingsAPI, announcementsAPI, barangaysAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { slugify } from '../utils/slugify';
import Header from '../components/Header';
import './CityMunBulletinBoard.css';

const BarangayBulletinBoard = () => {
  const { province, municipality, barangay } = useParams();
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
  const [isDistrict, setIsDistrict] = useState(false); // Track if this is a Manila district (SubMun)
  const [currentMunicipalityData, setCurrentMunicipalityData] = useState(null);

  // Fetch provinces, municipalities, and barangays
  useEffect(() => {
    if (!province || !municipality || !barangay) {
      if (!province) navigate('/siquijor');
      else if (!municipality) navigate(`/${province}`);
      else if (!barangay) navigate(`/${province}/${municipality}`);
      return;
    }

    // Save current location to localStorage
    localStorage.setItem('lastProvince', province);
    localStorage.setItem('lastMunicipality', municipality);
    localStorage.setItem('lastBarangay', barangay);

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

        let provincesData = [];

        if (cachedProvinces && cacheTime && cachedVersion === CACHE_VERSION && (now - parseInt(cacheTime)) < cacheExpiry) {
          provincesData = JSON.parse(cachedProvinces);
          setProvinces(provincesData);
        } else {
          const response = await provincesAPI.getAll();
          provincesData = response.data.results || response.data;
          setProvinces(Array.isArray(provincesData) ? provincesData : []);

          localStorage.setItem('provinces', JSON.stringify(provincesData));
          localStorage.setItem('provinces_cache_time', now.toString());
          localStorage.setItem('provinces_cache_version', CACHE_VERSION);
        }

        const currentProv = provincesData.find(p => p.slug === province?.toLowerCase());
        if (currentProv) {
          // Fetch municipalities
          const munResponse = await provincesAPI.getMunicipalities(currentProv.slug);
          setMunicipalities(munResponse.data);

          // Special handling for City of Manila districts
          // Check if municipality is City of Manila and fetch districts
          if (municipality === 'city-of-manila') {
            try {
              const districtsResponse = await municipalitiesAPI.getDistrictsOrBarangays('city-of-manila');
              const currentDistrict = districtsResponse.data.find(d => slugify(d.name) === barangay);

              if (currentDistrict && currentDistrict.is_district) {
                // This is a Manila district (SubMun)
                setIsDistrict(true);
                setCurrentMunicipalityData(currentDistrict);

                // Fetch barangays within this district
                const barResponse = await barangaysAPI.getAll({ municipality: currentDistrict.id });
                setBarangays(barResponse.data || []);
              }
            } catch (error) {
              console.error('Error fetching Manila districts:', error);
            }
          } else {
            // Regular case: fetch barangays for the municipality
            const currentMun = munResponse.data.find(m => slugify(m.name) === municipality);
            if (currentMun) {
              setIsDistrict(false);
              setCurrentMunicipalityData(currentMun);
              const barResponse = await barangaysAPI.getAll({ municipality: currentMun.id });
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
  }, [province, municipality, barangay, navigate]);

  // Fetch recent content
  useEffect(() => {
    if (provinces.length > 0 && municipalities.length > 0 && barangays.length > 0) {
      fetchRecentContent();
    }
  }, [province, municipality, barangay, provinces, municipalities, barangays]);

  const fetchRecentContent = async () => {
    try {
      const currentProvince = provinces.find(p => p.slug === province);
      const currentMunicipality = municipalities.find(m => slugify(m.name) === municipality);
      const currentBarangay = barangays.find(b => slugify(b.name) === barangay);

      if (!currentProvince || !currentMunicipality || !currentBarangay) return;

      // Use PSGC codes for filtering (reliable, portable identifiers)
      // Backend will include: barangay-specific + municipality-wide + province-wide
      const listingsParams = {
        province: currentProvince.psgc_code,
        municipality: currentMunicipality.psgc_code,
        barangay: currentBarangay.psgc_code,
      };

      // Announcements also use PSGC codes
      // Backend will include: barangay-specific + municipality-wide (high/urgent) + province-wide (urgent)
      const announcementsParams = {
        province: currentProvince.psgc_code,
        municipality: currentMunicipality.psgc_code,
        barangay: currentBarangay.psgc_code,
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
      localStorage.removeItem('lastBarangay');
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
  const displayMunicipality = currentMunicipalityObj?.name || municipality
    ?.split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  const currentBarangayObj = barangays.find(b => slugify(b.name) === barangay);
  // For districts, use currentMunicipalityData.name; for barangays, use the barangay name
  const displayBarangay = isDistrict
    ? currentMunicipalityData?.name  // Use district name from municipality data (e.g., "Tondo I/II")
    : (currentBarangayObj?.name || barangay  // Use barangay name or fallback to slug formatting
        ?.split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' '));

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

  const getScopeLabel = (announcement) => {
    // Check if this announcement is from broader scope
    if (announcement.is_province_wide) {
      return <span className="scope-badge province-wide">Province-Wide</span>;
    }
    if (announcement.is_municipality_wide || !announcement.barangay || announcement.barangay === '') {
      return <span className="scope-badge municipality-wide">Municipality-Wide</span>;
    }
    return null;
  };

  const getListingScope = (listing) => {
    // Check if listing has barangay field populated (now barangay is ID, use barangay_name for display)
    if (listing.barangay && listing.barangay_name) {
      return { label: `Barangay: ${listing.barangay_name}`, className: 'scope-barangay' };
    }
    // Check if location matches province (province-wide)
    else if (listing.island === displayProvince) {
      return { label: 'Province-wide', className: 'scope-province' };
    }
    // Otherwise it's municipality-wide
    else {
      return { label: 'Municipality-wide', className: 'scope-municipality' };
    }
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
      <div className="bulletin-hero barangay-hero">
        <div className="hero-overlay"></div>
        <div className="hero-content">
          {/* Breadcrumb Navigation */}
          <div className="hero-breadcrumb">
            <Link to={`/${province}`} className="breadcrumb-link">{displayProvince}</Link>
            <span className="breadcrumb-separator"> / </span>
            <Link to={`/${province}/${municipality}`} className="breadcrumb-link">{displayMunicipality}</Link>
            <span className="breadcrumb-separator"> / </span>
            <span className="breadcrumb-current">{displayBarangay}</span>
            <div className="hero-main">
              <div className="hero-info">      
                <h2 className="bulletin-hero-city-municipality-in-bgy">
                  <Link to={`/${province}/${municipality}`}>{displayMunicipality}</Link>
                </h2>
              </div>
            </div>
          </div>
          <div className="hero-info text-end">
            <h1 className="hero-title">{displayBarangay}</h1>
            <p className="hero-subtitle">{isDistrict ? "District Hub" : "Barangay Hub"}</p>
          </div>
        </div>
      </div>

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
                      className="activity-item"
                      onClick={() => navigate(`/${province}/${municipality}/${item.type === 'listing' ? 'listings' : 'announcements'}/${item.id}`)}
                    >
                      <div className="activity-icon">
                        {item.type === 'listing' ? '🛒' : '📢'}
                      </div>
                      <div className="activity-content">
                        <div className="activity-title">{item.title}</div>
                        <div className="activity-meta">
                          {item.type === 'listing' && item.price && (
                            <span className="activity-price">{formatPrice(item.price)}</span>
                          )}
                          {item.type === 'announcement' && (
                            <span className={`activity-priority priority-${item.priority}`}>
                              {getPriorityIcon(item.priority)} {item.priority}
                            </span>
                          )}
                          <span className="activity-time">{getTimeAgo(item.time)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
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
                    <div className="urgent-content">
                      <span className="urgent-title">{announcement.title}</span>
                      {getScopeLabel(announcement)}
                    </div>
                    <span className="urgent-time">{getTimeAgo(announcement.created_at)}</span>
                  </div>
                ))}
              </div>
            )}

        {/* Welcome Hero for Completely Empty Barangay */}
        {stats.listings === 0 && stats.announcements === 0 && (
          <div className="welcome-hero">
            <div className="welcome-content">
              <div className="hero-icon">🏘️</div>
              <h2>Welcome to {displayBarangay}!</h2>
              <p className="welcome-description">
                This barangay is just getting started. Be a pioneer and help build this local hub!
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
                  <Link to="/login" className="hero-link">Sign in</Link> to start contributing to your community
                </p>
              )}
            </div>
          </div>
        )}

        {/* Latest Announcements Section */}
        {recentAnnouncements.length > 0 && (
          <div className="announcements-section">
            <div className="section-header">
              <h2>📢 Latest Announcements</h2>
              <Link to={`/${province}/${municipality}/announcements?barangay=${barangay}`} className="view-all-link">
                View all {stats.announcements} →
              </Link>
            </div>
            <div className="announcements-grid">
              {recentAnnouncements.map(announcement => (
                <div
                  key={announcement.id}
                  className="announcement-card"
                  onClick={() => navigate(`/${province}/${municipality}/announcements/${announcement.id}`)}
                >
                  <div className="announcement-header-inline">
                    <span className="priority-indicator">{getPriorityIcon(announcement.priority)}</span>
                    <span className="announcement-type-badge">{announcement.announcement_type}</span>
                    {getScopeLabel(announcement)}
                  </div>
                  <h4 className="announcement-title">{announcement.title}</h4>
                  <p className="announcement-preview">
                    {announcement.description.length > 120
                      ? `${announcement.description.substring(0, 120)}...`
                      : announcement.description}
                  </p>
                  <div className="announcement-meta">
                    <span className="announcement-time">{getTimeAgo(announcement.created_at)}</span>
                    {announcement.expiry_date && (
                      <span className="announcement-expiry">
                        Expires: {new Date(announcement.expiry_date).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Latest Listings Section */}
        {recentListings.length > 0 && (
          <div className="featured-section">
            <div className="section-header">
              <h2>🛒 Featured Listings</h2>
              <Link to={`/${province}/${municipality}/listings?barangay=${barangay}`} className="view-all-link">
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
                    onClick={() => navigate(`/${province}/${municipality}/listings/${listing.id}`)}
                  >
                    {listing.first_image ? (
                      <div className="featured-image">
                        <img
                          src={listing.first_image}
                          alt={listing.title}
                        />
                        {listing.category_name && (
                          <div className="featured-badge">
                            {listing.category_name === 'Real Estate' && '🏡'}
                            {listing.category_name === 'Vehicles' && '🚗'}
                            {listing.category_name === 'For Sale' && '🏷️'}
                            {listing.category_name === 'Jobs' && '💼'}
                            {listing.category_name === 'Services' && '🔧'}
                            {!['Real Estate', 'Vehicles', 'For Sale', 'Jobs', 'Services'].includes(listing.category_name) && '📦'}
                          </div>
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
                        <span>📍 {listing.barangay_name || listing.location}</span>
                        <span>👁 {listing.views_count} views</span>
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

            {/* Quick Actions */}
            {isAuthenticated && (
              <div className="quick-actions">
                <h3>Quick Actions</h3>
                <div className="actions-grid">
                  <Link
                    to={`/${province}/${municipality}/create-listing`}
                    className="action-card"
                  >
                    <span className="action-icon">📝</span>
                    <span className="action-title">Post a Listing</span>
                    <span className="action-description">Sell or rent items in {displayBarangay}</span>
                  </Link>
                  <Link
                    to={`/${province}/${municipality}/create-announcement`}
                    className="action-card"
                  >
                    <span className="action-icon">📢</span>
                    <span className="action-title">Make an Announcement</span>
                    <span className="action-description">Share news with the barangay</span>
                  </Link>
                  <Link
                    to={`/${province}/${municipality}/listings?barangay=${barangay}`}
                    className="action-card"
                  >
                    <span className="action-icon">🔍</span>
                    <span className="action-title">Browse Listings</span>
                    <span className="action-description">View all listings in {displayBarangay}</span>
                  </Link>
                  <Link
                    to={`/${province}/${municipality}/announcements?barangay=${barangay}`}
                    className="action-card"
                  >
                    <span className="action-icon">📋</span>
                    <span className="action-title">View Announcements</span>
                    <span className="action-description">See all announcements</span>
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BarangayBulletinBoard;
