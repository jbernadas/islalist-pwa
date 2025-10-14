import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import './Home.css';

const Home = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="home-container">
      <header className="home-header">
        <h1>IslaList</h1>
        <div className="user-info">
          <span>
            Welcome, {user?.first_name || user?.username}!
          </span>
          <button onClick={handleLogout} className="btn-secondary">
            Logout
          </button>
        </div>
      </header>

      <main className="home-content">
        <div className="welcome-card">
          <h2>Welcome to IslaList</h2>
          <p>The marketplace for Siquijor and the Philippine Islands</p>

          <div className="user-details">
            <h3>Your Profile</h3>
            <p><strong>Username:</strong> {user?.username}</p>
            <p><strong>Email:</strong> {user?.email}</p>
            <p><strong>Name:</strong> {user?.first_name} {user?.last_name}</p>
          </div>

          <div className="pwa-info">
            <h3>Getting Started</h3>
            <ul>
              <li>Browse listings from sellers across the islands</li>
              <li>Post your items for sale to the local community</li>
              <li>Connect with buyers and sellers in your area</li>
              <li>Works offline - perfect for areas with limited connectivity</li>
              <li>Install on your phone for easy access anytime</li>
            </ul>
          </div>

          <div className="marketplace-actions">
            <button
              onClick={() => navigate('/create-listing')}
              className="btn-create-listing"
            >
              📝 Create Listing
            </button>
            <button
              onClick={() => navigate('/listings')}
              className="btn-browse-listings"
            >
              🔍 Browse Listings
            </button>
            <button
              onClick={() => navigate('/my-listings')}
              className="btn-my-listings"
            >
              📋 My Listings
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Home;
