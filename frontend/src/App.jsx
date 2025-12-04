import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import VerifyEmail from './pages/VerifyEmail';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Home from './pages/Home';
import Province from './pages/Province';
import CityMunBulletinBoard from './pages/CityMunBulletinBoard';
import BarangayBulletinBoard from './pages/BarangayBulletinBoard';
import CreateListing from './pages/CreateListing';
import EditListing from './pages/EditListing';
import Listings from './pages/Listings';
import ListingDetail from './pages/ListingDetail';
import Announcements from './pages/Announcements';
import CreateAnnouncement from './pages/CreateAnnouncement';
import EditAnnouncement from './pages/EditAnnouncement';
import AnnouncementDetail from './pages/AnnouncementDetail';
import MyPosts from './pages/MyPosts';
import Favorites from './pages/Favorites';
import Profile from './pages/Profile';
import PublicProfile from './pages/PublicProfile';
import ModDashboard from './pages/ModDashboard';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Auth routes (global) */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/verify-email/:key" element={<VerifyEmail />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password/:uid/:token" element={<ResetPassword />} />

          {/* User routes (global) */}
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
          <Route path="/user/:username" element={<PublicProfile />} />
          <Route
            path="/my-posts"
            element={
              <ProtectedRoute>
                <MyPosts />
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

          {/* Moderator Dashboard - requires authentication */}
          <Route
            path="/mod"
            element={
              <ProtectedRoute>
                <ModDashboard />
              </ProtectedRoute>
            }
          />

          {/* Province/City/Municipality/Barangay routes (new structure) */}
          {/* More specific routes first - barangay routes */}
          <Route path="/:province/:municipality/:barangay" element={<BarangayBulletinBoard />} />

          {/* Municipality routes */}
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
          <Route
            path="/:province/:municipality/announcements/:id/edit"
            element={
              <ProtectedRoute>
                <EditAnnouncement />
              </ProtectedRoute>
            }
          />
          <Route path="/:province/:municipality/announcements" element={<Announcements />} />

          <Route path="/:province/:municipality" element={<CityMunBulletinBoard />} />

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
