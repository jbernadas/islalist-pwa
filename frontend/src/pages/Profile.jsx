import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Profile = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Redirect to public profile page
  useEffect(() => {
    if (user) {
      navigate(`/user/${user.username}`, { replace: true });
    }
  }, [user, navigate]);

  return null; // Component only redirects, no UI
};

export default Profile;
