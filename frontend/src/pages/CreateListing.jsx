import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { categoriesAPI, listingsAPI } from '../services/api';
import './CreateListing.css';

const CreateListing = () => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
      setCategories(response.data);
      // Auto-select Real Estate category
      const realEstateCategory = response.data.find(cat => cat.name === 'Real Estate');
      if (realEstateCategory) {
        setFormData(prev => ({ ...prev, category: realEstateCategory.id }));
      }
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length + images.length > 10) {
      setError('Maximum 10 images allowed');
      return;
    }
    setImages(prev => [...prev, ...files]);
  };

  const removeImage = (index) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = new FormData();

      // Add form fields
      Object.keys(formData).forEach(key => {
        if (formData[key] !== '') {
          data.append(key, formData[key]);
        }
      });

      // Add images
      images.forEach(image => {
        data.append('uploaded_images', image);
      });

      await listingsAPI.create(data);
      navigate('/listings');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create listing. Please try again.');
      console.error('Error creating listing:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-listing-container">
      <div className="create-listing-header">
        <button onClick={() => navigate(-1)} className="btn-back">← Back</button>
        <h1>Create Listing</h1>
      </div>

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
              <label htmlFor="location">Location (Municipality/Barangay) *</label>
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
              <label htmlFor="island">Island *</label>
              <input
                type="text"
                id="island"
                name="island"
                value={formData.island}
                onChange={handleChange}
                required
              />
            </div>
          </div>
        </div>

        <div className="form-section">
          <h2>Photos</h2>
          <p className="help-text">Upload up to 10 photos of your property</p>

          <div className="image-upload">
            <input
              type="file"
              id="images"
              accept="image/*"
              multiple
              onChange={handleImageChange}
              disabled={images.length >= 10}
            />
            <label htmlFor="images" className="upload-label">
              📷 Choose Photos
            </label>
          </div>

          {images.length > 0 && (
            <div className="image-previews">
              {images.map((image, index) => (
                <div key={index} className="image-preview">
                  <img src={URL.createObjectURL(image)} alt={`Preview ${index + 1}`} />
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="remove-image"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

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
