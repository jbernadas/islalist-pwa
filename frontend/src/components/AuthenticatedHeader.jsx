import { useAuth } from '../contexts/AuthContext';
import './AuthenticatedHeader.css';

const AuthenticatedHeader = ({
  title,
  onLogoClick,
  showProfileButton = false,
  onProfileClick = null
}) => {
  const { logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    onLogoClick(); // Navigate to home after logout
  };

  return (
    <header className="authenticated-header">
      <div className="authenticated-header-content">
        <div onClick={onLogoClick} className="brand">
          🏝️ IslaList
        </div>
        <h1>{title}</h1>
        <div className="header-actions">
          {showProfileButton && onProfileClick && (
            <button onClick={onProfileClick} className="btn-secondary">
              Profile
            </button>
          )}
          <button onClick={handleLogout} className="btn-logout">
            Logout
          </button>
        </div>
      </div>
    </header>
  );
};

export default AuthenticatedHeader;
