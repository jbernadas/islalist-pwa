import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { slugify } from '../utils/slugify';
import './Header.css';

const Header = ({
  showProvinceSelector = false,
  showMunicipalitySelector = false,
  showTagline = false,
  province = '',
  municipality = '',
  provinces = [],
  municipalities = [],
  onProvinceChange = null,
  onMunicipalityChange = null
}) => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  return (
    <header className="app-header">
      <div className="header-content">
        <div className="brand">
          <h1 onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
            🏝️ IslaList
          </h1>
        </div>

        {showTagline && (
          <div className="tag-line">
            <h4>Connecting communities across the Philippine Islands</h4>
          </div>
        )}

        {(showProvinceSelector || showMunicipalitySelector) && (
          <div className="location-selectors">
            {showProvinceSelector && (
              <div className="province-selector">
                <label htmlFor="province-select">📍</label>
                <select
                  id="province-select"
                  value={province ? provinces.find(p => slugify(p) === province) || '' : ''}
                  onChange={onProvinceChange}
                >
                  {provinces.map(prov => (
                    <option key={prov} value={prov}>
                      {prov}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {showMunicipalitySelector && (
              <div className="municipality-selector">
                <label htmlFor="municipality-select">🏘️</label>
                <select
                  id="municipality-select"
                  value={
                    !municipality || municipality === 'all'
                      ? 'all'
                      : municipalities.length > 0
                        ? (municipalities.find(m => slugify(m) === municipality) || 'all')
                        : municipality
                  }
                  onChange={onMunicipalityChange}
                  disabled={municipalities.length === 0}
                >
                  <option value="all">All Cities/Municipalities</option>
                  {municipality && municipalities.length === 0 && municipality !== 'all' && (
                    <option value={municipality}>
                      {municipality.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                    </option>
                  )}
                  {municipalities.map(mun => (
                    <option key={mun} value={mun}>
                      {mun}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}

        <div className="header-actions">
          <button
            onClick={() => {
              if (isAuthenticated) {
                navigate('/favorites');
              } else {
                navigate('/login');
              }
            }}
            className="btn-link"
            title="Favorites"
          >
            Faves
          </button>
          <button
            onClick={() => {
              if (isAuthenticated) {
                // Navigate to create listing page with current location context
                const lastProvince = localStorage.getItem('lastProvince') || 'siquijor';
                const lastMunicipality = localStorage.getItem('lastMunicipality') || 'san-juan';
                navigate(`/${lastProvince}/${lastMunicipality}/create-listing`);
              } else {
                navigate('/login');
              }
            }}
            className="btn-link"
            title="Post a listing"
          >
            Post
          </button>
          <button
            onClick={() => {
              if (isAuthenticated) {
                navigate('/profile');
              } else {
                navigate('/login');
              }
            }}
            className="btn-link"
            title="Account"
          >
            Acct
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
