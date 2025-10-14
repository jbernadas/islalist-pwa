# IslaList Marketplace Implementation Plan

## Overview
IslaList is a Craigslist-style marketplace for the Philippine Islands, starting with Siquijor. This document outlines the technical implementation plan for building marketplace features.

## Target Users
- **Sellers**: Individuals and small businesses selling items, services, or job postings
- **Buyers**: People looking for local items, services, or opportunities
- **Initial Market**: Siquijor Island, Philippines
- **Expansion**: Bohol, Cebu, and other Philippine islands

## Backend Models Needed

### 1. User Extensions
Extend Django's User model with:
```python
- phone_number (optional, for contact)
- location (island/municipality)
- profile_picture
- bio
- rating (calculated from reviews)
- verified (boolean for verified accounts)
- created_at
- last_active
```

### 2. Category Model
```python
- name (e.g., "Electronics", "Vehicles", "Real Estate")
- slug
- icon/image
- parent (for subcategories)
- active (boolean)
```

### 3. Listing Model
```python
- title
- description
- price (DecimalField, nullable for "Contact for price")
- category (ForeignKey to Category)
- seller (ForeignKey to User)
- location (island/municipality)
- condition (New, Like New, Good, Fair, For Parts)
- status (Active, Sold, Expired, Hidden)
- views_count
- created_at
- updated_at
- expires_at (auto-expire after 30-60 days)
- featured (boolean, for premium listings)
```

### 4. ListingImage Model
```python
- listing (ForeignKey to Listing)
- image (ImageField)
- order (for sorting multiple images)
- uploaded_at
```

### 5. Favorite/Watchlist Model
```python
- user (ForeignKey to User)
- listing (ForeignKey to Listing)
- created_at
```

### 6. Message Model (for buyer-seller communication)
```python
- conversation_id (UUID, group messages)
- listing (ForeignKey to Listing)
- sender (ForeignKey to User)
- receiver (ForeignKey to User)
- message (text)
- read (boolean)
- created_at
```

### 7. Review Model
```python
- reviewer (ForeignKey to User)
- reviewed_user (ForeignKey to User)
- listing (ForeignKey to Listing, optional)
- rating (1-5 stars)
- comment (text)
- created_at
```

### 8. Report Model (for flagging inappropriate content)
```python
- reporter (ForeignKey to User)
- listing (ForeignKey to Listing, nullable)
- reported_user (ForeignKey to User, nullable)
- reason (choices: Spam, Inappropriate, Scam, etc.)
- description
- status (Pending, Reviewed, Resolved)
- created_at
```

## API Endpoints Needed

### Listings
- `GET /api/listings/` - List all active listings (with filters)
- `POST /api/listings/` - Create new listing
- `GET /api/listings/{id}/` - Get listing details
- `PUT /api/listings/{id}/` - Update listing
- `DELETE /api/listings/{id}/` - Delete listing
- `POST /api/listings/{id}/mark-sold/` - Mark as sold
- `GET /api/listings/my-listings/` - Get user's own listings

### Categories
- `GET /api/categories/` - List all categories
- `GET /api/categories/{id}/listings/` - Get listings by category

### Favorites
- `POST /api/favorites/` - Add to favorites
- `DELETE /api/favorites/{id}/` - Remove from favorites
- `GET /api/favorites/` - Get user's favorites

### Messages
- `GET /api/messages/` - Get user's conversations
- `GET /api/messages/{conversation_id}/` - Get conversation messages
- `POST /api/messages/` - Send message
- `PUT /api/messages/{id}/mark-read/` - Mark message as read

### Reviews
- `POST /api/reviews/` - Submit review
- `GET /api/users/{id}/reviews/` - Get user's reviews

### Reports
- `POST /api/reports/` - Report content/user

### Search
- `GET /api/search/?q={query}&category={cat}&location={loc}&min_price={}&max_price={}` - Search listings

## Frontend Pages Needed

### Public Pages
1. **Home/Browse** - Grid of recent listings
2. **Listing Details** - Single listing view with images, description, seller info
3. **Search Results** - Filtered/searched listings
4. **Category Browse** - Listings by category

### User Pages (Authenticated)
5. **Create Listing** - Form to post new item
6. **My Listings** - Manage user's listings
7. **Edit Listing** - Update existing listing
8. **Messages/Inbox** - Chat with buyers/sellers
9. **Favorites** - Saved listings
10. **Profile** - User profile with ratings and reviews
11. **Settings** - Update user info, preferences

## Key Features by Priority

### MVP (Phase 1) - Core Marketplace
1. User authentication (✅ Already implemented)
2. Create/edit/delete listings
3. Browse listings with pagination
4. Category system
5. Image upload (up to 5 images per listing)
6. Search functionality
7. Basic filtering (category, location, price range)
8. Contact seller (show phone/email or basic messaging)

### Phase 2 - User Engagement
1. Direct messaging system
2. Favorites/watchlist
3. User profiles with transaction history
4. Review and rating system
5. Automatic listing expiration (30-60 days)

### Phase 3 - Enhanced Features
1. Advanced search with multiple filters
2. Map view for listings
3. Push notifications
4. Featured/promoted listings
5. Email notifications
6. Multi-island support

### Phase 4 - Community & Safety
1. User verification system
2. Report inappropriate content
3. Admin moderation tools
4. Community guidelines
5. Safety tips page

## Technical Considerations

### Image Storage
- Use Django's ImageField with cloud storage (AWS S3, Cloudinary, or DigitalOcean Spaces)
- Implement image compression/optimization
- Generate thumbnails for list views

### Search Implementation
- Start with Django's ORM filters (Q objects)
- Consider PostgreSQL full-text search
- Future: Elasticsearch for advanced search

### Caching Strategy
- Cache category list (rarely changes)
- Cache popular listings
- Use Redis for caching

### Security
- Rate limiting on listing creation (prevent spam)
- CAPTCHA on registration/posting
- Image content moderation (manual or automated)
- Verify phone numbers for verified accounts

### Performance
- Pagination for listing views (20 items per page)
- Lazy loading for images
- CDN for static assets and images
- Database indexing on commonly queried fields

### Offline Support (PWA)
- Cache listing images for offline viewing
- Queue messages to send when back online
- Background sync for posting listings

## Competitive Advantages over Facebook Marketplace

1. **Focused Experience**: No social media noise
2. **Offline Support**: Critical for island connectivity
3. **No Facebook Account Required**: Privacy-focused
4. **Better Search**: Dedicated search and filtering
5. **Local Focus**: Island-specific features
6. **Easy Installation**: PWA installs without app store
7. **Lower Barrier**: Easier for non-tech-savvy users

## Monetization Options (Future)

1. Featured listings (paid promotion)
2. Business accounts with enhanced features
3. Premium seller badges
4. Top placement in search results
5. Extended listing duration
6. Analytics for sellers

## Next Development Steps

1. ✅ Basic authentication system (Complete)
2. Create Django models for listings and categories
3. Build listing creation API endpoint
4. Implement image upload functionality
5. Create listing browse/search endpoints
6. Build frontend listing creation form
7. Build frontend browse/search interface
8. Implement basic messaging system
9. Add user profiles and reviews
10. Deploy MVP for beta testing in Siquijor

## Launch Strategy

1. **Beta Launch**: Invite 50-100 users in Siquijor for testing
2. **Feedback Loop**: Collect user feedback and iterate
3. **Official Launch**: Marketing campaign in Siquijor
4. **Expansion**: Add nearby islands based on demand
5. **Partnerships**: Collaborate with local businesses

## Success Metrics

- Number of active listings
- User registrations
- Daily active users
- Messages sent
- Listings marked as sold
- User retention rate
- App installs (PWA)
