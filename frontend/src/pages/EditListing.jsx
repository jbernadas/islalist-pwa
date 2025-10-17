import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { categoriesAPI, listingsAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import ImageSelectorModal from '../components/ImageSelectorModal';
import './CreateListing.css';

const EditListing = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [categories, setCategories] = useState([]);
  const [images, setImages] = useState([]);
  const [reusedImages, setReusedImages] = useState([]);
  const [existingImages, setExistingImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingListing, setLoadingListing] = useState(true);
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
    fetchListing();
  }, [id]);

  const fetchCategories = async () => {
    try {
      const response = await categoriesAPI.getAll();
      const categoriesData = response.data.results || response.data;
      setCategories(Array.isArray(categoriesData) ? categoriesData : []);
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
  };

  const fetchListing = async () => {
    try {
      const response = await listingsAPI.getById(id);
      const listing = response.data;

      // Check if user owns this listing
      if (listing.seller.id !== user?.id) {
        setError('You can only edit your own listings');
        setTimeout(() => navigate('/my-listings'), 2000);
        return;
      }

      // Populate form with existing data
      setFormData({
        title: listing.title || '',
        description: listing.description || '',
        price: listing.price || '',
        property_type: listing.property_type || 'house',
        area_sqm: listing.area_sqm || '',
        bedrooms: listing.bedrooms || '',
        bathrooms: listing.bathrooms || '',
        category: listing.category || '',
        location: listing.location || '',
        island: listing.island || 'Siquijor',
      });

      setExistingImages(listing.images || []);
    } catch (err) {
      console.error('Error fetching listing:', err);
      setError('Failed to load listing');
    } finally {
      setLoadingListing(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageSelection = ({ reusedImages: selected, newFiles }) => {
    const totalImages = existingImages.length + reusedImages.length + images.length + selected.length + newFiles.length;
    if (totalImages > 10) {
      setError('Maximum 10 images allowed');
      return;
    }
    setReusedImages(prev => [...prev, ...selected]);
    setImages(prev => [...prev, ...newFiles]);
    setError('');
  };

  const removeNewImage = (index) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const removeReusedImage = (index) => {
    setReusedImages(prev => prev.filter((_, i) => i !== index));
  };

  const removeExistingImage = async (imageId) => {
    if (!confirm('Are you sure you want to delete this image?')) {
      return;
    }

    try {
      await listingsAPI.deleteImage(id, imageId);
      setExistingImages(prev => prev.filter(img => img.id !== imageId));
    } catch (err) {
      console.error('Error deleting image:', err);
      setError('Failed to delete image');
    }
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

      // Add reused image IDs
      reusedImages.forEach(image => {
        data.append('reused_image_ids', image.id);
      });

      // Add new images
      images.forEach(image => {
        data.append('uploaded_images', image);
      });

      await listingsAPI.update(id, data);
      navigate('/my-listings');
    } catch (err) {
      console.error('Error updating listing:', err);
      console.error('Error response:', err.response?.data);

      // Handle validation errors
      if (err.response?.data) {
        const errorData = err.response.data;
        if (typeof errorData === 'object' && !errorData.detail) {
          const errorMessages = Object.entries(errorData)
            .map(([field, messages]) => `${field}: ${Array.isArray(messages) ? messages.join(', ') : messages}`)
            .join('\n');
          setError(errorMessages || 'Failed to update listing. Please try again.');
        } else {
          setError(errorData.detail || errorData.message || 'Failed to update listing. Please try again.');
        }
      } else {
        setError('Failed to update listing. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  if (loadingListing) {
    return (
      <div className="create-listing-container">
        <div className="loading">Loading listing...</div>
      </div>
    );
  }

  return (
    <div className="create-listing-container">
      <header className="listings-header">
        <div className="header-content">
          <button onClick={() => navigate(-1)} className="btn-back">← Back</button>
          <h1>Edit Listing</h1>
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
          <p className="help-text">
            Current photos: {existingImages.length} existing, {reusedImages.length} reused, {images.length} new
            ({existingImages.length + reusedImages.length + images.length}/10 total)
          </p>

          <button
            type="button"
            onClick={() => setShowImageModal(true)}
            className="btn-add-images"
            disabled={existingImages.length + reusedImages.length + images.length >= 10}
          >
            📷 Add More Images ({existingImages.length + reusedImages.length + images.length}/10)
          </button>

          {existingImages.length > 0 && (
            <>
              <h3>Existing Photos (from this listing)</h3>
              <div className="image-previews">
                {existingImages.map((image) => (
                  <div key={image.id} className="image-preview">
                    <img src={image.image_url} alt="Listing" />
                    <div className="image-badge">Existing</div>
                    <button
                      type="button"
                      onClick={() => removeExistingImage(image.id)}
                      className="remove-image"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}

          {reusedImages.length > 0 && (
            <>
              <h3>Reused Photos (from other listings)</h3>
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
              </div>
            </>
          )}

          {images.length > 0 && (
            <>
              <h3>New Photos to Upload</h3>
              <div className="image-previews">
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
            </>
          )}
        </div>

        <ImageSelectorModal
          isOpen={showImageModal}
          onClose={() => setShowImageModal(false)}
          onSelectImages={handleImageSelection}
          excludeImageIds={existingImages.map(img => img.id)}
        />

        <div className="form-actions">
          <button type="button" onClick={() => navigate(-1)} className="btn-secondary">
            Cancel
          </button>
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Updating...' : 'Update Listing'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditListing;
