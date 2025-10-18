import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { categoriesAPI, listingsAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import ImageSelectorModal from '../components/ImageSelectorModal';
import './CreateListing.css';

const CreateListing = () => {
  const navigate = useNavigate();
  const { province, municipality } = useParams();
  const { logout } = useAuth();
  const [categories, setCategories] = useState([]);
  const [images, setImages] = useState([]);
  const [reusedImages, setReusedImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showImageModal, setShowImageModal] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    property_type: 'house',
    area_sqm: '',
    bedrooms: '',
    bathrooms: '',
    category: '',
    location: '',
    island: 'Siquijor',
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await categoriesAPI.getAll();
      console.log('Categories response:', response.data);

      // Handle both paginated and non-paginated responses
      const categoriesData = response.data.results || response.data;
      console.log('Categories data:', categoriesData);

      setCategories(Array.isArray(categoriesData) ? categoriesData : []);

      // Auto-select Real Estate category
      const realEstateCategory = categoriesData.find(cat => cat.name === 'Real Estate');
      console.log('Real Estate category:', realEstateCategory);

      if (realEstateCategory) {
        console.log('Setting category to:', realEstateCategory.id);
        setFormData(prev => ({ ...prev, category: realEstateCategory.id }));
      } else {
        console.warn('Real Estate category not found! Available categories:', categoriesData);
      }
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageSelection = ({ reusedImages: selected, newFiles }) => {
    const totalImages = reusedImages.length + images.length + selected.length + newFiles.length;
    if (totalImages > 10) {
      setError('Maximum 10 images allowed');
      return;
    }
    setReusedImages(prev => [...prev, ...selected]);
    setImages(prev => [...prev, ...newFiles]);
    setError('');
  };

  const removeReusedImage = (index) => {
    setReusedImages(prev => prev.filter((_, i) => i !== index));
  };

  const removeNewImage = (index) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = new FormData();

      // Add form fields
      console.log('Form data before submit:', formData);
      Object.keys(formData).forEach(key => {
        if (formData[key] !== '') {
          data.append(key, formData[key]);
          console.log(`Added to FormData: ${key} = ${formData[key]}`);
        }
      });

      // Add reused image IDs
      reusedImages.forEach(image => {
        data.append('reused_image_ids', image.id);
      });

      // Add new uploaded images
      images.forEach(image => {
        data.append('uploaded_images', image);
      });

      console.log('FormData entries:');
      for (let pair of data.entries()) {
        console.log(pair[0] + ': ' + pair[1]);
      }

      await listingsAPI.create(data);
      navigate(`/${province}/${municipality}`);
    } catch (err) {
      console.error('Error creating listing:', err);
      console.error('Error response:', err.response?.data);

      // Handle validation errors from DRF
      if (err.response?.data) {
        const errorData = err.response.data;
        if (typeof errorData === 'object' && !errorData.detail) {
          // Field-specific validation errors
          const errorMessages = Object.entries(errorData)
            .map(([field, messages]) => `${field}: ${Array.isArray(messages) ? messages.join(', ') : messages}`)
            .join('\n');
          setError(errorMessages || 'Failed to create listing. Please try again.');
        } else {
          setError(errorData.detail || errorData.message || 'Failed to create listing. Please try again.');
        }
      } else {
        setError('Failed to create listing. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  // Helper function to build city/municipality-scoped URLs
  const getMunicipalityPath = (path = '') => {
    return `/${province}/${municipality}${path}`;
  };

  return (
    <div className="create-listing-container">
      <header className="listings-header">
        <div className="header-content">
          <button onClick={() => navigate(-1)} className="btn-back">← Back</button>
          <h1>Create Listing</h1>
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
              placeholder="e.g., Beautiful Beach House in Siquijor"
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
              placeholder="Describe your property in detail..."
            />
          </div>

          <div className="form-group">
            <label htmlFor="category">Category *</label>
            <select
              id="category"
              name="category"
              value={formData.category}
              onChange={handleChange}
              required
            >
              <option value="">Select a category</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>
                  {cat.icon} {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="price">Price (PHP)</label>
              <input
                type="number"
                id="price"
                name="price"
                value={formData.price}
                onChange={handleChange}
                placeholder="Leave blank for 'Contact for price'"
              />
            </div>

            <div className="form-group">
              <label htmlFor="property_type">Property Type *</label>
              <select
                id="property_type"
                name="property_type"
                value={formData.property_type}
                onChange={handleChange}
                required
              >
                <option value="house">House</option>
                <option value="land">Land</option>
                <option value="apartment">Apartment</option>
                <option value="commercial">Commercial</option>
                <option value="condo">Condominium</option>
              </select>
            </div>
          </div>
        </div>

        <div className="form-section">
          <h2>Property Details</h2>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="area_sqm">Area (sq meters)</label>
              <input
                type="number"
                id="area_sqm"
                name="area_sqm"
                value={formData.area_sqm}
                onChange={handleChange}
                step="0.01"
              />
            </div>

            <div className="form-group">
              <label htmlFor="bedrooms">Bedrooms</label>
              <input
                type="number"
                id="bedrooms"
                name="bedrooms"
                value={formData.bedrooms}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label htmlFor="bathrooms">Bathrooms</label>
              <input
                type="number"
                id="bathrooms"
                name="bathrooms"
                value={formData.bathrooms}
                onChange={handleChange}
              />
            </div>
          </div>
        </div>

        <div className="form-section">
          <h2>Location</h2>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="location">Location (City/Municipality/Barangay) *</label>
              <input
                type="text"
                id="location"
                name="location"
                value={formData.location}
                onChange={handleChange}
                required
                placeholder="e.g., San Juan, Siquijor"
              />
            </div>

            <div className="form-group">
              <label htmlFor="island">Province *</label>
              <input
                type="text"
                id="island"
                name="island"
                value={formData.island}
                onChange={handleChange}
                required
                placeholder="e.g., Siquijor"
              />
            </div>
          </div>
        </div>

        <div className="form-section">
          <h2>Photos</h2>
          <p className="help-text">
            Select from your previously uploaded images or upload new ones (up to 10 total)
          </p>

          <button
            type="button"
            onClick={() => setShowImageModal(true)}
            className="btn-add-images"
            disabled={reusedImages.length + images.length >= 10}
          >
            📷 Add Images ({reusedImages.length + images.length}/10)
          </button>

          {(reusedImages.length > 0 || images.length > 0) && (
            <div className="image-previews">
              {reusedImages.map((image, index) => (
                <div key={`reused-${index}`} className="image-preview">
                  <img src={image.image_url} alt={image.listing_title} />
                  <div className="image-badge">Reused</div>
                  <button
                    type="button"
                    onClick={() => removeReusedImage(index)}
                    className="remove-image"
                  >
                    ✕
                  </button>
                </div>
              ))}
              {images.map((image, index) => (
                <div key={`new-${index}`} className="image-preview">
                  <img src={URL.createObjectURL(image)} alt={`Preview ${index + 1}`} />
                  <div className="image-badge new">New</div>
                  <button
                    type="button"
                    onClick={() => removeNewImage(index)}
                    className="remove-image"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <ImageSelectorModal
          isOpen={showImageModal}
          onClose={() => setShowImageModal(false)}
          onSelectImages={handleImageSelection}
        />

        <div className="form-actions">
          <button type="button" onClick={() => navigate(-1)} className="btn-secondary">
            Cancel
          </button>
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Creating...' : 'Create Listing'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateListing;
