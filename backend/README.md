# IslaList Backend

Headless REST API backend for the IslaList mobile and desktop applications, built with Django REST Framework.

## Setup

### 1. Create Virtual Environment

```bash
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

### 3. Configure Environment

Copy the example environment file and update with your settings:

```bash
cp .env.example .env
```

Edit `.env` and update the values as needed.

### 4. Create System Configuration

Create the system configuration file with sudo privileges:

```bash
sudo mkdir -p /etc/islalist
sudo cp config.json.template /etc/islalist/config.json
sudo chmod 600 /etc/islalist/config.json
```

**Important:** The `/etc/islalist/config.json` file contains the SECRET key used for production. Make sure to:
- Keep this file secure with proper permissions (600)
- Never commit this file to version control
- Generate a new SECRET key for production environments

### 5. Run Migrations

```bash
python manage.py migrate
```

### 6. Run Development Server

```bash
python manage.py runserver
```

The API server will run at `http://localhost:8000/`

## Settings

The project uses a split settings configuration:

- `core/settings/base.py` - Base settings shared across all environments
- `core/settings/dev.py` - Development-specific settings
- `core/settings/prod.py` - Production-specific settings

### Development

By default, `manage.py` uses `core.settings.dev`. The development settings use PostgreSQL database.

### Production

For production, set the `DJANGO_SETTINGS_MODULE` environment variable:

```bash
export DJANGO_SETTINGS_MODULE=core.settings.prod
```

Production settings use PostgreSQL and require the following environment variables:
- `DB_NAME`
- `DB_USER`
- `DB_PASSWORD`
- `DB_HOST`
- `DB_PORT`

## Configuration Priority

The application reads configuration from two sources:

1. **`/etc/islalist/config.json`** - System-wide configuration (highest priority)
   - Contains the `SECRET` key for production
   - Used for sensitive production settings

2. **`.env`** - Environment variables (fallback)
   - Used for development and environment-specific settings
   - Falls back to defaults if not set

## Running in Production

### Using Gunicorn

```bash
gunicorn --bind 0.0.0.0:8000 core.wsgi:application
```

### Using systemd

Create a systemd service file at `/etc/systemd/system/islalist.service`:

```ini
[Unit]
Description=IslaList Django Application
After=network.target

[Service]
Type=notify
User=www-data
Group=www-data
WorkingDirectory=/path/to/islalist/backend
Environment="DJANGO_SETTINGS_MODULE=core.settings.prod"
ExecStart=/path/to/venv/bin/gunicorn --bind 0.0.0.0:8000 core.wsgi:application

[Install]
WantedBy=multi-user.target
```

Enable and start the service:

```bash
sudo systemctl enable islalist
sudo systemctl start islalist
```

## API Documentation

This is a headless REST API using JWT (JSON Web Token) authentication with automatic token expiration and refresh.

### Authentication

The API uses JWT authentication. All requests (except registration and login) require an `Authorization` header:

```
Authorization: Bearer <your-access-token-here>
```

**Token Lifetimes:**
- Access Token: 1 hour
- Refresh Token: 7 days

**Token Flow:**
1. Login or register to get both access and refresh tokens
2. Use the access token for API requests
3. When the access token expires (1 hour), use the refresh token to get a new access token
4. Refresh tokens are rotated (old refresh token is invalidated, new one is provided)
5. Logout blacklists the refresh token to prevent reuse

### API Endpoints

#### Authentication Endpoints

**Register a new user**
```http
POST /api/auth/register/
Content-Type: application/json

{
  "username": "user@example.com",
  "email": "user@example.com",
  "password": "securepassword",
  "password_confirm": "securepassword",
  "first_name": "John",
  "last_name": "Doe"
}

Response: 201 Created
{
  "user": {
    "id": 1,
    "username": "user@example.com",
    "email": "user@example.com",
    "first_name": "John",
    "last_name": "Doe"
  },
  "tokens": {
    "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc...",
    "access": "eyJ0eXAiOiJKV1QiLCJhbGc..."
  }
}
```

**Login (Get JWT Tokens)**
```http
POST /api/auth/login/
Content-Type: application/json

{
  "username": "user@example.com",
  "password": "securepassword"
}

Response: 200 OK
{
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "access": "eyJ0eXAiOiJKV1QiLCJhbGc..."
}
```

**Refresh Access Token**
```http
POST /api/auth/refresh/
Content-Type: application/json

{
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc..."
}

Response: 200 OK
{
  "access": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc..."  // New refresh token (rotated)
}
```

**Verify Token**
```http
POST /api/auth/verify/
Content-Type: application/json

{
  "token": "eyJ0eXAiOiJKV1QiLCJhbGc..."
}

Response: 200 OK
{}
```

**Logout (Blacklist Refresh Token)**
```http
POST /api/auth/logout/
Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGc...
Content-Type: application/json

{
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc..."
}

Response: 200 OK
{
  "message": "Successfully logged out."
}
```

**Get User Profile**
```http
GET /api/auth/profile/
Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGc...

Response: 200 OK
{
  "id": 1,
  "username": "user@example.com",
  "email": "user@example.com",
  "first_name": "John",
  "last_name": "Doe"
}
```

### Testing the API

Using curl:

```bash
# Register a new user
curl -X POST http://localhost:8000/api/auth/register/ \
  -H "Content-Type: application/json" \
  -d '{"username":"test@example.com","email":"test@example.com","password":"testpass123","password_confirm":"testpass123","first_name":"Test","last_name":"User"}'

# Login (returns access and refresh tokens)
curl -X POST http://localhost:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"username":"test@example.com","password":"testpass123"}'

# Get profile (replace ACCESS_TOKEN with actual access token)
curl -X GET http://localhost:8000/api/auth/profile/ \
  -H "Authorization: Bearer ACCESS_TOKEN"

# Refresh access token (replace REFRESH_TOKEN with actual refresh token)
curl -X POST http://localhost:8000/api/auth/refresh/ \
  -H "Content-Type: application/json" \
  -d '{"refresh":"REFRESH_TOKEN"}'

# Verify token
curl -X POST http://localhost:8000/api/auth/verify/ \
  -H "Content-Type: application/json" \
  -d '{"token":"ACCESS_TOKEN"}'

# Logout (replace tokens with actual tokens)
curl -X POST http://localhost:8000/api/auth/logout/ \
  -H "Authorization: Bearer ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"refresh":"REFRESH_TOKEN"}'
```

## Management Commands

### Unpublish Expired Announcements

Automatically unpublish announcements that have passed their expiry date:

```bash
python manage.py unpublish_expired_announcements
```

**Options:**
- `--dry-run` - Preview which announcements would be unpublished without actually doing it

**Example with dry-run:**
```bash
python manage.py unpublish_expired_announcements --dry-run
```

### Scheduling with Cron

To automatically unpublish expired announcements daily, add this to your crontab:

```bash
# Edit crontab
crontab -e

# Add this line to run the command daily at 2:00 AM
0 2 * * * cd /path/to/islalist/backend && /path/to/venv/bin/python manage.py unpublish_expired_announcements >> /var/log/islalist/cron.log 2>&1
```

**For production with systemd timer (alternative to cron):**

Create `/etc/systemd/system/islalist-unpublish.service`:

```ini
[Unit]
Description=IslaList Unpublish Expired Announcements
After=network.target

[Service]
Type=oneshot
User=www-data
Group=www-data
WorkingDirectory=/path/to/islalist/backend
Environment="DJANGO_SETTINGS_MODULE=core.settings.prod"
ExecStart=/path/to/venv/bin/python manage.py unpublish_expired_announcements
```

Create `/etc/systemd/system/islalist-unpublish.timer`:

```ini
[Unit]
Description=Run IslaList Unpublish Daily
Requires=islalist-unpublish.service

[Timer]
OnCalendar=daily
Persistent=true

[Install]
WantedBy=timers.target
```

Enable and start the timer:

```bash
sudo systemctl enable islalist-unpublish.timer
sudo systemctl start islalist-unpublish.timer

# Check timer status
sudo systemctl list-timers --all
```

## Architecture

This is a headless REST API designed for:
- Mobile applications (iOS, Android)
- Desktop applications
- Web frontend applications

**Features:**
- JWT authentication with automatic token expiration
  - Access tokens expire after 1 hour
  - Refresh tokens expire after 7 days
  - Automatic token rotation on refresh
  - Token blacklisting for logout
- JSON-only responses
- CORS enabled for cross-origin requests
- PostgreSQL database
- Media file upload support

## License

[Add your license here]
