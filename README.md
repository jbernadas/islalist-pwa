# IslaList

A Craigslist-style local marketplace for Philippine island communities, starting with Siquijor. Built as a Progressive Web App (PWA) with a Django REST API backend.

## Features

- **User Authentication** - JWT-based auth with email verification and password reset
- **Listings CRUD** - Multi-image upload with WebP optimization
- **Location Filtering** - PSGC codes for Province → Municipality → Barangay hierarchy
- **Announcements** - Province/municipality-wide visibility
- **Profile Pictures** - Size variants for performance
- **Favorites/Bookmarks** - Save listings for later
- **Categories** - Parent-child category structure
- **Real Estate & Vehicle Fields** - Specialized listing types
- **PWA** - Offline caching, installable on any device

## Project Structure

```
islalist/
├── backend/          # Django REST API
│   ├── api/          # Main API app
│   ├── core/         # Django project settings
│   └── requirements.txt
├── frontend/         # React PWA
│   ├── src/
│   └── package.json
└── README.md         # This file
```

## Quick Start

### Prerequisites

- Python 3.10+
- Node.js 18+
- PostgreSQL (production) or SQLite (development)

### Backend Setup

```bash
cd backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your settings

# Run migrations
python manage.py migrate

# Start server
python manage.py runserver
```

Backend runs at `http://localhost:8000/`

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Configure environment
cp .env.example .env

# Start development server
npm run dev
```

Frontend runs at `http://localhost:5173/`

## API Documentation (Swagger/OpenAPI)

Interactive API documentation is available when the backend is running:

| URL | Description |
|-----|-------------|
| `/api/docs/` | Swagger UI - Interactive API explorer |
| `/api/redoc/` | ReDoc - Alternative documentation UI |
| `/api/schema/` | Raw OpenAPI schema (JSON/YAML) |

The documentation includes all endpoints with request/response examples, authentication requirements, and parameter descriptions.

## Error Monitoring (Sentry)

Production error monitoring is configured via Sentry. To enable:

1. Create a project at [sentry.io](https://sentry.io)
2. Add your DSN to `.env`:

```bash
SENTRY_DSN=https://your-dsn@sentry.io/project-id
SENTRY_ENVIRONMENT=production
SENTRY_TRACES_SAMPLE_RATE=0.1
SENTRY_PROFILES_SAMPLE_RATE=0.1
SENTRY_RELEASE=1.0.0
```

Sentry captures:
- Unhandled exceptions with full stack traces
- Performance traces (configurable sample rate)
- Django request/response context
- User context (without PII)

## Authentication

The API uses JWT (JSON Web Token) authentication:

| Token | Lifetime | Purpose |
|-------|----------|---------|
| Access | 1 hour | API request authorization |
| Refresh | 7 days | Obtain new access tokens |

### Auth Endpoints

```bash
# Register
POST /api/auth/register/

# Login (get tokens)
POST /api/auth/login/

# Refresh access token
POST /api/auth/refresh/

# Verify token
POST /api/auth/verify/

# Logout (blacklist token)
POST /api/auth/logout/
```

### Making Authenticated Requests

```bash
curl -H "Authorization: Bearer <access-token>" \
  http://localhost:8000/api/listings/
```

## Rate Limiting

The API includes rate limiting to prevent abuse:

| User Type | Limit |
|-----------|-------|
| Anonymous | 100 requests/hour |
| Authenticated | 1000 requests/hour |
| Auth endpoints | 5 requests/minute |
| Password reset | 3 requests/hour |

## Developer Guide

This section covers all the commands and workflows developers need to work on IslaList.

### Testing

#### Backend Tests

The backend uses pytest with Django test settings (SQLite in-memory for speed).

```bash
cd backend
source venv/bin/activate

# Run all tests
pytest

# Run with verbose output (default)
pytest -v

# Run with coverage report
pytest --cov=api

# Run with HTML coverage report
pytest --cov=api --cov-report=html

# Run specific test file
pytest api/tests/test_auth.py

# Run specific test class
pytest api/tests/test_auth.py::TestLoginView

# Run specific test method
pytest api/tests/test_auth.py::TestLoginView::test_login_success

# Run tests by marker
pytest -m unit          # Unit tests only
pytest -m integration   # Integration tests only
pytest -m "not slow"    # Exclude slow tests

# Run tests in parallel (if pytest-xdist installed)
pytest -n auto
```

#### Frontend Tests

The frontend uses Vitest with jsdom environment.

```bash
cd frontend

# Run tests (watch mode)
npm test

# Run tests once and exit
npm test -- --run

# Run with interactive UI
npm run test:ui

# Run with coverage report
npm run test:coverage

# Run specific test file
npm test -- src/components/Header.test.jsx

# Run tests matching a pattern
npm test -- --grep "login"
```

### Linting & Code Quality

#### Frontend Linting

```bash
cd frontend

# Run ESLint
npm run lint

# Fix auto-fixable issues
npm run lint -- --fix
```

#### Backend Code Style

```bash
cd backend
source venv/bin/activate

# If you have flake8 installed
flake8 api/

# If you have black installed
black api/ --check    # Check only
black api/            # Auto-format
```

### Database Management

#### Migrations

```bash
cd backend
source venv/bin/activate

# Create new migrations after model changes
python manage.py makemigrations

# Apply pending migrations
python manage.py migrate

# Show migration status
python manage.py showmigrations

# Revert to a specific migration
python manage.py migrate api 0001_initial

# Create empty migration for data migration
python manage.py makemigrations api --empty --name=migration_name
```

#### Django Shell

```bash
cd backend
source venv/bin/activate

# Interactive Python shell with Django context
python manage.py shell

# With IPython (if installed)
python manage.py shell -i ipython
```

#### Database Reset (Development Only)

```bash
# PostgreSQL - drop and recreate database
psql -U postgres -c "DROP DATABASE islalist_db;"
psql -U postgres -c "CREATE DATABASE islalist_db OWNER islalist_user;"
python manage.py migrate
```

### Seeding Data

The backend includes management commands to populate the database with initial data.

```bash
cd backend
source venv/bin/activate

# Seed marketplace categories
python manage.py seed_categories

# Seed Philippine locations (provinces and municipalities)
python manage.py seed_locations

# Seed Siquijor-specific location data
python manage.py seed_siquijor

# Reseed locations (update existing)
python manage.py reseed_locations

# Parse PSGC (Philippine Standard Geographic Code) data
python manage.py parse_psgc

# Check for misplaced city/municipality entries
python manage.py check_misplaced_city_mun
```

### Maintenance Commands

```bash
cd backend
source venv/bin/activate

# Unpublish expired announcements
python manage.py unpublish_expired_announcements

# Preview without making changes
python manage.py unpublish_expired_announcements --dry-run

# Create superuser for admin access
python manage.py createsuperuser

# Collect static files (production)
python manage.py collectstatic
```

### Running the Development Servers

#### Backend Server

```bash
cd backend
source venv/bin/activate

# Development server (auto-reload enabled)
python manage.py runserver

# Specify port
python manage.py runserver 8080

# Accessible from network
python manage.py runserver 0.0.0.0:8000
```

#### Frontend Server

```bash
cd frontend

# Development server with hot reload
npm run dev

# Preview production build
npm run build && npm run preview
```

### Logs & Debugging

#### Development Logs

In development, Django logs to the console at INFO level. Emails are printed to the console instead of being sent.

```bash
# View Django debug output
python manage.py runserver  # Logs appear in terminal

# Enable more verbose SQL logging (add to settings)
# LOGGING['loggers']['django.db.backends'] = {'level': 'DEBUG', 'handlers': ['console']}
```

#### Production Logs

Production logs are written to `/var/log/islalist/django.log`.

```bash
# Create log directory (first time setup)
sudo mkdir -p /var/log/islalist
sudo chown www-data:www-data /var/log/islalist

# View logs
sudo tail -f /var/log/islalist/django.log

# View last 100 lines
sudo tail -100 /var/log/islalist/django.log

# Search logs for errors
sudo grep -i error /var/log/islalist/django.log
```

#### Sentry Error Monitoring

Production errors are sent to Sentry when `SENTRY_DSN` is configured. View errors at [sentry.io](https://sentry.io).

### Common Development Workflows

#### Adding a New API Endpoint

1. Add model (if needed) in `backend/api/models.py`
2. Create migration: `python manage.py makemigrations`
3. Apply migration: `python manage.py migrate`
4. Add serializer in `backend/api/serializers.py`
5. Add view in `backend/api/views.py`
6. Add URL route in `backend/api/urls.py`
7. Write tests in `backend/api/tests/`
8. Run tests: `pytest`

#### Adding a New Frontend Component

1. Create component in `frontend/src/components/`
2. Write tests in same directory: `ComponentName.test.jsx`
3. Run tests: `npm test`
4. Import and use in pages

#### Running Full Test Suite Before Commit

```bash
# Backend
cd backend && source venv/bin/activate && pytest

# Frontend
cd frontend && npm run lint && npm test -- --run
```

### Environment-Specific Settings

| Setting | Development | Production |
|---------|-------------|------------|
| `DEBUG` | `True` | `False` |
| `EMAIL_BACKEND` | Console (prints to terminal) | SMTP |
| `DATABASE` | PostgreSQL | PostgreSQL |
| `CORS` | All origins allowed | Whitelist only |
| `LOGGING` | Console only | Console + File |
| `SENTRY` | Disabled | Enabled |

## Production Deployment

### Backend

1. Set environment variables:

```bash
export DJANGO_SETTINGS_MODULE=core.settings.prod
```

2. Configure `/etc/islalist/config.json` with your SECRET key:

```json
{
  "SECRET": "your-production-secret-key"
}
```

3. Run with Gunicorn:

```bash
gunicorn --bind 0.0.0.0:8000 core.wsgi:application
```

See `backend/README.md` for systemd service configuration.

### Frontend

```bash
cd frontend

# Build for production
VITE_API_URL=https://api.yourdomain.com npm run build

# Output in dist/ folder
```

Deploy the `dist/` folder to any static hosting (Nginx, Netlify, Vercel, etc.).

## Environment Variables

### Backend (.env)

| Variable | Description | Default |
|----------|-------------|---------|
| `SECRET_KEY` | Django secret key | (required) |
| `DEBUG` | Debug mode | `False` |
| `ALLOWED_HOSTS` | Comma-separated hosts | `localhost` |
| `DB_NAME` | PostgreSQL database | `islalist_db` |
| `DB_USER` | PostgreSQL user | `islalist_user` |
| `DB_PASSWORD` | PostgreSQL password | (required) |
| `DB_HOST` | PostgreSQL host | `localhost` |
| `DB_PORT` | PostgreSQL port | `5432` |
| `CORS_ALLOWED_ORIGINS` | Allowed CORS origins | - |
| `EMAIL_HOST_USER` | SMTP username | - |
| `EMAIL_HOST_PASSWORD` | SMTP password | - |
| `SENTRY_DSN` | Sentry project DSN | - |

### Frontend (.env)

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API URL | `http://localhost:8000` |

## Detailed Documentation

- **Backend**: See `backend/README.md` for detailed API documentation, systemd setup, and cron configuration
- **Frontend**: See `frontend/README.md` for PWA configuration, project structure, and deployment options

## Future Features

- Messaging between users
- User reviews/ratings
- Payment processing
- Full-text search
- Admin moderation tools
- Docker/containerization
- CI/CD pipeline

## License

[Add your license here]
