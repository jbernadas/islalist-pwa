# IslaList Frontend - Progressive Web App

A Progressive Web App (PWA) marketplace platform for the Philippine Islands, starting with Siquijor. Built with React and Vite, featuring offline support, JWT authentication, and seamless integration with the Django REST API backend.

**IslaList is a Craigslist-style local marketplace designed to compete with Facebook Marketplace, offering a dedicated platform for buying and selling in island communities.**

## Features

- **Island Marketplace**
  - Buy and sell locally within Philippine island communities
  - Location-based listings (starting with Siquijor)
  - Categories for various items and services
  - User ratings and reviews
  - Direct messaging between buyers and sellers

- **Progressive Web App (PWA)**
  - Install on any device (mobile, desktop)
  - Offline support with service workers - perfect for areas with limited connectivity
  - Automatic updates
  - App-like experience without app store distribution

- **Authentication System**
  - JWT-based authentication
  - Automatic token refresh
  - Secure token storage
  - Protected routes
  - User profiles with transaction history

- **Modern Stack**
  - React 19 with Hooks
  - React Router for navigation
  - Axios for API communication
  - Vite for fast development and builds

## Prerequisites

- Node.js 18+ and npm
- Running Django backend (see ../backend/README.md)

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` if you need to change the API URL (default is `http://localhost:8000`).

### 3. Add PWA Icons

Generate PWA icons and place them in `public/icons/`. You need the following sizes:
- 72x72, 96x96, 128x128, 144x144, 152x152, 192x192, 384x384, 512x512

See `public/icons/README.md` for more details on generating icons.

### 4. Start Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:5173/`

## Available Scripts

- `npm run dev` - Start development server with HMR
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally
- `npm run lint` - Run ESLint

## Project Structure

```
frontend/
├── public/
│   └── icons/              # PWA icons
├── src/
│   ├── components/         # Reusable components
│   │   └── ProtectedRoute.jsx
│   ├── contexts/          # React contexts
│   │   └── AuthContext.jsx
│   ├── hooks/             # Custom hooks
│   ├── pages/             # Page components
│   │   ├── Home.jsx
│   │   ├── Login.jsx
│   │   └── Register.jsx
│   ├── services/          # API services
│   │   └── api.js
│   ├── utils/             # Utility functions
│   ├── App.jsx            # Main app component
│   ├── main.jsx           # Entry point
│   └── index.css          # Global styles
├── vite.config.js         # Vite configuration
└── package.json
```

## API Integration

The app communicates with the Django backend through:

- **Development**: Uses Vite proxy (`/api` → `http://localhost:8000`)
- **Production**: Set `VITE_API_URL` environment variable

### Authentication Flow

1. User logs in or registers
2. JWT tokens (access + refresh) are stored in localStorage
3. Access token is sent with all API requests
4. When access token expires (1 hour), refresh token automatically gets a new one
5. If refresh fails, user is redirected to login

### API Service

All API calls go through `src/services/api.js`:

```javascript
import { authAPI } from './services/api';

// Login
const result = await authAPI.login({ username, password });

// Get profile
const profile = await authAPI.getProfile();

// Logout
await authAPI.logout(refreshToken);
```

## PWA Configuration

PWA settings are in `vite.config.js`:

- **Manifest**: App name, icons, theme colors, display mode
- **Service Worker**: Workbox with NetworkFirst strategy for API calls
- **Auto Update**: Prompts user when new version is available
- **Offline Support**: Caches static assets and API responses

### Installing the PWA

1. Open the app in a browser
2. Look for the "Install" prompt or menu option
3. Click Install to add to home screen/desktop

## Building for Production

```bash
npm run build
```

This creates an optimized production build in the `dist/` directory with:
- Minified JavaScript and CSS
- Service worker for offline support
- Web manifest for PWA installation
- Optimized assets

### Deploying

The `dist/` folder can be deployed to any static hosting service:

- **Netlify**: Drag and drop the dist folder
- **Vercel**: `vercel deploy`
- **GitHub Pages**: Use gh-pages package
- **Nginx**: Serve the dist folder

**Important**: Set the `VITE_API_URL` environment variable to your production API URL before building.

Example:

```bash
VITE_API_URL=https://api.yourdomain.com npm run build
```

## Development Tips

### Hot Module Replacement (HMR)

Vite provides instant HMR. Changes to React components update immediately without losing state.

### Debugging Service Worker

- Open DevTools → Application → Service Workers
- Check "Update on reload" during development
- Use "Unregister" to clear the service worker

### Testing Offline

1. Build the app: `npm run build`
2. Preview: `npm run preview`
3. Open DevTools → Network → Set to "Offline"
4. Reload the page - it should still work!

## Security Notes

- Tokens are stored in localStorage (consider httpOnly cookies for production)
- HTTPS is required for PWA features in production
- Service workers only work on localhost or HTTPS
- The app uses secure token refresh to maintain sessions

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Mobile)

## Troubleshooting

### Service Worker Issues

```bash
# Clear service worker cache
# DevTools → Application → Clear storage → Clear site data
```

### API Connection Issues

- Ensure backend is running on `http://localhost:8000`
- Check CORS settings in Django backend
- Verify proxy configuration in `vite.config.js`

### Build Issues

```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

## Marketplace Features Roadmap

### Phase 1: Core Marketplace
- [ ] Listing creation and management
- [ ] Category system (Vehicles, Electronics, Home & Garden, Jobs, Services, etc.)
- [ ] Photo upload for listings
- [ ] Search and filtering
- [ ] Location-based browsing

### Phase 2: User Engagement
- [ ] User profiles with ratings and reviews
- [ ] Direct messaging between users
- [ ] Favorites/Watchlist
- [ ] Listing expiration and renewal
- [ ] Report inappropriate content

### Phase 3: Enhanced Features
- [ ] Push notifications for messages and listing updates
- [ ] Price alerts
- [ ] Saved searches
- [ ] Multi-island support
- [ ] Featured listings
- [ ] Business accounts

### Phase 4: Community & Safety
- [ ] User verification system
- [ ] Community guidelines and moderation
- [ ] Safety tips and best practices
- [ ] Transaction dispute resolution
- [ ] Trusted seller badges

## Target Market

**Primary**: Siquijor Island, Philippines
**Future Expansion**: Bohol, Cebu, and other Philippine islands

**Advantages over Facebook Marketplace**:
- Dedicated marketplace experience (no social media distractions)
- Works offline (critical for island connectivity)
- Installable app (no app store required)
- Island-specific features
- Better search and filtering
- Privacy-focused (no social network required)

## License

[Add your license here]
