import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { listingsAPI, announcementsAPI } from '../services/api';
import { slugify } from '../utils/slugify';
import Header from '../components/Header';
import './MyPosts.css';

const MyPosts = () => {
  const navigate = useNavigate();
  const [listings, setListings] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, listings, announcements

  useEffect(() => {
    fetchMyPosts();
  }, []);

  const fetchMyPosts = async () => {
    try {
      setLoading(true);
      const [listingsResponse, announcementsResponse] = await Promise.all([
        listingsAPI.getMyListings(),
        announcementsAPI.getMyAnnouncements()
      ]);

      setListings(listingsResponse.data);
      setAnnouncements(announcementsResponse.data);
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkSold = async (id) => {
    if (!confirm('Mark this listing as sold?')) return;

    try {
      await listingsAPI.markSold(id);
      fetchMyPosts();
    } catch (error) {
      console.error('Error marking as sold:', error);
      alert('Failed to mark as sold. Please try again.');
    }
  };

  const handleDeleteListing = async (id) => {
    if (!confirm('Are you sure you want to delete this listing?')) return;

    try {
      await listingsAPI.delete(id);
      fetchMyPosts();
    } catch (error) {
      console.error('Error deleting listing:', error);
      alert('Failed to delete listing. Please try again.');
    }
  };

  const handleDeleteAnnouncement = async (id) => {
    if (!confirm('Are you sure you want to delete this announcement?')) return;

    try {
      await announcementsAPI.delete(id);
      fetchMyPosts();
    } catch (error) {
      console.error('Error deleting announcement:', error);
      alert('Failed to delete announcement. Please try again.');
    }
  };

  const formatPrice = (price, payPeriod) => {
    if (!price) return 'Contact for price';
    let priceStr = `₱${Number(price).toLocaleString()}`;

    // Add pay period suffix for job listings
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

  // Helper to build URLs using location data from posts
  const getListingPath = (listing) => {
    const provinceSlug = slugify(listing.island || 'siquijor');
    const locationParts = listing.location.split(',');
    const municipalitySlug = slugify(locationParts[0]?.trim() || 'siquijor');
    return `/${provinceSlug}/${municipalitySlug}/listings/${listing.id}`;
  };

  const getEditListingPath = (listing) => {
    const provinceSlug = slugify(listing.island || 'siquijor');
    const locationParts = listing.location.split(',');
    const municipalitySlug = slugify(locationParts[0]?.trim() || 'siquijor');
    return `/${provinceSlug}/${municipalitySlug}/edit-listing/${listing.id}`;
  };

  const getAnnouncementPath = (announcement) => {
    const provinceSlug = slugify(announcement.province_name);
    const municipalitySlug = slugify(announcement.municipality_name);
    return `/${provinceSlug}/${municipalitySlug}/announcements/${announcement.id}`;
  };

  const getEditAnnouncementPath = (announcement) => {
    const provinceSlug = slugify(announcement.province_name);
    const municipalitySlug = slugify(announcement.municipality_name);
    return `/${provinceSlug}/${municipalitySlug}/announcements/${announcement.id}/edit`;
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

  return (
    <div className="my-listings-container">
      <Header pageTitle="My Posts" />

      <div className="my-listings-content">
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

        {loading ? (
          <div className="loading">Loading your posts...</div>
        ) : filteredPosts.length === 0 ? (
          <div className="no-listings">
            <p>{filter === 'all' ? "You haven't created any posts yet" : `No ${filter}`}</p>
          </div>
        ) : (
          <div className="listings-list">
            {filteredPosts.map(post => {
              if (post.postType === 'listing') {
                return (
                  <div key={`listing-${post.id}`} className="my-listing-card">
                    <div
                      className="listing-image"
                      onClick={() => navigate(getListingPath(post))}
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

                    <div className="listing-info">
                      <div className="listing-header">
                        <h3 onClick={() => navigate(getListingPath(post))}>
                          {post.title}
                        </h3>
                        <p className="price">{formatPrice(post.price, post.pay_period)}</p>
                      </div>

                      <div className="listing-meta">
                        <span>📍 {post.location}</span>
                        <span>👁️ {post.views_count} views</span>
                        <span>📅 {formatDate(post.created_at)}</span>
                      </div>

                      <div className="listing-actions">
                        <button
                          onClick={() => navigate(getListingPath(post))}
                          className="btn-view"
                        >
                          👁️ View
                        </button>
                        <button
                          onClick={() => navigate(getEditListingPath(post))}
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
                    </div>
                  </div>
                );
              } else {
                // Announcement
                return (
                  <div key={`announcement-${post.id}`} className="my-listing-card announcement">
                    <div className="announcement-preview" onClick={() => navigate(getAnnouncementPath(post))}>
                      <span className="post-type-badge announcement-badge">Announcement</span>
                      <span className={getPriorityBadgeClass(post.priority)}>
                        {post.priority.toUpperCase()}
                      </span>
                    </div>

                    <div className="listing-info">
                      <div className="listing-header">
                        <h3 onClick={() => navigate(getAnnouncementPath(post))}>
                          {post.title}
                        </h3>
                      </div>

                      <p className="announcement-excerpt">
                        {post.description.length > 150
                          ? `${post.description.substring(0, 150)}...`
                          : post.description}
                      </p>

                      <div className="listing-meta">
                        <span>📍 {post.barangay ? `${post.barangay}, ` : ''}{post.municipality_name}</span>
                        <span>🏷️ {post.announcement_type}</span>
                        <span>📅 {formatDate(post.created_at)}</span>
                        {post.expiry_date && (
                          <span className="expiry">⏰ Expires: {formatDate(post.expiry_date)}</span>
                        )}
                      </div>

                      <div className="listing-actions">
                        <button
                          onClick={() => navigate(getAnnouncementPath(post))}
                          className="btn-view"
                        >
                          👁️ View
                        </button>
                        <button
                          onClick={() => navigate(getEditAnnouncementPath(post))}
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

export default MyPosts;
