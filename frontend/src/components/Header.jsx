import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { slugify } from '../utils/slugify';
import './Header.css';

const Header = ({
  showProvinceSelector = false,
  showMunicipalitySelector = false,
  showTagline = false,
  pageTitle = null,
  breadcrumbs = null,
  province = '',
  municipality = '',
  provinces = [],
  municipalities = [],
  onProvinceChange = null,
  onMunicipalityChange = null
}) => {
  const navigate = useNavigate();
  const { isAuthenticated, user, logout } = useAuth();
  const [showPostDropdown, setShowPostDropdown] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);

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

        {pageTitle && (
          <div className="page-title">
            <h1>{pageTitle}</h1>
          </div>
        )}

        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav className="breadcrumb" aria-label="Breadcrumb">
            {breadcrumbs.map((crumb, index) => (
              <span key={index} className="breadcrumb-item">
                {crumb.path ? (
                  <button
                    onClick={() => navigate(crumb.path)}
                    className="breadcrumb-link"
                  >
                    {crumb.label}
                  </button>
                ) : (
                  <span className="breadcrumb-current">{crumb.label}</span>
                )}
                {index < breadcrumbs.length - 1 && (
                  <span className="breadcrumb-separator"> › </span>
                )}
              </span>
            ))}
          </nav>
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
                  <option value="">All Provinces</option>
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
          <div className="dropdown">
            <button
              className="btn-link dropdown-toggle"
              type="button"
              onClick={() => setShowPostDropdown(!showPostDropdown)}
              aria-expanded={showPostDropdown}
            >
              Post
            </button>
            <ul className={`dropdown-menu ${showPostDropdown ? 'show' : ''}`}>
              <li>
                <button
                  className="dropdown-item"
                  onClick={() => {
                    if (isAuthenticated) {
                      const lastProvince = localStorage.getItem('lastProvince') || 'siquijor';
                      const lastMunicipality = localStorage.getItem('lastMunicipality') || 'san-juan';
                      navigate(`/${lastProvince}/${lastMunicipality}/create-listing`);
                      setShowPostDropdown(false);
                    } else {
                      const lastProvince = localStorage.getItem('lastProvince') || 'siquijor';
                      const lastMunicipality = localStorage.getItem('lastMunicipality') || 'san-juan';
                      const returnUrl = `/${lastProvince}/${lastMunicipality}/create-listing`;
                      navigate(`/login?returnUrl=${encodeURIComponent(returnUrl)}`);
                    }
                  }}
                >
                  📝 Post Listing
                </button>
              </li>
              <li>
                <button
                  className="dropdown-item"
                  onClick={() => {
                    if (isAuthenticated) {
                      const lastProvince = localStorage.getItem('lastProvince') || 'siquijor';
                      const lastMunicipality = localStorage.getItem('lastMunicipality') || 'san-juan';
                      navigate(`/${lastProvince}/${lastMunicipality}/create-announcement`);
                      setShowPostDropdown(false);
                    } else {
                      const lastProvince = localStorage.getItem('lastProvince') || 'siquijor';
                      const lastMunicipality = localStorage.getItem('lastMunicipality') || 'san-juan';
                      const returnUrl = `/${lastProvince}/${lastMunicipality}/create-announcement`;
                      navigate(`/login?returnUrl=${encodeURIComponent(returnUrl)}`);
                    }
                  }}
                >
                  📢 Post Announcement
                </button>
              </li>
            </ul>
          </div>
          {isAuthenticated ? (
            <div className="dropdown">
              <button
                className="btn-link dropdown-toggle"
                type="button"
                onClick={() => setShowUserDropdown(!showUserDropdown)}
                aria-expanded={showUserDropdown}
              >
                {user?.username || 'Account'}
              </button>
              <ul className={`dropdown-menu ${showUserDropdown ? 'show' : ''}`}>
                <li>
                  <button
                    className="dropdown-item"
                    onClick={() => {
                      navigate('/profile');
                      setShowUserDropdown(false);
                    }}
                  >
                    👤 My Profile
                  </button>
                </li>
                <li>
                  <button
                    className="dropdown-item"
                    onClick={() => {
                      navigate('/my-posts');
                      setShowUserDropdown(false);
                    }}
                  >
                    📋 My Posts
                  </button>
                </li>
                <li>
                  <button
                    className="dropdown-item"
                    onClick={() => {
                      navigate('/favorites');
                      setShowUserDropdown(false);
                    }}
                  >
                    ⭐ My Favorites
                  </button>
                </li>
                <li>
                  <button
                    className="dropdown-item dropdown-item-danger"
                    onClick={async () => {
                      await logout();
                      setShowUserDropdown(false);
                      navigate('/');
                    }}
                  >
                    🚪 Logout
                  </button>
                </li>
              </ul>
            </div>
          ) : (
            <button
              onClick={() => navigate('/login')}
              className="btn-link"
              title="Account"
            >
              Acct
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
