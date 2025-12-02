import { useState, useEffect } from 'react';
import { listingsAPI } from '../services/api';
import './ImageSelectorModal.css';

const ImageSelectorModal = ({ isOpen, onClose, onSelectImages, excludeImageIds = [] }) => {
  const [userImages, setUserImages] = useState([]);
  const [selectedImages, setSelectedImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('gallery'); // 'gallery' or 'upload'
  const [uploadFiles, setUploadFiles] = useState([]);
  const [uploadPreviews, setUploadPreviews] = useState([]);

  useEffect(() => {
    if (isOpen) {
      fetchUserImages();
    }
  }, [isOpen]);

  useEffect(() => {
    // Handle escape key
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const fetchUserImages = async () => {
    try {
      setLoading(true);
      const response = await listingsAPI.getMyImages();
      setUserImages(response.data);
    } catch (error) {
      console.error('Error fetching user images:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedImages([]);
    setUploadFiles([]);
    setUploadPreviews([]);
    setView('gallery');
    onClose();
  };

  const toggleImageSelection = (image) => {
    // Don't allow selecting excluded images
    if (excludeImageIds.includes(image.id)) {
      return;
    }

    setSelectedImages(prev => {
      const isSelected = prev.some(img => img.id === image.id);
      if (isSelected) {
        return prev.filter(img => img.id !== image.id);
      } else {
        return [...prev, image];
      }
    });
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    setUploadFiles(prev => [...prev, ...files]);

    // Create previews
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadPreviews(prev => [...prev, { file, preview: reader.result }]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeUploadFile = (index) => {
    setUploadFiles(prev => prev.filter((_, i) => i !== index));
    setUploadPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleConfirm = () => {
    onSelectImages({
      reusedImages: selectedImages,
      newFiles: uploadFiles
    });
    handleClose();
  };

  if (!isOpen) return null;

  return (
    <div className="image-selector-overlay" onClick={(e) => {
      if (e.target.classList.contains('image-selector-overlay')) {
        handleClose();
      }
    }}>
      <div className="image-selector-modal">
        <div className="modal-header">
          <h2>Select Images</h2>
          <button className="close-btn" onClick={handleClose}>×</button>
        </div>

        <div className="modal-tabs">
          <button
            type="button"
            className={view === 'gallery' ? 'active' : ''}
            onClick={() => setView('gallery')}
          >
            📚 My Images ({userImages.length})
          </button>
          <button
            type="button"
            className={view === 'upload' ? 'active' : ''}
            onClick={() => setView('upload')}
          >
            📤 Upload New ({uploadFiles.length})
          </button>
        </div>

        <div className="modal-body">
          {view === 'gallery' && (
            <div className="gallery-view">
              {loading ? (
                <div className="loading">Loading your images...</div>
              ) : userImages.length === 0 ? (
                <div className="empty-state">
                  <p>No images uploaded yet.</p>
                  <p>Switch to "Upload New" to add your first image.</p>
                </div>
              ) : (
                <div className="image-grid">
                  {userImages.map(image => {
                    const isExcluded = excludeImageIds.includes(image.id);
                    const isSelected = selectedImages.some(img => img.id === image.id);

                    return (
                      <div
                        key={image.id}
                        className={`image-item ${isSelected ? 'selected' : ''} ${isExcluded ? 'excluded' : ''}`}
                        onClick={() => toggleImageSelection(image)}
                      >
                        <img src={image.image_small || image.image_medium} alt={image.listing_title} />
                        <div className="image-overlay">
                          <div className="image-info">
                            <span className="listing-name">{image.listing_title}</span>
                          </div>
                          {isExcluded && (
                            <div className="excluded-badge">Already in listing</div>
                          )}
                          {isSelected && !isExcluded && (
                            <div className="selected-badge">✓</div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {view === 'upload' && (
            <div className="upload-view">
              <div className="upload-area">
                <input
                  type="file"
                  id="file-input"
                  multiple
                  accept="image/*"
                  onChange={handleFileSelect}
                  style={{ display: 'none' }}
                />
                <label htmlFor="file-input" className="upload-button">
                  <span className="upload-icon">📁</span>
                  <span>Choose files from computer</span>
                  <span className="upload-hint">or drag and drop</span>
                </label>
              </div>

              {uploadPreviews.length > 0 && (
                <div className="upload-previews">
                  <h3>Selected Files ({uploadPreviews.length})</h3>
                  <div className="preview-grid">
                    {uploadPreviews.map((item, index) => (
                      <div key={index} className="preview-item">
                        <img src={item.preview} alt={`Upload ${index + 1}`} />
                        <button
                          className="remove-preview-btn"
                          onClick={() => removeUploadFile(index)}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <div className="selection-summary">
            {selectedImages.length > 0 && (
              <span>✓ {selectedImages.length} existing image(s)</span>
            )}
            {uploadFiles.length > 0 && (
              <span>📤 {uploadFiles.length} new file(s)</span>
            )}
            {selectedImages.length === 0 && uploadFiles.length === 0 && (
              <span>No images selected</span>
            )}
          </div>
          <div className="modal-actions">
            <button type="button" className="btn-cancel" onClick={handleClose}>
              Cancel
            </button>
            <button
              type="button"
              className="btn-confirm"
              onClick={handleConfirm}
              disabled={selectedImages.length === 0 && uploadFiles.length === 0}
            >
              Add Images ({selectedImages.length + uploadFiles.length})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageSelectorModal;
