import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usersAPI, authAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import {
  buildListingURL,
  buildAnnouncementURL,
  buildEditListingURL,
  buildEditAnnouncementURL
} from '../utils/locationUtils';
import Header from '../components/Header';
import './PublicProfile.css';

const PublicProfile = () => {
  const { username } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();

  const [profile, setProfile] = useState(null);
  const [listings, setListings] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [filter, setFilter] = useState('all'); // all, listings, announcements

  // Edit form state
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone_number: '',
  });

  // Check if current user is viewing their own profile
  const isOwnProfile = currentUser && currentUser.username === username;

  useEffect(() => {
    fetchProfileData();
  }, [username]);

  const fetchProfileData = async () => {
    try {
      setLoading(true);

      // Fetch profile, listings, and announcements in parallel
      const [profileResponse, listingsResponse, announcementsResponse] = await Promise.all([
        usersAPI.getPublicProfile(username),
        usersAPI.getUserListings(username),
        usersAPI.getUserAnnouncements(username)
      ]);

      setProfile(profileResponse.data);
      setListings(listingsResponse.data);
      setAnnouncements(announcementsResponse.data);

      // If viewing own profile, populate edit form
      if (isOwnProfile) {
        setFormData({
          first_name: profileResponse.data.first_name || '',
          last_name: profileResponse.data.last_name || '',
          email: currentUser.email || '',
          phone_number: currentUser.phone_number || '',
        });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      if (error.response?.status === 404) {
        navigate('/');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await authAPI.updateProfile(formData);
      setIsEditing(false);
      fetchProfileData(); // Refresh profile data
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Failed to update profile. Please try again.');
    }
  };

  const handleMarkSold = async (id) => {
    if (!confirm('Mark this listing as sold?')) return;

    try {
      const { listingsAPI } = await import('../services/api');
      await listingsAPI.markSold(id);
      fetchProfileData(); // Refresh data
    } catch (error) {
      console.error('Error marking as sold:', error);
      alert('Failed to mark as sold. Please try again.');
    }
  };

  const handleDeleteListing = async (id) => {
    if (!confirm('Are you sure you want to delete this listing?')) return;

    try {
      const { listingsAPI } = await import('../services/api');
      await listingsAPI.delete(id);
      fetchProfileData(); // Refresh data
    } catch (error) {
      console.error('Error deleting listing:', error);
      alert('Failed to delete listing. Please try again.');
    }
  };

  const handleDeleteAnnouncement = async (id) => {
    if (!confirm('Are you sure you want to delete this announcement?')) return;

    try {
      const { announcementsAPI } = await import('../services/api');
      await announcementsAPI.delete(id);
      fetchProfileData(); // Refresh data
    } catch (error) {
      console.error('Error deleting announcement:', error);
      alert('Failed to delete announcement. Please try again.');
    }
  };

  const formatPrice = (price, payPeriod) => {
    if (!price) return 'Contact for price';
    let priceStr = `₱${Number(price).toLocaleString()}`;

    if (payPeriod && payPeriod !== 'not_applicable') {
      const periodMap = {
        'per_day': '/day',
        'monthly': '/month',
        'quarterly': '/quarter'
      };
      priceStr += ` ${periodMap[payPeriod] || ''}`;
    }

    return priceStr;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
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


  // Combine and sort posts
  const allPosts = [
    ...listings.map(l => ({ ...l, postType: 'listing', sortDate: new Date(l.created_at) })),
    ...announcements.map(a => ({ ...a, postType: 'announcement', sortDate: new Date(a.created_at) }))
  ].sort((a, b) => b.sortDate - a.sortDate);

  const filteredPosts = allPosts.filter(post => {
    if (filter === 'all') return true;
    if (filter === 'listings') return post.postType === 'listing';
    if (filter === 'announcements') return post.postType === 'announcement';
    return true;
  });

  if (loading) {
    return (
      <div className="public-profile-container">
        <Header />
        <div className="loading-container">
          <p>Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="public-profile-container">
        <Header />
        <div className="error-container">
          <p>Profile not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="public-profile-container">
      <Header />

      <div className="public-profile-content">
        {/* Profile Header */}
        <div className="profile-header">
          <div className="profile-info">
            {profile.profile_picture && (
              <img
                src={profile.profile_picture}
                alt={`${profile.first_name} ${profile.last_name}`}
                className="profile-picture"
              />
            )}
            <div className="profile-details">
              <h1>
                {profile.first_name} {profile.last_name}
                {profile.verified && <span className="verified-badge">✓ Verified</span>}
              </h1>
              <p className="username">@{profile.username}</p>
              {profile.bio && <p className="bio">{profile.bio}</p>}
              <div className="profile-stats">
                <span>{profile.listing_count} Listings</span>
                <span>{profile.announcement_count} Announcements</span>
              </div>
            </div>
          </div>

          {isOwnProfile && !isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="btn-edit-profile"
            >
              Edit Profile
            </button>
          )}
        </div>

        {/* Edit Form (only visible when editing own profile) */}
        {isOwnProfile && isEditing && (
          <div className="edit-profile-section">
            <h2>Edit Profile</h2>
            <form onSubmit={handleSubmit} className="edit-form">
              <div className="form-group">
                <label htmlFor="first_name">First Name</label>
                <input
                  type="text"
                  id="first_name"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="last_name">Last Name</label>
                <input
                  type="text"
                  id="last_name"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="email">Email</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="phone_number">Phone Number</label>
                <input
                  type="tel"
                  id="phone_number"
                  name="phone_number"
                  value={formData.phone_number}
                  onChange={handleInputChange}
                  placeholder="09123456789"
                />
              </div>

              <div className="form-actions">
                <button type="submit" className="btn-save">
                  Save Changes
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="btn-cancel"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Filter Tabs */}
        <div className="filter-tabs">
          <button
            className={filter === 'all' ? 'active' : ''}
            onClick={() => setFilter('all')}
          >
            All ({allPosts.length})
          </button>
          <button
            className={filter === 'listings' ? 'active' : ''}
            onClick={() => setFilter('listings')}
          >
            Listings ({listings.length})
          </button>
          <button
            className={filter === 'announcements' ? 'active' : ''}
            onClick={() => setFilter('announcements')}
          >
            Announcements ({announcements.length})
          </button>
        </div>

        {/* Posts List */}
        {filteredPosts.length === 0 ? (
          <div className="no-posts">
            <p>
              {filter === 'all'
                ? "No posts yet"
                : `No ${filter}`}
            </p>
          </div>
        ) : (
          <div className="posts-list">
            {filteredPosts.map(post => {
              if (post.postType === 'listing') {
                return (
                  <div key={`listing-${post.id}`} className="post-card listing-card">
                    <div
                      className="listing-image"
                      onClick={() => navigate(buildListingURL(post))}
                    >
                      {post.first_image ? (
                        <img src={post.first_image} alt={post.title} />
                      ) : (
                        <div className="no-image">📷</div>
                      )}
                      <span className="post-type-badge listing-badge">Listing</span>
                      <span className={`status-badge status-${post.status}`}>
                        {post.status}
                      </span>
                    </div>

                    <div className="post-info">
                      <div className="post-header">
                        <h3 onClick={() => navigate(buildListingURL(post))}>
                          {post.title}
                        </h3>
                        <p className="price">{formatPrice(post.price, post.pay_period)}</p>
                      </div>

                      <div className="post-meta">
                        <span>📍 {post.location}</span>
                        <span>👁️ {post.views_count} views</span>
                        <span>📅 {formatDate(post.created_at)}</span>
                      </div>

                      {isOwnProfile && (
                        <div className="post-actions">
                          <button
                            onClick={() => navigate(buildListingURL(post))}
                            className="btn-view"
                          >
                            👁️ View
                          </button>
                          <button
                            onClick={() => navigate(buildEditListingURL(post))}
                            className="btn-edit"
                          >
                            ✏️ Edit
                          </button>
                          {post.status === 'active' && (
                            <button
                              onClick={() => handleMarkSold(post.id)}
                              className="btn-sold"
                            >
                              ✓ Mark Sold
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteListing(post.id)}
                            className="btn-delete"
                          >
                            🗑️ Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              } else {
                // Announcement
                return (
                  <div key={`announcement-${post.id}`} className="post-card announcement-card">
                    <div className="announcement-preview" onClick={() => navigate(buildAnnouncementURL(post))}>
                      <span className="post-type-badge announcement-badge">Announcement</span>
                      <span className={getPriorityBadgeClass(post.priority)}>
                        {post.priority.toUpperCase()}
                      </span>
                    </div>

                    <div className="post-info">
                      <div className="post-header">
                        <h3 onClick={() => navigate(buildAnnouncementURL(post))}>
                          {post.title}
                        </h3>
                      </div>

                      <p className="announcement-excerpt">
                        {post.description.length > 150
                          ? `${post.description.substring(0, 150)}...`
                          : post.description}
                      </p>

                      <div className="post-meta">
                        <span>📍 {post.barangay ? `${post.barangay}, ` : ''}{post.municipality_name}</span>
                        <span>🏷️ {post.announcement_type}</span>
                        <span>📅 {formatDate(post.created_at)}</span>
                        {post.expiry_date && (
                          <span className="expiry">⏰ Expires: {formatDate(post.expiry_date)}</span>
                        )}
                      </div>

                      {isOwnProfile && (
                        <div className="post-actions">
                          <button
                            onClick={() => navigate(buildAnnouncementURL(post))}
                            className="btn-view"
                          >
                            👁️ View
                          </button>
                          <button
                            onClick={() => navigate(buildEditAnnouncementURL(post))}
                            className="btn-edit"
                          >
                            ✏️ Edit
                          </button>
                          <button
                            onClick={() => handleDeleteAnnouncement(post.id)}
                            className="btn-delete"
                          >
                            🗑️ Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              }
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default PublicProfile;
