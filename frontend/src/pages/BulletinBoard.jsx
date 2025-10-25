import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { provincesAPI, listingsAPI, announcementsAPI } from '../services/api';
import { slugify } from '../utils/slugify';
import Header from '../components/Header';
import './BulletinBoard.css';

const BulletinBoard = () => {
  const { province, municipality } = useParams();
  const navigate = useNavigate();
  const [provinces, setProvinces] = useState([]);
  const [municipalities, setMunicipalities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [recentListings, setRecentListings] = useState([]);
  const [recentAnnouncements, setRecentAnnouncements] = useState([]);
  const [urgentAnnouncements, setUrgentAnnouncements] = useState([]);
  const [stats, setStats] = useState({ listings: 0, announcements: 0 });

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

      const params = {
        province: currentProvince.id,
        municipality: currentMunicipality.id,
      };

      // Fetch recent listings (limit 3)
      const listingsResponse = await listingsAPI.getAll({ ...params, page_size: 3, ordering: '-created_at' });
      const listingsData = listingsResponse.data.results || listingsResponse.data;
      setRecentListings(Array.isArray(listingsData) ? listingsData.slice(0, 3) : []);

      // Fetch all announcements for counts
      const allAnnouncementsResponse = await announcementsAPI.getAll(params);
      const allAnnouncements = allAnnouncementsResponse.data.results || allAnnouncementsResponse.data;

      // Fetch recent announcements (limit 4)
      const announcementsResponse = await announcementsAPI.getAll({ ...params, page_size: 4, ordering: '-created_at' });
      const announcementsData = announcementsResponse.data.results || announcementsResponse.data;
      const announcements = Array.isArray(announcementsData) ? announcementsData : [];

      // Separate urgent from recent
      const urgent = announcements.filter(a => a.priority === 'urgent');
      const nonUrgent = announcements.filter(a => a.priority !== 'urgent').slice(0, 4);

      setUrgentAnnouncements(urgent);
      setRecentAnnouncements(nonUrgent);

      // Get stats from paginated response
      const listingsCount = listingsResponse.data.count || (Array.isArray(listingsData) ? listingsData.length : 0);
      const announcementsCount = allAnnouncementsResponse.data.count || (Array.isArray(allAnnouncements) ? allAnnouncements.length : 0);

      setStats({
        listings: listingsCount,
        announcements: announcementsCount
      });

    } catch (error) {
      console.error('Error fetching recent content:', error);
    }
  };

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
        {/* Header Section */}
        <div className="page-header">
          <div className="header-info">
            <h1>{displayMunicipality}</h1>
            <p className="subtitle">
              {displayMunicipality !== "All Cities/Municipalities" ? "Community Hub" :
               (displayProvince !== "Metro Manila (NCR)" ? displayProvince + " Provincial Hub" : "Metro Manila Hub")}
            </p>
          </div>
          <div className="quick-stats">
            <div className="stat-item">
              <span className="stat-number">{stats.listings}</span>
              <span className="stat-label">Listings</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">{stats.announcements}</span>
              <span className="stat-label">Announcements</span>
            </div>
          </div>
        </div>

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

        {/* Main Content Grid */}
        <div className="dashboard-grid">
          {/* Left Column - Featured Listing */}
          <div className="featured-section">
            <div className="section-header">
              <h2>🏷️ Featured Listings</h2>
              <Link to={`/${province}/${municipality}/listings`} className="view-all-link">
                View all {stats.listings} →
              </Link>
            </div>

            {recentListings.length > 0 ? (
              <div className="featured-listings">
                {recentListings[0] && (
                  <div
                    className="featured-card main"
                    onClick={() => navigate(`/${province}/${municipality}/listings/${recentListings[0].id}`)}
                  >
                    {recentListings[0].images && recentListings[0].images.length > 0 ? (
                      <div className="featured-image">
                        <img src={recentListings[0].images[0].image} alt={recentListings[0].title} />
                      </div>
                    ) : (
                      <div className="featured-image placeholder">
                        <span>🏷️</span>
                      </div>
                    )}
                    <div className="featured-info">
                      <h3>{recentListings[0].title}</h3>
                      <p className="featured-price">{formatPrice(recentListings[0].price)}</p>
                      <p className="featured-meta">
                        <span>{recentListings[0].property_type}</span>
                        <span>•</span>
                        <span>{getTimeAgo(recentListings[0].created_at)}</span>
                      </p>
                    </div>
                  </div>
                )}

                <div className="recent-listings-mini">
                  {recentListings.slice(1).map(listing => (
                    <div
                      key={listing.id}
                      className="listing-mini-item"
                      onClick={() => navigate(`/${province}/${municipality}/listings/${listing.id}`)}
                    >
                      <span className="listing-title">{listing.title}</span>
                      <span className="listing-price">{formatPrice(listing.price)}</span>
                    </div>
                  ))}
                  {recentListings.length < 3 && (
                    <div className="empty-state-mini">
                      <p>No more recent listings</p>
                      <Link to={`/${province}/${municipality}/create-listing`}>+ Post a listing</Link>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="empty-state">
                <p>No listings yet in this area</p>
                <Link to={`/${province}/${municipality}/create-listing`} className="btn-primary">
                  + Create First Listing
                </Link>
              </div>
            )}
          </div>

          {/* Right Column - Announcements */}
          <div className="announcements-section">
            <div className="section-header">
              <h2>📢 Latest Announcements</h2>
              <Link to={`/${province}/${municipality}/announcements`} className="view-all-link">
                View all {stats.announcements} →
              </Link>
            </div>

            {recentAnnouncements.length > 0 ? (
              <div className="announcements-list">
                {recentAnnouncements.map(announcement => (
                  <div
                    key={announcement.id}
                    className="announcement-item"
                    onClick={() => navigate(`/${province}/${municipality}/announcements/${announcement.id}`)}
                  >
                    <div className="announcement-header-inline">
                      <span className="priority-indicator">{getPriorityIcon(announcement.priority)}</span>
                      <span className="announcement-type-badge">{announcement.announcement_type}</span>
                      <span className="announcement-time">{getTimeAgo(announcement.created_at)}</span>
                    </div>
                    <h4 className="announcement-title">{announcement.title}</h4>
                    <p className="announcement-preview">
                      {announcement.description.length > 80
                        ? `${announcement.description.substring(0, 80)}...`
                        : announcement.description}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <p>No announcements yet</p>
                <Link to={`/${province}/${municipality}/create-announcement`} className="btn-primary">
                  + Create First Announcement
                </Link>
              </div>
            )}
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
                  onClick={() => navigate(`/${province}/${municipality}/${item.type === 'listing' ? 'listings' : 'announcements'}/${item.id}`)}
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

        {/* Quick Navigation */}
        <div className="quick-navigation">
          <Link to={`/${province}/${municipality}/listings`} className="nav-card listings">
            <span className="nav-icon">🏷️</span>
            <span className="nav-label">Browse All Listings</span>
          </Link>
          <Link to={`/${province}/${municipality}/announcements`} className="nav-card announcements">
            <span className="nav-icon">📢</span>
            <span className="nav-label">Browse All Announcements</span>
          </Link>
          <div className="nav-card events disabled">
            <span className="nav-icon">📅</span>
            <span className="nav-label">Events (Coming Soon)</span>
          </div>
        </div>

        <div className="back-link">
          <Link to={`/${province}`}>
            ← Back to {displayProvince} {displayProvince !== "Metro Manila (NCR)" ? "Province" : ""}
          </Link>
        </div>
      </div>
    </div>
  );
};

export default BulletinBoard;
