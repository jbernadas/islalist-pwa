import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { categoriesAPI, listingsAPI, provincesAPI } from '../services/api';
import { slugify } from '../utils/slugify';
import ImageSelectorModal from '../components/ImageSelectorModal';
import AuthenticatedHeader from '../components/AuthenticatedHeader';
import './CreateListing.css';

const CreateListing = () => {
  const navigate = useNavigate();
  const { province, municipality } = useParams();
  const [categories, setCategories] = useState([]);
  const [images, setImages] = useState([]);
  const [reusedImages, setReusedImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showImageModal, setShowImageModal] = useState(false);
  const [municipalities, setMunicipalities] = useState([]);
  const [currentMunicipalityName, setCurrentMunicipalityName] = useState('');

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
    is_province_wide: false,
  });

  useEffect(() => {
    fetchCategories();
    fetchMunicipalities();
  }, [province, municipality]);

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

  const fetchMunicipalities = async () => {
    try {
      if (!province) return;

      const response = await provincesAPI.getMunicipalities(province);
      const municipalitiesData = response.data;
      setMunicipalities(municipalitiesData);

      // Find current municipality and set location
      const currentMunicipality = municipalitiesData.find(m => slugify(m.name) === municipality);
      if (currentMunicipality) {
        setCurrentMunicipalityName(currentMunicipality.name);
        // Auto-populate location with municipality name (unless province-wide)
        if (!formData.is_province_wide) {
          setFormData(prev => ({ ...prev, location: currentMunicipality.name }));
        }
      }
    } catch (err) {
      console.error('Error fetching municipalities:', err);
    }
  };

  const handleProvinceWideChange = (e) => {
    const isProvinceWide = e.target.checked;
    setFormData(prev => ({
      ...prev,
      is_province_wide: isProvinceWide,
      // When province-wide, set location to province name (capitalize first letter)
      location: isProvinceWide
        ? province.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
        : currentMunicipalityName
    }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
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
      navigate(`/${province}/${municipality}/listings`);
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

  // Helper function to build city/municipality-scoped URLs
  const getMunicipalityPath = (path = '') => {
    return `/${province}/${municipality}${path}`;
  };

  return (
    <div className="create-listing-container">
      <AuthenticatedHeader
        title="Create Listing"
        onLogoClick={() => navigate(`/${province}/${municipality}`)}
      />

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

          <div className="form-group">
            <label className="checkbox-label d-flex">
              <input
                type="checkbox"
                name="is_province_wide"
                checked={formData.is_province_wide}
                onChange={handleProvinceWideChange}
                style={{ width: 'auto', flexShrink: 0, marginRight: '0.75rem' }}
              />
              <span style={{ flex: 1 , fontWeight: 'bold' }}>Province-wide listing (show this in all municipalities)</span>
            </label>
            <p className="help-text">
              Check this if your listing serves the entire province (e.g., mobile services, delivery).
            </p>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="location">Location (City/Municipality) *</label>
              <select
                id="location"
                name="location"
                value={formData.location}
                onChange={handleChange}
                required
                disabled={formData.is_province_wide}
              >
                <option value="">Select a municipality</option>
                {municipalities.map(mun => (
                  <option key={mun.id} value={mun.name}>
                    {mun.name}
                  </option>
                ))}
              </select>
              <p className="help-text">
                {formData.is_province_wide
                  ? `Set to province-wide: ${formData.location}`
                  : `Currently set to: ${currentMunicipalityName || 'None'}. You can change this if needed.`}
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
                disabled={formData.is_province_wide}
              />
            </div>
          </div>

          <div className="form-row">
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
          <button type="button" onClick={() => navigate(`/${province}/${municipality}`)} className="btn-secondary">
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
