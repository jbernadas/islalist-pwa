# IslaList

## Todos

FULLY WORKING FEATURES ✓

- User auth (JWT, email verification, password reset)
- Listings CRUD with multi-image upload (WebP optimization)
- Location filtering (PSGC codes for Province → Municipality → Barangay)
- Announcements with province/municipality-wide visibility
- Profile pictures with size variants
- Favorites/bookmarks
- Categories with parent-child
- Real estate & vehicle-specific fields
- PWA with offline caching

---
NOT IMPLEMENTED (Future Features)

- Messaging between users
- User reviews/ratings
- Payment processing
- Full-text search
- Admin moderation tools
- Analytics/SEO (sitemap, meta tags)
- Docker/containerization
- CI/CD pipeline

---
RECOMMENDED PRIORITY ORDER

Week 1 - Critical Security:
1. Rotate exposed credentials, remove .env from git history
2. Add API rate limiting (DRF throttling)
3. Replace broad exceptions with specific ones + logging
4. Clean console statements from frontend

Week 2 - Stability:
1. Add test coverage for auth and listing endpoints
2. Add input validation in serializers
3. Set up proper error logging/monitoring
4. Add API documentation (Swagger)
