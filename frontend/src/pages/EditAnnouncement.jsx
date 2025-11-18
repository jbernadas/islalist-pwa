import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { announcementsAPI, provincesAPI, barangaysAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { slugify } from '../utils/slugify';
import Header from '../components/Header';
import './CreateListing.css';

const EditAnnouncement = () => {
  const { id, province, municipality } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [provinces, setProvinces] = useState([]);
  const [municipalities, setMunicipalities] = useState([]);
  const [barangays, setBarangays] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingAnnouncement, setLoadingAnnouncement] = useState(true);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium',
    announcement_type: 'general',
    barangay: '',
    contact_info: '',
    expiry_date: '',
    province_id: '',
    municipality_id: '',
    is_province_wide: false,
    is_municipality_wide: false,
  });

  useEffect(() => {
    fetchLocations();
    fetchAnnouncement();
  }, [id]);

  // Fetch barangays when municipalities are loaded and municipality_id is set
  useEffect(() => {
    if (formData.municipality_id && municipalities.length > 0) {
      fetchBarangays(formData.municipality_id);
    }
  }, [formData.municipality_id, municipalities]);

  const fetchLocations = async () => {
    try {
      const cachedProvinces = localStorage.getItem('provinces');
      let provincesData;

      if (cachedProvinces) {
        provincesData = JSON.parse(cachedProvinces);
      } else {
        const response = await provincesAPI.getAll();
        provincesData = response.data.results || response.data;
        localStorage.setItem('provinces', JSON.stringify(provincesData));
      }

      setProvinces(provincesData);

      // Find current province
      const currentProvince = provincesData.find(p => p.slug === province);
      if (currentProvince) {
        const munResponse = await provincesAPI.getMunicipalities(province);
        setMunicipalities(munResponse.data);
      }
    } catch (err) {
      console.error('Error fetching locations:', err);
    }
  };

  const fetchBarangays = async (municipalityId) => {
    if (!municipalityId) {
      setBarangays([]);
      return;
    }
    try {
      const response = await barangaysAPI.getAll({ municipality: municipalityId });
      const barangaysData = response.data.results || response.data;
      setBarangays(Array.isArray(barangaysData) ? barangaysData : []);
    } catch (err) {
      console.error('Error fetching barangays:', err);
      setBarangays([]);
    }
  };

  const fetchAnnouncement = async () => {
    try {
      const response = await announcementsAPI.getById(id);
      const announcement = response.data;

      // Check if user owns this announcement
      if (announcement.author.id !== user?.id) {
        setError('You can only edit your own announcements');
        setTimeout(() => navigate('/my-posts'), 2000);
        return;
      }

      // Populate form with existing data
      setFormData({
        title: announcement.title || '',
        description: announcement.description || '',
        priority: announcement.priority || 'medium',
        announcement_type: announcement.announcement_type || 'general',
        barangay: announcement.barangay || '',
        contact_info: announcement.contact_info || '',
        expiry_date: announcement.expiry_date || '',
        province_id: announcement.province || '',
        municipality_id: announcement.municipality || '',
        is_province_wide: announcement.is_province_wide || false,
        is_municipality_wide: announcement.is_municipality_wide || false,
      });
    } catch (err) {
      console.error('Error fetching announcement:', err);
      setError('Failed to load announcement');
    } finally {
      setLoadingAnnouncement(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    // If municipality changes, fetch barangays for that municipality
    if (name === 'municipality_id' && value) {
      fetchBarangays(parseInt(value));
      // Clear barangay selection when municipality changes
      setFormData(prev => ({ ...prev, barangay: '' }));
    } else if (name === 'municipality_id' && !value) {
      // Clear barangays if municipality is cleared
      setBarangays([]);
      setFormData(prev => ({ ...prev, barangay: '' }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = {
        title: formData.title,
        description: formData.description,
        priority: formData.priority,
        announcement_type: formData.announcement_type,
        province: formData.province_id,
        municipality: formData.municipality_id,
        is_province_wide: formData.is_province_wide,
        is_municipality_wide: formData.is_municipality_wide,
      };

      if (formData.barangay) data.barangay = formData.barangay;
      if (formData.contact_info) data.contact_info = formData.contact_info;
      if (formData.expiry_date) data.expiry_date = formData.expiry_date;

      await announcementsAPI.update(id, data);
      navigate(`/${province}/${municipality}/announcements/${id}`);
    } catch (err) {
      console.error('Error updating announcement:', err);
      console.error('Error response:', err.response?.data);

      if (err.response?.data) {
        const errorData = err.response.data;
        if (typeof errorData === 'object' && !errorData.detail) {
          const errorMessages = Object.entries(errorData)
            .map(([field, messages]) => `${field}: ${Array.isArray(messages) ? messages.join(', ') : messages}`)
            .join('\n');
          setError(errorMessages || 'Failed to update announcement. Please try again.');
        } else {
          setError(errorData.detail || errorData.message || 'Failed to update announcement. Please try again.');
        }
      } else {
        setError('Failed to update announcement. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (loadingAnnouncement) {
    return (
      <div className="create-listing-container">
        <div className="loading">Loading announcement...</div>
      </div>
    );
  }

  return (
    <div className="create-listing-container">
      <Header pageTitle="Edit Announcement" />

      <form onSubmit={handleSubmit} className="listing-form">
        {error && <div className="error-message">{error}</div>}

        <div className="form-section">
          <h2>Basic Information</h2>

          <div className="form-group">
            <label htmlFor="title">Title *</label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
              placeholder="e.g., Road Closure on Main Street"
            />
          </div>

          <div className="form-group">
            <label htmlFor="description">Description *</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              required
              rows="6"
              placeholder="Provide detailed information about this announcement..."
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="priority">Priority *</label>
              <select
                id="priority"
                name="priority"
                value={formData.priority}
                onChange={handleChange}
                required
              >
                <option value="low">🟢 Low</option>
                <option value="medium">🟡 Medium</option>
                <option value="high">🔴 High</option>
                <option value="urgent">⚠️ Urgent</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="announcement_type">Type *</label>
              <select
                id="announcement_type"
                name="announcement_type"
                value={formData.announcement_type}
                onChange={handleChange}
                required
              >
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
          </div>
        </div>

        <div className="form-section">
          <h2>Location & Contact</h2>

          <div className="form-group">
            <label className="checkbox-label d-flex">
              <input
                type="checkbox"
                name="is_province_wide"
                checked={formData.is_province_wide}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  is_province_wide: e.target.checked,
                  is_municipality_wide: e.target.checked ? false : prev.is_municipality_wide
                }))}
                style={{ width: 'auto', flexShrink: 0, marginRight: '0.75rem' }}
              />
              <span style={{ flex: 1 , fontWeight: 'bold' }}>Province-wide announcement (show in all municipalities)</span>
            </label>
            <p className="help-text">
              Check this if the announcement is relevant to the entire province, not just one municipality.
            </p>
          </div>

          <div className="form-group">
            <label className="checkbox-label d-flex">
              <input
                type="checkbox"
                name="is_municipality_wide"
                checked={formData.is_municipality_wide}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  is_municipality_wide: e.target.checked,
                  is_province_wide: e.target.checked ? false : prev.is_province_wide
                }))}
                disabled={formData.is_province_wide}
                style={{ width: 'auto', flexShrink: 0, marginRight: '0.75rem' }}
              />
              <span style={{ flex: 1, fontWeight: 'bold' }}>Municipality-wide announcement (show in all barangays)</span>
            </label>
            <p className="help-text">
              Check this if the announcement is relevant to all barangays in the municipality.
            </p>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="province_id">Province *</label>
              <select
                id="province_id"
                name="province_id"
                value={formData.province_id}
                onChange={(e) => {
                  const provinceId = e.target.value;
                  setFormData(prev => ({ ...prev, province_id: provinceId, municipality_id: '' }));
                  // Fetch municipalities for selected province
                  const selectedProvince = provinces.find(p => p.id === parseInt(provinceId));
                  if (selectedProvince) {
                    provincesAPI.getMunicipalities(selectedProvince.slug).then(response => {
                      setMunicipalities(response.data);
                    });
                  }
                }}
                required
              >
                <option value="">Select province</option>
                {provinces.map(prov => (
                  <option key={prov.id} value={prov.id}>
                    {prov.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="municipality_id">City/Municipality *</label>
              <select
                id="municipality_id"
                name="municipality_id"
                value={formData.municipality_id}
                onChange={handleChange}
                required
                disabled={formData.is_province_wide}
              >
                <option value="">Select municipality</option>
                {municipalities.map(mun => (
                  <option key={mun.id} value={mun.id}>
                    {mun.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="barangay">Barangay (Optional)</label>
            <select
              id="barangay"
              name="barangay"
              value={formData.barangay}
              onChange={handleChange}
              disabled={barangays.length === 0 || formData.is_province_wide || formData.is_municipality_wide}
            >
              <option value="">
                {formData.is_municipality_wide
                  ? 'Disabled - Municipality-wide announcement'
                  : 'Select your barangay'}
              </option>
              {barangays.map(barangay => (
                <option key={barangay.id} value={barangay.name}>
                  {barangay.name}
                </option>
              ))}
            </select>
            {(formData.is_province_wide || formData.is_municipality_wide) && (
              <p className="help-text">
                Barangay selection is disabled for province-wide and municipality-wide announcements.
              </p>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="contact_info">Contact Information (Optional)</label>
            <input
              type="text"
              id="contact_info"
              name="contact_info"
              value={formData.contact_info}
              onChange={handleChange}
              placeholder="e.g., Call 123-4567 or visit Barangay Hall"
            />
          </div>

          <div className="form-group">
            <label htmlFor="expiry_date">Expiry Date (Optional)</label>
            <input
              type="date"
              id="expiry_date"
              name="expiry_date"
              value={formData.expiry_date}
              onChange={handleChange}
              min={new Date().toISOString().split('T')[0]}
            />
            <p className="help-text">
              When should this announcement no longer be displayed? Leave blank if it should remain visible indefinitely.
            </p>
          </div>
        </div>

        <div className="form-actions">
          <button type="button" onClick={() => navigate('/my-posts')} className="btn-secondary">
            Cancel
          </button>
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Updating...' : 'Update Announcement'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditAnnouncement;
