import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import api from '../services/api';
import './Home.css';

const Home = () => {
  const [provinces, setProvinces] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProvinces();
  }, []);

  const fetchProvinces = async () => {
    try {
      const response = await api.get('/api/provinces/');
      setProvinces(response.data);
    } catch (error) {
      console.error('Error fetching provinces:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="home-container">
      <Header />

      <main className="home-content">
        <div className="welcome-section">
          <h2>Browse by Province</h2>
          <p>Select a province to explore local listings and cities/municipalities</p>
        </div>

        {loading ? (
          <div className="loading-state">
            <p>Loading provinces...</p>
          </div>
        ) : (
          <div className="provinces-list">
            {provinces.map((province) => (
              <Link
                key={province.id}
                to={`/${province.slug}`}
                className="province-link"
              >
                {province.name}
              </Link>
            ))}
          </div>
        )}
      </main>

      <footer className="home-footer">
        <p>&copy; 2024 IslaList - Connecting communities across the Philippine Islands</p>
      </footer>
    </div>
  );
};

export default Home;
