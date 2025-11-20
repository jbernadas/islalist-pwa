import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { slugify } from '../utils/slugify';
import './BarangayModal.css';

const BarangayModal = ({ isOpen, onClose, barangays, province, municipality, municipalityName }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredBarangays, setFilteredBarangays] = useState(barangays);
  const navigate = useNavigate();
  const searchInputRef = useRef(null);
  const modalRef = useRef(null);

  // Filter barangays based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredBarangays(barangays);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = barangays.filter(barangay =>
      barangay.name.toLowerCase().includes(query)
    );
    setFilteredBarangays(filtered);
  }, [searchQuery, barangays]);

  // Autofocus search input when modal opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;

      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const handleBarangayClick = (barangay) => {
    navigate(`/${province}/${municipality}/${slugify(barangay.name)}`);
    onClose();
  };

  const handleOverlayClick = (e) => {
    if (e.target === modalRef.current) {
      onClose();
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    searchInputRef.current?.focus();
  };

  if (!isOpen) return null;

  return (
    <div
      className="barangay-modal-overlay"
      ref={modalRef}
      onClick={handleOverlayClick}
    >
      <div className="barangay-modal-content">
        {/* Header */}
        <div className="barangay-modal-header">
          <h2>🏘️ Barangays in {municipalityName}</h2>
          <button
            className="barangay-modal-close"
            onClick={onClose}
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        {/* Search Input */}
        <div className="barangay-modal-search">
          <span className="search-icon">🔍</span>
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search barangays..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="barangay-search-input"
          />
          {searchQuery && (
            <button
              className="search-clear-btn"
              onClick={handleClearSearch}
              aria-label="Clear search"
            >
              ✕
            </button>
          )}
        </div>

        {/* Barangays Grid */}
        <div className="barangay-modal-body">
          {filteredBarangays.length > 0 ? (
            <>
              <div className="barangays-modal-grid">
                {filteredBarangays.map(barangay => (
                  <button
                    key={barangay.id}
                    className="barangay-modal-card"
                    onClick={() => handleBarangayClick(barangay)}
                  >
                    <span className="barangay-modal-icon">📍</span>
                    <span className="barangay-modal-name">{barangay.name}</span>
                    <span className="barangay-modal-arrow">→</span>
                  </button>
                ))}
              </div>

              {/* Results Count */}
              <div className="barangay-modal-footer">
                {searchQuery ? (
                  <p>Showing {filteredBarangays.length} of {barangays.length} barangays</p>
                ) : (
                  <p>{barangays.length} barangays total</p>
                )}
              </div>
            </>
          ) : (
            <div className="barangay-modal-empty">
              <p className="empty-icon">🔍</p>
              <p className="empty-text">No barangays found matching "{searchQuery}"</p>
              <button className="empty-clear-btn" onClick={handleClearSearch}>
                Clear search
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BarangayModal;
