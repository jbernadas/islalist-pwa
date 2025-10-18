import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Header.css';

const Header = ({
  showProvinceSelector = false,
  showMunicipalitySelector = false,
  province = '',
  municipality = '',
  provinces = [],
  municipalities = [],
  onProvinceChange = null,
  onMunicipalityChange = null
}) => {
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();

  const handleLogout = async () => {
    await logout();

    // Get the last visited location and redirect there
    const lastProvince = localStorage.getItem('lastProvince');
    const lastMunicipality = localStorage.getItem('lastMunicipality');

    if (lastProvince && lastMunicipality && lastMunicipality !== 'all') {
      navigate(`/${lastProvince}/${lastMunicipality}`);
    } else if (lastProvince) {
      navigate(`/${lastProvince}`);
    } else {
      navigate('/');
    }
  };

  return (
    <header className="app-header">
      <div className="header-content">
        <div className="brand">
          <h1 onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
            🏝️ IslaList
          </h1>
        </div>

        {(showProvinceSelector || showMunicipalitySelector) && (
          <div className="location-selectors">
            {showProvinceSelector && (
              <div className="province-selector">
                <label htmlFor="province-select">📍</label>
                <select
                  id="province-select"
                  value={province ? provinces.find(p => p.toLowerCase().replace(/\s+/g, '-') === province) || '' : ''}
                  onChange={onProvinceChange}
                >
                  <option value="">All Provinces</option>
                  {provinces.map(prov => (
                    <option key={prov} value={prov}>
                      {prov}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {showMunicipalitySelector && municipalities.length > 0 && (
              <div className="municipality-selector">
                <label htmlFor="municipality-select">🏘️</label>
                <select
                  id="municipality-select"
                  value={
                    municipality === 'all' || !municipality
                      ? 'all'
                      : municipalities.find(m => m.toLowerCase().replace(/\s+/g, '-') === municipality) || 'all'
                  }
                  onChange={onMunicipalityChange}
                >
                  <option value="all">All Cities/Municipalities</option>
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
          {isAuthenticated ? (
            <>
              <button onClick={() => navigate('/my-listings')} className="btn-link">
                My Listings
              </button>
              <button onClick={() => navigate('/favorites')} className="btn-link">
                Favorites
              </button>
              <button onClick={() => navigate('/profile')} className="btn-link">
                Profile
              </button>
              <button onClick={handleLogout} className="btn-secondary">
                Logout
              </button>
            </>
          ) : (
            <>
              <button onClick={() => navigate('/login')} className="btn-link">
                Login
              </button>
              <button onClick={() => navigate('/register')} className="btn-primary">
                Register
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
