import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { modAPI } from '../services/api';
import { buildListingURL, buildAnnouncementURL } from '../utils/locationUtils';
import Header from '../components/Header';
import './ModDashboard.css';

const ModDashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [listings, setListings] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modStatus, setModStatus] = useState(null);

  // Filters
  const [listingStatusFilter, setListingStatusFilter] = useState('');
  const [announcementStatusFilter, setAnnouncementStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    checkModStatus();
  }, []);

  useEffect(() => {
    if (modStatus?.is_moderator) {
      fetchTabData();
    }
  }, [activeTab, modStatus]);

  const checkModStatus = async () => {
    try {
      const response = await modAPI.checkStatus();
      setModStatus(response.data);
      if (!response.data.is_moderator) {
        setError('You are not authorized to access the moderator dashboard.');
        setLoading(false);
      }
    } catch (err) {
      console.error('Error checking mod status:', err);
      setError('Failed to verify moderator status. Please try again.');
      setLoading(false);
    }
  };

  const fetchTabData = async () => {
    setLoading(true);
    try {
      switch (activeTab) {
        case 'overview':
          const statsResponse = await modAPI.getStats();
          setStats(statsResponse.data);
          break;
        case 'users':
          const usersResponse = await modAPI.getUsers();
          setUsers(usersResponse.data);
          break;
        case 'listings':
          const listingsParams = {};
          if (listingStatusFilter) listingsParams.status = listingStatusFilter;
          if (searchQuery) listingsParams.search = searchQuery;
          const listingsResponse = await modAPI.getListings(listingsParams);
          setListings(listingsResponse.data);
          break;
        case 'announcements':
          const announcementsParams = {};
          if (announcementStatusFilter !== '') {
            announcementsParams.is_active = announcementStatusFilter;
          }
          if (searchQuery) announcementsParams.search = searchQuery;
          const announcementsResponse = await modAPI.getAnnouncements(announcementsParams);
          setAnnouncements(announcementsResponse.data);
          break;
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleListingStatusChange = async (id, newStatus) => {
    const action = newStatus === 'hidden' ? 'unpublish' : 'publish';
    if (!confirm(`Are you sure you want to ${action} this listing?`)) return;

    try {
      await modAPI.updateListingStatus(id, newStatus);
      fetchTabData();
    } catch (err) {
      console.error('Error updating listing:', err);
      alert('Failed to update listing status.');
    }
  };

  const handleListingDelete = async (id, title) => {
    if (!confirm(`Are you sure you want to permanently delete "${title}"? This cannot be undone.`)) return;

    try {
      await modAPI.deleteListing(id);
      fetchTabData();
    } catch (err) {
      console.error('Error deleting listing:', err);
      alert('Failed to delete listing.');
    }
  };

  const handleAnnouncementStatusChange = async (id, isActive) => {
    const action = isActive ? 'publish' : 'unpublish';
    if (!confirm(`Are you sure you want to ${action} this announcement?`)) return;

    try {
      await modAPI.updateAnnouncementStatus(id, isActive);
      fetchTabData();
    } catch (err) {
      console.error('Error updating announcement:', err);
      alert('Failed to update announcement status.');
    }
  };

  const handleAnnouncementDelete = async (id, title) => {
    if (!confirm(`Are you sure you want to permanently delete "${title}"? This cannot be undone.`)) return;

    try {
      await modAPI.deleteAnnouncement(id);
      fetchTabData();
    } catch (err) {
      console.error('Error deleting announcement:', err);
      alert('Failed to delete announcement.');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatPrice = (price) => {
    if (!price) return 'Contact for price';
    return `₱${Number(price).toLocaleString()}`;
  };

  if (error && !modStatus?.is_moderator) {
    return (
      <div className="mod-dashboard-container">
        <Header pageTitle="Moderator Dashboard" />
        <div className="mod-dashboard-content">
          <div className="error-message">
            <h2>Access Denied</h2>
            <p>{error}</p>
            <Link to="/" className="btn-back">Back to Home</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mod-dashboard-container">
      <Header pageTitle="Moderator Dashboard" />

      <div className="mod-dashboard-content">
        {modStatus?.province && (
          <div className="mod-province-banner">
            Moderating: <strong>{modStatus.province.name}</strong>
          </div>
        )}

        <div className="mod-tabs">
          <button
            className={activeTab === 'overview' ? 'active' : ''}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
          <button
            className={activeTab === 'users' ? 'active' : ''}
            onClick={() => setActiveTab('users')}
          >
            Users
          </button>
          <button
            className={activeTab === 'listings' ? 'active' : ''}
            onClick={() => setActiveTab('listings')}
          >
            Listings
          </button>
          <button
            className={activeTab === 'announcements' ? 'active' : ''}
            onClick={() => setActiveTab('announcements')}
          >
            Announcements
          </button>
        </div>

        {loading ? (
          <div className="loading">Loading...</div>
        ) : (
          <>
            {/* Overview Tab */}
            {activeTab === 'overview' && stats && (
              <div className="overview-tab">
                <div className="stats-grid">
                  <div className="stat-card">
                    <h3>Users</h3>
                    <div className="stat-number">{stats.users.total}</div>
                    <div className="stat-details">
                      <span>{stats.users.with_listings} with listings</span>
                      <span>{stats.users.with_announcements} with announcements</span>
                    </div>
                  </div>

                  <div className="stat-card">
                    <h3>Listings</h3>
                    <div className="stat-number">{stats.listings.total}</div>
                    <div className="stat-details">
                      <span className="status-active">{stats.listings.active} active</span>
                      <span className="status-hidden">{stats.listings.hidden} hidden</span>
                      <span className="status-sold">{stats.listings.sold} sold</span>
                    </div>
                  </div>

                  <div className="stat-card">
                    <h3>Announcements</h3>
                    <div className="stat-number">{stats.announcements.total}</div>
                    <div className="stat-details">
                      <span className="status-active">{stats.announcements.active} active</span>
                      <span className="status-hidden">{stats.announcements.hidden} hidden</span>
                    </div>
                  </div>
                </div>

                <div className="quick-actions">
                  <h3>Quick Actions</h3>
                  <div className="quick-action-buttons">
                    <button onClick={() => setActiveTab('users')}>View All Users</button>
                    <button onClick={() => setActiveTab('listings')}>Manage Listings</button>
                    <button onClick={() => setActiveTab('announcements')}>Manage Announcements</button>
                  </div>
                </div>
              </div>
            )}

            {/* Users Tab */}
            {activeTab === 'users' && (
              <div className="users-tab">
                <div className="tab-header">
                  <h3>Users in {modStatus?.province?.name} ({users.length})</h3>
                </div>

                {users.length === 0 ? (
                  <div className="no-data">No users found in this province.</div>
                ) : (
                  <div className="users-table">
                    <table>
                      <thead>
                        <tr>
                          <th>Username</th>
                          <th>Email</th>
                          <th>Listings</th>
                          <th>Announcements</th>
                          <th>Joined</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.map(user => (
                          <tr key={user.id}>
                            <td>
                              <Link to={`/user/${user.username}`} className="user-link">
                                {user.username}
                              </Link>
                            </td>
                            <td>{user.email}</td>
                            <td>{user.listings_count}</td>
                            <td>{user.announcements_count}</td>
                            <td>{formatDate(user.date_joined)}</td>
                            <td>
                              <Link to={`/user/${user.username}`} className="btn-view-profile">
                                View Profile
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Listings Tab */}
            {activeTab === 'listings' && (
              <div className="listings-tab">
                <div className="tab-header">
                  <h3>Listings ({listings.length})</h3>
                  <div className="filters">
                    <select
                      value={listingStatusFilter}
                      onChange={(e) => {
                        setListingStatusFilter(e.target.value);
                        setTimeout(fetchTabData, 0);
                      }}
                    >
                      <option value="">All Status</option>
                      <option value="active">Active</option>
                      <option value="hidden">Hidden</option>
                      <option value="sold">Sold</option>
                    </select>
                    <input
                      type="text"
                      placeholder="Search title or seller..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && fetchTabData()}
                    />
                    <button onClick={fetchTabData}>Search</button>
                  </div>
                </div>

                {listings.length === 0 ? (
                  <div className="no-data">No listings found.</div>
                ) : (
                  <div className="listings-table">
                    <table>
                      <thead>
                        <tr>
                          <th>Title</th>
                          <th>Seller</th>
                          <th>Price</th>
                          <th>Location</th>
                          <th>Status</th>
                          <th>Created</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {listings.map(listing => (
                          <tr key={listing.id}>
                            <td>
                              <Link to={buildListingURL(listing)} className="listing-link">
                                {listing.title}
                              </Link>
                            </td>
                            <td>
                              <Link to={`/user/${listing.seller_username}`}>
                                {listing.seller_username}
                              </Link>
                            </td>
                            <td>{formatPrice(listing.price)}</td>
                            <td>{listing.location}</td>
                            <td>
                              <span className={`status-badge status-${listing.status}`}>
                                {listing.status}
                              </span>
                            </td>
                            <td>{formatDate(listing.created_at)}</td>
                            <td className="actions-cell">
                              {listing.status === 'active' ? (
                                <button
                                  onClick={() => handleListingStatusChange(listing.id, 'hidden')}
                                  className="btn-unpublish"
                                  title="Hide from public"
                                >
                                  Unpublish
                                </button>
                              ) : listing.status === 'hidden' ? (
                                <button
                                  onClick={() => handleListingStatusChange(listing.id, 'active')}
                                  className="btn-publish"
                                  title="Make visible to public"
                                >
                                  Publish
                                </button>
                              ) : null}
                              <button
                                onClick={() => handleListingDelete(listing.id, listing.title)}
                                className="btn-delete"
                                title="Permanently delete"
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Announcements Tab */}
            {activeTab === 'announcements' && (
              <div className="announcements-tab">
                <div className="tab-header">
                  <h3>Announcements ({announcements.length})</h3>
                  <div className="filters">
                    <select
                      value={announcementStatusFilter}
                      onChange={(e) => {
                        setAnnouncementStatusFilter(e.target.value);
                        setTimeout(fetchTabData, 0);
                      }}
                    >
                      <option value="">All Status</option>
                      <option value="true">Active</option>
                      <option value="false">Hidden</option>
                    </select>
                    <input
                      type="text"
                      placeholder="Search title or author..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && fetchTabData()}
                    />
                    <button onClick={fetchTabData}>Search</button>
                  </div>
                </div>

                {announcements.length === 0 ? (
                  <div className="no-data">No announcements found.</div>
                ) : (
                  <div className="announcements-table">
                    <table>
                      <thead>
                        <tr>
                          <th>Title</th>
                          <th>Author</th>
                          <th>Type</th>
                          <th>Location</th>
                          <th>Status</th>
                          <th>Created</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {announcements.map(announcement => (
                          <tr key={announcement.id}>
                            <td>
                              <Link to={buildAnnouncementURL(announcement)} className="announcement-link">
                                {announcement.title}
                              </Link>
                            </td>
                            <td>
                              <Link to={`/user/${announcement.author_username}`}>
                                {announcement.author_username}
                              </Link>
                            </td>
                            <td>{announcement.announcement_type}</td>
                            <td>{announcement.municipality_name}</td>
                            <td>
                              <span className={`status-badge ${announcement.is_active ? 'status-active' : 'status-hidden'}`}>
                                {announcement.is_active ? 'Active' : 'Hidden'}
                              </span>
                            </td>
                            <td>{formatDate(announcement.created_at)}</td>
                            <td className="actions-cell">
                              {announcement.is_active ? (
                                <button
                                  onClick={() => handleAnnouncementStatusChange(announcement.id, false)}
                                  className="btn-unpublish"
                                  title="Hide from public"
                                >
                                  Unpublish
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleAnnouncementStatusChange(announcement.id, true)}
                                  className="btn-publish"
                                  title="Make visible to public"
                                >
                                  Publish
                                </button>
                              )}
                              <button
                                onClick={() => handleAnnouncementDelete(announcement.id, announcement.title)}
                                className="btn-delete"
                                title="Permanently delete"
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ModDashboard;
