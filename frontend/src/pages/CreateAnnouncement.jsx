import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { announcementsAPI, provincesAPI, barangaysAPI } from '../services/api';
import { useLocations } from '../hooks/useLocations';
import Header from '../components/Header';
import './CreateListing.css';

const CreateAnnouncement = () => {
  const navigate = useNavigate();
  const { province, municipality } = useParams();

  // Use the centralized useLocations hook for initial location data
  // This uses PSGC codes for lookups, avoiding slug collision issues
  const {
    provinces,
    municipalities: initialMunicipalities,
    barangays: initialBarangays,
    currentProvince,
    currentMunicipality
  } = useLocations(province, municipality);

  // Form-specific municipalities/barangays that can be changed by user
  const [formMunicipalities, setFormMunicipalities] = useState([]);
  const [formBarangays, setFormBarangays] = useState([]);
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
    is_municipality_wide: false,
  });

  // Set initial form values from URL-based location data
  useEffect(() => {
    if (currentProvince) {
      setFormData(prev => ({ ...prev, province_id: currentProvince.id }));
    }
  }, [currentProvince]);

  useEffect(() => {
    if (currentMunicipality) {
      setFormData(prev => ({ ...prev, municipality_id: currentMunicipality.id }));
    }
  }, [currentMunicipality]);

  // Sync municipalities from hook to form state
  useEffect(() => {
    setFormMunicipalities(initialMunicipalities);
  }, [initialMunicipalities]);

  // Sync barangays from hook to form state
  useEffect(() => {
    setFormBarangays(initialBarangays);
  }, [initialBarangays]);

  const fetchBarangays = async (municipalityId) => {
    if (!municipalityId) {
      setFormBarangays([]);
      return;
    }
    try {
      const response = await barangaysAPI.getAll({ municipality: municipalityId });
      const barangaysData = response.data.results || response.data;
      setFormBarangays(Array.isArray(barangaysData) ? barangaysData : []);
    } catch (err) {
      console.error('Error fetching barangays:', err);
      setFormBarangays([]);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    // Fetch barangays when municipality changes
    if (name === 'municipality_id' && value) {
      fetchBarangays(value);
      setFormData(prev => ({ ...prev, barangay: '' })); // Clear old barangay selection
    } else if (name === 'municipality_id' && !value) {
      setFormBarangays([]);
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

  return (
    <div className="create-listing-container">
      <Header pageTitle="Post an Announcement" />

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
                      setFormMunicipalities(response.data);
                    });
                  }
                  setFormBarangays([]);
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
                {formMunicipalities.map(mun => (
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
              disabled={formBarangays.length === 0 || formData.is_province_wide || formData.is_municipality_wide}
            >
              <option value="">
                {formData.is_municipality_wide
                  ? 'Disabled - Municipality-wide announcement'
                  : 'Select your barangay'}
              </option>
              {formBarangays.map(barangay => (
                <option key={barangay.id} value={barangay.id}>
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
