import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { announcementsAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { slugify } from '../utils/slugify';
import Header from '../components/Header';
import './ListingDetail.css';

const AnnouncementDetail = () => {
  const { id, province, municipality } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [announcement, setAnnouncement] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnnouncement();
  }, [id]);

  const fetchAnnouncement = async () => {
    try {
      const response = await announcementsAPI.getById(id);
      setAnnouncement(response.data);
    } catch (error) {
      console.error('Error fetching announcement:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this announcement?')) {
      return;
    }

    try {
      await announcementsAPI.delete(id);
      navigate(`/${province}/${municipality}/announcements`);
    } catch (error) {
      console.error('Error deleting announcement:', error);
      alert('Failed to delete announcement');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
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

  if (loading) {
    return (
      <div className="listing-detail-container">
        <div className="loading">Loading announcement...</div>
      </div>
    );
  }

  if (!announcement) {
    return (
      <div className="listing-detail-container">
        <div className="error-message">Announcement not found</div>
      </div>
    );
  }

  const isOwner = user && announcement.author && user.id === announcement.author.id;

  // Helper function to truncate title
  const truncateTitle = (title, maxLength = 32) => {
    if (!title) return '';
    if (title.length <= maxLength) return title;
    return title.substring(0, maxLength) + '...';
  };

  // Helper function to format display names
  const formatDisplayName = (slug) => {
    if (!slug) return '';
    return slug.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  // Build breadcrumb array
  const buildBreadcrumbs = () => {
    if (!announcement) return [];

    const breadcrumbs = [
      { label: formatDisplayName(province), path: `/${province}` },
      { label: formatDisplayName(municipality), path: `/${province}/${municipality}` }
    ];

    // Add barangay if it exists
    if (announcement.barangay && announcement.barangay_details) {
      breadcrumbs.push({
        label: announcement.barangay_details.name,
        path: `/${province}/${municipality}/${slugify(announcement.barangay_details.name)}`
      });
    }

    // Add content type
    breadcrumbs.push({
      label: 'Announcements',
      path: `/${province}/${municipality}/announcements`
    });

    // Add truncated title (non-clickable)
    breadcrumbs.push({
      label: truncateTitle(announcement.title, window.innerWidth < 768 ? 32 : 50),
      path: null
    });

    return breadcrumbs;
  };

  const breadcrumbs = buildBreadcrumbs();

  return (
    <>
      <Header />
      <div className="listing-detail-container">
        {announcement && breadcrumbs.length > 0 && (
          <nav className="breadcrumb-navigation" aria-label="Breadcrumb">
            {breadcrumbs.map((crumb, index) => (
              <span key={index}>
                {crumb.path ? (
                  <Link to={crumb.path} className="breadcrumb-link">
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="breadcrumb-current">{crumb.label}</span>
                )}
                {index < breadcrumbs.length - 1 && (
                  <span className="breadcrumb-separator"> / </span>
                )}
              </span>
            ))}
            {/* Show scope badges if applicable */}
            {announcement.is_province_wide && (
              <span className="scope-badge province-wide" style={{ marginLeft: '0.75rem' }}>
                Province-Wide
              </span>
            )}
            {announcement.is_municipality_wide && (
              <span className="scope-badge municipality-wide" style={{ marginLeft: '0.75rem' }}>
                Municipality-Wide
              </span>
            )}
          </nav>
        )}

      <div className="announcement-detail-content">
        <div className="announcement-detail-header">
          <div className="announcement-badges">
            <span className={getPriorityBadgeClass(announcement.priority)}>
              {announcement.priority.toUpperCase()}
            </span>
            <span className="announcement-type-badge">{announcement.announcement_type}</span>
          </div>
          <h1>{announcement.title}</h1>
        </div>
        
        <div className="description-section">
          <div className="description-content">
            {announcement.description.split('\n').map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </div>
        </div>

        <div className="announcement-detail-meta">
          <p className="meta-item">
            <strong>📍 Location:</strong> {announcement.barangay_details?.name ? `${announcement.barangay_details.name}, ` : ''}
            {announcement.municipality_name}, {announcement.province_name}
          </p>
          <p className="meta-item">
            <strong>👤 Posted by:</strong> {announcement.author.username}
          </p>
          <p className="meta-item">
            <strong>📅 Posted on:</strong> {formatDate(announcement.created_at)}
          </p>
          {announcement.contact_info && (
            <p className="meta-item">
              <strong>📞 Contact:</strong> {announcement.contact_info}
            </p>
          )}
          
          {isOwner && (
            <div className="owner-actions">
              <button onClick={() => navigate(`/${province}/${municipality}/announcements/${id}/edit`)} className="btn-edit">
                Edit
              </button>
              <button onClick={handleDelete} className="btn-delete">
                Delete
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
    </>
  );
};

export default AnnouncementDetail;
