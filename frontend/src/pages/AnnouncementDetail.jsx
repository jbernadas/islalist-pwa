import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { announcementsAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
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

  return (
    <div className="listing-detail-container">
      <header className="detail-header">
        <button onClick={() => navigate(`/${province}/${municipality}/announcements`)} className="btn-back">
          ← Back to Announcements
        </button>
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
      </header>

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

        <div className="announcement-detail-meta">
          <p className="meta-item">
            <strong>📍 Location:</strong> {announcement.barangay ? `${announcement.barangay}, ` : ''}
            {announcement.municipality_name}, {announcement.province_name}
          </p>
          <p className="meta-item">
            <strong>👤 Posted by:</strong> {announcement.author.username}
          </p>
          <p className="meta-item">
            <strong>📅 Posted on:</strong> {formatDate(announcement.created_at)}
          </p>
          {announcement.expiry_date && (
            <p className="meta-item expiry-warning">
              <strong>⏰ Expires:</strong> {new Date(announcement.expiry_date).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
          )}
          {announcement.contact_info && (
            <p className="meta-item">
              <strong>📞 Contact:</strong> {announcement.contact_info}
            </p>
          )}
        </div>

        <div className="description-section">
          <h3>Details</h3>
          <div className="description-content">
            {announcement.description.split('\n').map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnnouncementDetail;
