import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { categoriesAPI, listingsAPI, provincesAPI, barangaysAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useLocations } from '../hooks/useLocations';
import ImageSelectorModal from '../components/ImageSelectorModal';
import Header from '../components/Header';
import './CreateListing.css';

const EditListing = () => {
  const { id, province, municipality } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Use the centralized useLocations hook for province data
  // This uses PSGC codes for lookups, avoiding slug collision issues
  const { provinces } = useLocations(province, municipality);

  const [categories, setCategories] = useState([]);
  const [formMunicipalities, setFormMunicipalities] = useState([]);
  const [formBarangays, setFormBarangays] = useState([]);
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
    pay_period: 'not_applicable',
    vehicle_type: '',
    vehicle_year: '',
    vehicle_make: '',
    vehicle_model: '',
    vehicle_mileage: '',
    vehicle_transmission: '',
    vehicle_fuel_type: '',
    vehicle_condition: '',
    category: '',
    location: '',
    barangay: '',
    island: 'Siquijor',
    province_id: '',
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    if (provinces.length > 0) {
      fetchListing();
    }
  }, [id, provinces]);

  // Fetch barangays when municipalities are loaded and location is set
  useEffect(() => {
    if (formData.location && formMunicipalities.length > 0) {
      const currentMunicipality = formMunicipalities.find(m => m.name === formData.location);
      if (currentMunicipality) {
        fetchBarangays(currentMunicipality.id);
      }
    }
  }, [formData.location, formMunicipalities]);

  const fetchCategories = async () => {
    try {
      const response = await categoriesAPI.getAll();
      const categoriesData = response.data.results || response.data;
      setCategories(Array.isArray(categoriesData) ? categoriesData : []);
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
  };

  const fetchMunicipalities = async (provinceSlug) => {
    try {
      const response = await provincesAPI.getMunicipalities(provinceSlug);
      setFormMunicipalities(response.data);
    } catch (err) {
      console.error('Error fetching municipalities:', err);
    }
  };

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

  const fetchListing = async () => {
    try {
      const response = await listingsAPI.getById(id);
      const listing = response.data;

      // Check if user owns this listing
      if (listing.seller.id !== user?.id) {
        setError('You can only edit your own listings');
        setTimeout(() => navigate('/my-posts'), 2000);
        return;
      }

      // Find province_id from island name
      const currentProvince = provinces.find(p => p.name === listing.island);
      if (currentProvince) {
        // Fetch municipalities for this province
        await fetchMunicipalities(currentProvince.slug);
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
        pay_period: listing.pay_period || 'not_applicable',
        vehicle_type: listing.vehicle_type || '',
        vehicle_year: listing.vehicle_year || '',
        vehicle_make: listing.vehicle_make || '',
        vehicle_model: listing.vehicle_model || '',
        vehicle_mileage: listing.vehicle_mileage || '',
        vehicle_transmission: listing.vehicle_transmission || '',
        vehicle_fuel_type: listing.vehicle_fuel_type || '',
        vehicle_condition: listing.vehicle_condition || '',
        category: listing.category || '',
        location: listing.location || '',
        barangay: listing.barangay || '',
        island: listing.island || 'Siquijor',
        province_id: currentProvince?.id || '',
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

    // If location (municipality) changes, fetch barangays for that municipality
    if (name === 'location' && value) {
      const selectedMunicipality = formMunicipalities.find(m => m.name === value);
      if (selectedMunicipality) {
        fetchBarangays(selectedMunicipality.id);
        // Clear barangay selection when municipality changes
        setFormData(prev => ({ ...prev, barangay: '' }));
      }
    } else if (name === 'location' && !value) {
      // Clear barangays if location is cleared
      setFormBarangays([]);
      setFormData(prev => ({ ...prev, barangay: '' }));
    }
  };

  // Check if current category is Real Estate
  const isRealEstateCategory = () => {
    const selectedCategory = categories.find(cat => cat.id === parseInt(formData.category));
    return selectedCategory?.name === 'Real Estate';
  };

  // Check if current category is Jobs
  const isJobsCategory = () => {
    const selectedCategory = categories.find(cat => cat.id === parseInt(formData.category));
    return selectedCategory?.name === 'Jobs';
  };

  // Check if current category is Vehicles
  const isVehicleCategory = () => {
    const selectedCategory = categories.find(cat => cat.id === parseInt(formData.category));
    return selectedCategory?.name === 'Vehicles';
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
      navigate(`/${province}/${municipality}/listings`);
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

  // Helper function to build city/municipality-scoped URLs
  const getMunicipalityPath = (path = '') => {
    return `/${province}/${municipality}${path}`;
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
      <Header pageTitle="Edit Listing" />

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
              <label htmlFor="price">{ isJobsCategory() ? 'Pay (PHP)' :  'Price (PHP)' }</label>
              <input
                type="number"
                id="price"
                name="price"
                value={formData.price}
                onChange={handleChange}
                placeholder="Leave blank for 'Contact for price'"
              />
            </div>

            {/* Pay Period - Only show for Jobs category */}
            {isJobsCategory() && (
              <div className="form-group">
                <label htmlFor="pay_period">Pay Period</label>
                <select
                  id="pay_period"
                  name="pay_period"
                  value={formData.pay_period}
                  onChange={handleChange}
                >
                  <option value="per_day">Per Day</option>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="not_applicable">Not Applicable</option>
                </select>
              </div>
            )}

            {/* Property Type - Only show for Real Estate category */}
            {isRealEstateCategory() && (
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
            )}
          </div>
        </div>

        {/* Property Details - Only show for Real Estate category */}
        {isRealEstateCategory() && (
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
        )}

        {/* Vehicle Details - Only show for Vehicle category */}
        {isVehicleCategory() && (
          <div className="form-section">
            <h2>Vehicle Details</h2>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="vehicle_type">Vehicle Type *</label>
                <select
                  id="vehicle_type"
                  name="vehicle_type"
                  value={formData.vehicle_type}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select vehicle type</option>
                  <option value="car">Car</option>
                  <option value="motorcycle">Motorcycle</option>
                  <option value="truck">Truck</option>
                  <option value="van">Van</option>
                  <option value="suv">SUV</option>
                  <option value="bus">Bus</option>
                  <option value="boat">Boat</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="vehicle_year">Year</label>
                <input
                  type="number"
                  id="vehicle_year"
                  name="vehicle_year"
                  value={formData.vehicle_year}
                  onChange={handleChange}
                  placeholder="e.g., 2020"
                  min="1900"
                  max={new Date().getFullYear() + 1}
                />
              </div>

              <div className="form-group">
                <label htmlFor="vehicle_condition">Condition</label>
                <select
                  id="vehicle_condition"
                  name="vehicle_condition"
                  value={formData.vehicle_condition}
                  onChange={handleChange}
                >
                  <option value="">Select condition</option>
                  <option value="brand_new">Brand New</option>
                  <option value="like_new">Like New</option>
                  <option value="used_excellent">Used - Excellent</option>
                  <option value="used_good">Used - Good</option>
                  <option value="used_fair">Used - Fair</option>
                  <option value="for_parts">For Parts</option>
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="vehicle_make">Make/Brand</label>
                <input
                  type="text"
                  id="vehicle_make"
                  name="vehicle_make"
                  value={formData.vehicle_make}
                  onChange={handleChange}
                  placeholder="e.g., Toyota, Honda, Yamaha"
                />
              </div>

              <div className="form-group">
                <label htmlFor="vehicle_model">Model</label>
                <input
                  type="text"
                  id="vehicle_model"
                  name="vehicle_model"
                  value={formData.vehicle_model}
                  onChange={handleChange}
                  placeholder="e.g., Vios, City, Mio"
                />
              </div>

              <div className="form-group">
                <label htmlFor="vehicle_mileage">Mileage (km)</label>
                <input
                  type="number"
                  id="vehicle_mileage"
                  name="vehicle_mileage"
                  value={formData.vehicle_mileage}
                  onChange={handleChange}
                  placeholder="Odometer reading"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="vehicle_transmission">Transmission</label>
                <select
                  id="vehicle_transmission"
                  name="vehicle_transmission"
                  value={formData.vehicle_transmission}
                  onChange={handleChange}
                >
                  <option value="">Select transmission</option>
                  <option value="manual">Manual</option>
                  <option value="automatic">Automatic</option>
                  <option value="cvt">CVT</option>
                  <option value="not_applicable">Not Applicable</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="vehicle_fuel_type">Fuel Type</label>
                <select
                  id="vehicle_fuel_type"
                  name="vehicle_fuel_type"
                  value={formData.vehicle_fuel_type}
                  onChange={handleChange}
                >
                  <option value="">Select fuel type</option>
                  <option value="gasoline">Gasoline</option>
                  <option value="diesel">Diesel</option>
                  <option value="electric">Electric</option>
                  <option value="hybrid">Hybrid</option>
                  <option value="not_applicable">Not Applicable</option>
                </select>
              </div>
            </div>
          </div>
        )}

        <div className="form-section">
          <h2>Location</h2>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="province_id">Province *</label>
              <select
                id="province_id"
                name="province_id"
                value={formData.province_id}
                onChange={(e) => {
                  const provinceId = e.target.value;
                  const selectedProvince = provinces.find(p => p.id === parseInt(provinceId));
                  setFormData(prev => ({
                    ...prev,
                    province_id: provinceId,
                    island: selectedProvince ? selectedProvince.name : '',
                    location: ''
                  }));
                  // Fetch municipalities for selected province
                  if (selectedProvince) {
                    fetchMunicipalities(selectedProvince.slug);
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
              <label htmlFor="location">Location (City/Municipality) *</label>
              <select
                id="location"
                name="location"
                value={formData.location}
                onChange={handleChange}
                required
              >
                <option value="">Select a municipality</option>
                {formMunicipalities.map(mun => (
                  <option key={mun.id} value={mun.name}>
                    {mun.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="barangay">Barangay (Optional)</label>
              <select
                id="barangay"
                name="barangay"
                value={formData.barangay}
                onChange={handleChange}
                disabled={formBarangays.length === 0}
              >
                <option value="">Select your barangay</option>
                {formBarangays.map(barangay => (
                  <option key={barangay.id} value={barangay.id}>
                    {barangay.name}
                  </option>
                ))}
              </select>
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
                    <img src={image.image_small || image.image_medium} alt="Listing" />
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
                    <img src={image.image_small || image.image_medium} alt={image.listing_title} />
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
          <button type="button" onClick={() => navigate('/my-posts')} className="btn-secondary">
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
