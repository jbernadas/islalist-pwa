# IslaList Frontend

Deep-dive documentation for the React PWA frontend. For quick start and common developer commands, see the [main README](../README.md).

## Project Structure

```
frontend/
├── public/
│   └── icons/              # PWA icons (72x72 to 512x512)
├── src/
│   ├── components/         # Reusable components
│   │   └── ProtectedRoute.jsx
│   ├── contexts/           # React contexts
│   │   └── AuthContext.jsx
│   ├── hooks/              # Custom hooks
│   ├── pages/              # Page components
│   │   ├── Home.jsx
│   │   ├── Login.jsx
│   │   └── Register.jsx
│   ├── services/           # API services
│   │   └── api.js
│   ├── test/               # Test setup
│   │   └── setup.js
│   ├── utils/              # Utility functions
│   ├── App.jsx             # Main app component
│   ├── main.jsx            # Entry point
│   └── index.css           # Global styles
├── vitest.config.js        # Test configuration
├── vite.config.js          # Vite + PWA configuration
└── eslint.config.js        # Linting rules
```

## PWA Configuration

PWA settings are in `vite.config.js`:

- **Manifest**: App name, icons, theme colors, display mode
- **Service Worker**: Workbox with NetworkFirst strategy for API calls
- **Auto Update**: Prompts user when new version is available
- **Offline Support**: Caches static assets and API responses

### PWA Icon Requirements

Place icons in `public/icons/` with these sizes:
- 72x72, 96x96, 128x128, 144x144, 152x152, 192x192, 384x384, 512x512

### Installing the PWA

1. Open the app in a supported browser
2. Look for the "Install" prompt or browser menu option
3. Click Install to add to home screen/desktop

## API Integration

### Proxy Configuration

- **Development**: Vite proxy routes `/api` → `http://localhost:8000`
- **Production**: Set `VITE_API_URL` environment variable before build

### Using the API Service

```javascript
import { authAPI } from './services/api';

// Login
const result = await authAPI.login({ username, password });

// Get profile
const profile = await authAPI.getProfile();

// Logout
await authAPI.logout(refreshToken);
```

### Authentication Flow

1. User logs in or registers
2. JWT tokens stored in localStorage
3. Access token sent with all API requests via Axios interceptor
4. On 401 response, refresh token automatically gets new access token
5. If refresh fails, user redirected to login

## Testing

The frontend uses Vitest with jsdom environment.

```bash
# Run tests in watch mode (interactive)
npm test

# Run tests once and exit
npm test -- --run

# Run with browser UI
npm run test:ui

# Run with coverage report
npm run test:coverage

# Run specific test file
npm test -- src/hooks/__tests__/useLocationsCompliance.test.js

# Run tests matching a pattern
npm test -- --grep "useLocations"
```

### Test Files

| File | Description |
|------|-------------|
| `src/hooks/__tests__/useLocationsCompliance.test.js` | Location hook compliance |
| `src/pages/__tests__/Listings.test.jsx` | Listings page tests |

### Writing Tests

Tests use React Testing Library. Example:

```javascript
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import MyComponent from '../MyComponent';

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });
});
```

## Troubleshooting

### Service Worker Issues

```bash
# In DevTools → Application → Clear storage → Clear site data
```

Or during development:
- DevTools → Application → Service Workers
- Check "Update on reload"
- Use "Unregister" to clear completely

### API Connection Issues

1. Ensure backend is running on `http://localhost:8000`
2. Check CORS settings in Django backend
3. Verify proxy configuration in `vite.config.js`

### Build Issues

```bash
# Clear and reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### Testing Offline Mode

1. Build the app: `npm run build`
2. Preview: `npm run preview`
3. DevTools → Network → Set to "Offline"
4. Reload - the app should still work

## Security Notes

- Tokens stored in localStorage (consider httpOnly cookies for higher security)
- HTTPS required for PWA features in production
- Service workers only work on localhost or HTTPS

## Browser Support

| Browser | Minimum Version |
|---------|-----------------|
| Chrome/Edge | 90+ |
| Firefox | 88+ |
| Safari | 14+ |
| iOS Safari | 14+ |
| Chrome Mobile | 90+ |

## Deployment Options

The `dist/` folder (after `npm run build`) can be deployed to:

| Platform | Command/Method |
|----------|----------------|
| Netlify | Drag and drop dist folder, or CLI |
| Vercel | `vercel deploy` |
| GitHub Pages | Use gh-pages package |
| Nginx | Serve dist folder as static files |

**Remember**: Set `VITE_API_URL` before building:

```bash
VITE_API_URL=https://api.yourdomain.com npm run build
```

## Roadmap

### Phase 1: Core Marketplace
- [ ] Listing creation and management
- [ ] Category browsing
- [ ] Photo upload
- [ ] Search and filtering

### Phase 2: User Engagement
- [ ] User profiles with ratings
- [ ] Direct messaging
- [ ] Favorites/Watchlist
- [ ] Report inappropriate content

### Phase 3: Enhanced Features
- [ ] Push notifications
- [ ] Price alerts
- [ ] Saved searches
- [ ] Multi-island support

### Phase 4: Community & Safety
- [ ] User verification
- [ ] Moderation tools
- [ ] Trusted seller badges
