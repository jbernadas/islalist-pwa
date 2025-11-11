import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { announcementsAPI, provincesAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { slugify } from '../utils/slugify';
import './CreateListing.css';

const CreateAnnouncement = () => {
  const navigate = useNavigate();
  const { province, municipality } = useParams();
  const { logout } = useAuth();
  const [provinces, setProvinces] = useState([]);
  const [municipalities, setMunicipalities] = useState([]);
  const [loading, setLoading] = useState(false);
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
  });

  useEffect(() => {
    fetchLocations();
  }, [province, municipality]);

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

      // Find current province and municipality
      const currentProvince = provincesData.find(p => p.slug === province);
      if (currentProvince) {
        setFormData(prev => ({ ...prev, province_id: currentProvince.id }));

        const munResponse = await provincesAPI.getMunicipalities(province);
        const municipalitiesData = munResponse.data;
        setMunicipalities(municipalitiesData);

        const currentMunicipality = municipalitiesData.find(m => slugify(m.name) === municipality);
        if (currentMunicipality) {
          setFormData(prev => ({ ...prev, municipality_id: currentMunicipality.id }));
        }
      }
    } catch (err) {
      console.error('Error fetching locations:', err);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
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
      };

      if (formData.barangay) data.barangay = formData.barangay;
      if (formData.contact_info) data.contact_info = formData.contact_info;
      if (formData.expiry_date) data.expiry_date = formData.expiry_date;

      await announcementsAPI.create(data);
      navigate(`/${province}/${municipality}/announcements`);
    } catch (err) {
      console.error('Error creating announcement:', err);
      console.error('Error response:', err.response?.data);

      if (err.response?.data) {
        const errorData = err.response.data;
        if (typeof errorData === 'object' && !errorData.detail) {
          const errorMessages = Object.entries(errorData)
            .map(([field, messages]) => `${field}: ${Array.isArray(messages) ? messages.join(', ') : messages}`)
            .join('\n');
          setError(errorMessages || 'Failed to create announcement. Please try again.');
        } else {
          setError(errorData.detail || errorData.message || 'Failed to create announcement. Please try again.');
        }
      } else {
        setError('Failed to create announcement. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className="create-listing-container">
      <header className="listings-header">
        <div className="header-content">
          <div onClick={() => navigate(`/${province}/${municipality}`)} className="brand">
            🏝️ IslaList
          </div>
          <h1>Create Announcement</h1>
          <button onClick={handleLogout} className="btn-logout">
            Logout
          </button>
        </div>
      </header>

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
            <label className="checkbox-label d-flex">
              <input
                type="checkbox"
                name="is_province_wide"
                checked={formData.is_province_wide}
                onChange={(e) => setFormData(prev => ({ ...prev, is_province_wide: e.target.checked }))}
                style={{ width: 'auto', flexShrink: 0, marginRight: '0.75rem' }}
              />
              <span style={{ flex: 1 , fontWeight: 'bold' }}>Province-wide announcement (show in all municipalities)</span>
            </label>
            <p className="help-text">
              Check this if the announcement is relevant to the entire province, not just one municipality.
            </p>
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
            <p className="help-text">
              Auto-populated based on your current location. You can change this if needed.
            </p>
          </div>

          <div className="form-group">
            <label htmlFor="barangay">Barangay (Optional)</label>
            <input
              type="text"
              id="barangay"
              name="barangay"
              value={formData.barangay}
              onChange={handleChange}
              placeholder="e.g., Poblacion"
            />
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
          <button type="button" onClick={() => navigate(`/${province}/${municipality}`)} className="btn-secondary">
            Cancel
          </button>
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Creating...' : 'Create Announcement'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateAnnouncement;
