import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import Home from './pages/Home';
import Province from './pages/Province';
import BulletinBoard from './pages/BulletinBoard';
import CreateListing from './pages/CreateListing';
import EditListing from './pages/EditListing';
import Listings from './pages/Listings';
import ListingDetail from './pages/ListingDetail';
import Announcements from './pages/Announcements';
import CreateAnnouncement from './pages/CreateAnnouncement';
import AnnouncementDetail from './pages/AnnouncementDetail';
import MyListings from './pages/MyListings';
import Favorites from './pages/Favorites';
import Profile from './pages/Profile';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Auth routes (global) */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* User routes (global) */}
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/my-listings"
            element={
              <ProtectedRoute>
                <MyListings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/favorites"
            element={
              <ProtectedRoute>
                <Favorites />
              </ProtectedRoute>
            }
          />

          {/* Province/City/Municipality routes (new structure) */}
          {/* More specific routes first */}
          <Route path="/:province/:municipality/listings/:id" element={<ListingDetail />} />
          <Route
            path="/:province/:municipality/create-listing"
            element={
              <ProtectedRoute>
                <CreateListing />
              </ProtectedRoute>
            }
          />
          <Route
            path="/:province/:municipality/edit-listing/:id"
            element={
              <ProtectedRoute>
                <EditListing />
              </ProtectedRoute>
            }
          />
          <Route path="/:province/:municipality/listings" element={<Listings />} />

          <Route path="/:province/:municipality/announcements/:id" element={<AnnouncementDetail />} />
          <Route
            path="/:province/:municipality/create-announcement"
            element={
              <ProtectedRoute>
                <CreateAnnouncement />
              </ProtectedRoute>
            }
          />
          <Route path="/:province/:municipality/announcements" element={<Announcements />} />

          <Route path="/:province/:municipality" element={<BulletinBoard />} />

          {/* Province page - shows cities/municipalities */}
          <Route path="/:province" element={<Province />} />

          {/* Root shows home page with all provinces */}
          <Route path="/" element={<Home />} />

          {/* Catch-all redirects to home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
