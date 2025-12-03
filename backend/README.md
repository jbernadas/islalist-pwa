# IslaList Backend

Deep-dive documentation for the Django REST API backend. For quick start and common developer commands, see the [main README](../README.md).

## Settings Configuration

The project uses a split settings configuration:

| File | Purpose |
|------|---------|
| `core/settings/base.py` | Shared settings across all environments |
| `core/settings/dev.py` | Development (DEBUG=True, console emails) |
| `core/settings/prod.py` | Production (security hardening, file logging) |
| `core/settings/test.py` | Testing (SQLite in-memory, fast password hashing) |

### Configuration Priority

The application reads configuration from two sources:

1. **`/etc/islalist/config.json`** - System-wide configuration (highest priority)
   - Contains the `SECRET` key for production
   - Used for sensitive production settings

2. **`.env`** - Environment variables (fallback)
   - Used for development and environment-specific settings

### Production System Config

```bash
sudo mkdir -p /etc/islalist
sudo cp config.json.template /etc/islalist/config.json
sudo chmod 600 /etc/islalist/config.json
```

## API Endpoint Reference

Interactive API documentation is available at `/api/docs/` (Swagger) when the server is running. Below are curl examples for manual testing.

### Authentication Endpoints

**Register**
```bash
curl -X POST http://localhost:8000/api/auth/register/ \
  -H "Content-Type: application/json" \
  -d '{
    "username": "test@example.com",
    "email": "test@example.com",
    "password": "testpass123",
    "password_confirm": "testpass123",
    "first_name": "Test",
    "last_name": "User"
  }'
```

**Login**
```bash
curl -X POST http://localhost:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"username": "test@example.com", "password": "testpass123"}'
```

**Get Profile** (authenticated)
```bash
curl -X GET http://localhost:8000/api/auth/profile/ \
  -H "Authorization: Bearer ACCESS_TOKEN"
```

**Refresh Token**
```bash
curl -X POST http://localhost:8000/api/auth/refresh/ \
  -H "Content-Type: application/json" \
  -d '{"refresh": "REFRESH_TOKEN"}'
```

**Logout**
```bash
curl -X POST http://localhost:8000/api/auth/logout/ \
  -H "Authorization: Bearer ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"refresh": "REFRESH_TOKEN"}'
```

## Systemd Service Configuration

### Main Application Service

Create `/etc/systemd/system/islalist.service`:

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

```bash
sudo systemctl enable islalist
sudo systemctl start islalist
sudo systemctl status islalist
```

### Scheduled Tasks with Systemd Timers

For unpublishing expired announcements daily:

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

```bash
sudo systemctl enable islalist-unpublish.timer
sudo systemctl start islalist-unpublish.timer
sudo systemctl list-timers --all
```

### Alternative: Cron

```bash
# Edit crontab
crontab -e

# Run daily at 2:00 AM
0 2 * * * cd /path/to/islalist/backend && /path/to/venv/bin/python manage.py unpublish_expired_announcements >> /var/log/islalist/cron.log 2>&1
```

## Architecture Notes

This is a headless REST API designed for multiple clients:
- Mobile applications (iOS, Android)
- Desktop applications
- Web frontend (React PWA)

**Key Features:**
- JWT authentication with token rotation
- Access tokens: 1 hour lifetime
- Refresh tokens: 7 days lifetime
- Token blacklisting on logout
- CORS enabled for cross-origin requests
- PostgreSQL database
- Media file upload with WebP optimization
