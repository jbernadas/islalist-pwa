"""
Tests for Listing CRUD operations.

These tests verify:
1. Creating listings (with authentication and email verification)
2. Reading listings (public)
3. Updating listings (owner only)
4. Deleting listings (owner only)
5. Favorites functionality
"""
import pytest
from rest_framework import status
from api.models import Listing, Favorite


@pytest.fixture
def verified_user(db):
    """Create a verified user (email confirmed)"""
    from django.contrib.auth import get_user_model
    from allauth.account.models import EmailAddress

    User = get_user_model()
    user = User.objects.create_user(
        username='verifieduser',
        email='verified@example.com',
        password='testpass123',
        is_active=True
    )
    EmailAddress.objects.create(
        user=user,
        email=user.email,
        verified=True,
        primary=True
    )
    return user


@pytest.fixture
def verified_client(api_client, verified_user):
    """API client authenticated as a verified user"""
    api_client.force_authenticate(user=verified_user)
    return api_client


@pytest.mark.django_db
class TestListingCreate:
    """Tests for creating listings"""

    def test_create_listing_verified_user(
        self, verified_client, verified_user, province_davao_del_norte,
        municipality_tagum, category_real_estate
    ):
        """Test verified user can create a listing"""
        data = {
            'title': 'Beautiful House for Sale',
            'description': 'A lovely 3-bedroom house',
            'price': 5000000,
            'province': province_davao_del_norte.id,
            'municipality': municipality_tagum.id,
            'category': category_real_estate.id,
            'condition': 'new'
        }
        response = verified_client.post('/api/listings/', data)
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['title'] == 'Beautiful House for Sale'
        assert response.data['seller']['id'] == verified_user.id

    def test_create_listing_unauthenticated(
        self, api_client, province_davao_del_norte, category_real_estate
    ):
        """Test unauthenticated user cannot create a listing"""
        data = {
            'title': 'Test Listing',
            'description': 'Test description',
            'price': 1000,
            'province': province_davao_del_norte.id,
            'category': category_real_estate.id
        }
        response = api_client.post('/api/listings/', data)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_create_listing_unverified_user(
        self, authenticated_client, province_davao_del_norte, category_real_estate
    ):
        """Test unverified user cannot create a listing (requires email verification)"""
        data = {
            'title': 'Test Listing',
            'description': 'Test description',
            'price': 1000,
            'province': province_davao_del_norte.id,
            'category': category_real_estate.id
        }
        response = authenticated_client.post('/api/listings/', data)
        # Should be forbidden for unverified users
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_create_listing_missing_required_fields(
        self, verified_client
    ):
        """Test creating listing fails without required fields"""
        data = {
            'title': 'Incomplete Listing'
            # Missing price, province, category
        }
        response = verified_client.post('/api/listings/', data)
        assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
class TestListingRead:
    """Tests for reading listings"""

    def test_list_listings_public(
        self, api_client, user, province_davao_del_norte, category_real_estate
    ):
        """Test anyone can list active listings"""
        Listing.objects.create(
            title='Public Listing',
            description='Visible to all',
            price=1000,
            province=province_davao_del_norte,
            category=category_real_estate,
            seller=user,
            status='active'
        )

        response = api_client.get('/api/listings/')
        assert response.status_code == status.HTTP_200_OK
        results = response.data.get('results', response.data)
        assert len(results) == 1
        assert results[0]['title'] == 'Public Listing'

    def test_get_listing_detail(
        self, api_client, user, province_davao_del_norte, category_real_estate
    ):
        """Test getting a single listing's details"""
        listing = Listing.objects.create(
            title='Detailed Listing',
            description='Full details',
            price=2000,
            province=province_davao_del_norte,
            category=category_real_estate,
            seller=user,
            status='active'
        )

        response = api_client.get(f'/api/listings/{listing.id}/')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['title'] == 'Detailed Listing'
        assert response.data['description'] == 'Full details'

    def test_get_nonexistent_listing(self, api_client):
        """Test getting nonexistent listing returns 404"""
        response = api_client.get('/api/listings/99999/')
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_inactive_listings_not_in_list(
        self, api_client, user, province_davao_del_norte, category_real_estate
    ):
        """Test inactive/sold listings don't appear in public list"""
        Listing.objects.create(
            title='Active Listing',
            description='Visible',
            price=1000,
            province=province_davao_del_norte,
            category=category_real_estate,
            seller=user,
            status='active'
        )
        Listing.objects.create(
            title='Sold Listing',
            description='Not visible',
            price=2000,
            province=province_davao_del_norte,
            category=category_real_estate,
            seller=user,
            status='sold'
        )

        response = api_client.get('/api/listings/')
        results = response.data.get('results', response.data)
        assert len(results) == 1
        assert results[0]['title'] == 'Active Listing'


@pytest.mark.django_db
class TestListingUpdate:
    """Tests for updating listings"""

    def test_update_own_listing(
        self, verified_client, verified_user, province_davao_del_norte, category_real_estate
    ):
        """Test verified owner can update their listing"""
        listing = Listing.objects.create(
            title='Original Title',
            description='Original description',
            price=1000,
            province=province_davao_del_norte,
            category=category_real_estate,
            seller=verified_user,
            status='active'
        )

        response = verified_client.patch(f'/api/listings/{listing.id}/', {
            'title': 'Updated Title',
            'price': 1500
        })
        assert response.status_code == status.HTTP_200_OK
        assert response.data['title'] == 'Updated Title'
        assert response.data['price'] == '1500.00'

    def test_update_other_user_listing(
        self, verified_client, province_davao_del_norte, category_real_estate
    ):
        """Test user cannot update another user's listing"""
        from django.contrib.auth import get_user_model
        User = get_user_model()

        other_user = User.objects.create_user(
            username='otheruser',
            email='other@example.com',
            password='testpass123'
        )
        listing = Listing.objects.create(
            title='Other User Listing',
            description='Not yours',
            price=1000,
            province=province_davao_del_norte,
            category=category_real_estate,
            seller=other_user,
            status='active'
        )

        response = verified_client.patch(f'/api/listings/{listing.id}/', {
            'title': 'Trying to update'
        })
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_update_listing_unauthenticated(
        self, api_client, user, province_davao_del_norte, category_real_estate
    ):
        """Test unauthenticated user cannot update listing"""
        listing = Listing.objects.create(
            title='Listing',
            description='Test',
            price=1000,
            province=province_davao_del_norte,
            category=category_real_estate,
            seller=user,
            status='active'
        )

        response = api_client.patch(f'/api/listings/{listing.id}/', {
            'title': 'Updated'
        })
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
class TestListingDelete:
    """Tests for deleting listings"""

    def test_delete_own_listing(
        self, verified_client, verified_user, province_davao_del_norte, category_real_estate
    ):
        """Test verified owner can delete their listing"""
        listing = Listing.objects.create(
            title='To Be Deleted',
            description='Will be removed',
            price=1000,
            province=province_davao_del_norte,
            category=category_real_estate,
            seller=verified_user,
            status='active'
        )

        response = verified_client.delete(f'/api/listings/{listing.id}/')
        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert not Listing.objects.filter(id=listing.id).exists()

    def test_delete_other_user_listing(
        self, verified_client, province_davao_del_norte, category_real_estate
    ):
        """Test user cannot delete another user's listing"""
        from django.contrib.auth import get_user_model
        User = get_user_model()

        other_user = User.objects.create_user(
            username='otheruser2',
            email='other2@example.com',
            password='testpass123'
        )
        listing = Listing.objects.create(
            title='Not Yours',
            description='Cannot delete',
            price=1000,
            province=province_davao_del_norte,
            category=category_real_estate,
            seller=other_user,
            status='active'
        )

        response = verified_client.delete(f'/api/listings/{listing.id}/')
        assert response.status_code == status.HTTP_403_FORBIDDEN
        assert Listing.objects.filter(id=listing.id).exists()


@pytest.mark.django_db
class TestFavorites:
    """Tests for listing favorites functionality"""

    def test_add_to_favorites(
        self, authenticated_client, user, province_davao_del_norte, category_real_estate
    ):
        """Test authenticated user can add listing to favorites"""
        listing = Listing.objects.create(
            title='Favorite This',
            description='Add me',
            price=1000,
            province=province_davao_del_norte,
            category=category_real_estate,
            seller=user,
            status='active'
        )

        response = authenticated_client.post(f'/api/listings/{listing.id}/toggle_favorite/')
        # 201 Created when adding to favorites
        assert response.status_code == status.HTTP_201_CREATED
        assert Favorite.objects.filter(user=user, listing=listing).exists()

    def test_remove_from_favorites(
        self, authenticated_client, user, province_davao_del_norte, category_real_estate
    ):
        """Test authenticated user can remove listing from favorites"""
        listing = Listing.objects.create(
            title='Unfavorite This',
            description='Remove me',
            price=1000,
            province=province_davao_del_norte,
            category=category_real_estate,
            seller=user,
            status='active'
        )
        Favorite.objects.create(user=user, listing=listing)

        # Toggle removes the favorite
        response = authenticated_client.post(f'/api/listings/{listing.id}/toggle_favorite/')
        assert response.status_code == status.HTTP_200_OK
        assert not Favorite.objects.filter(user=user, listing=listing).exists()

    def test_list_favorites(
        self, authenticated_client, user, province_davao_del_norte, category_real_estate
    ):
        """Test user can list their favorites"""
        listing = Listing.objects.create(
            title='My Favorite',
            description='In my list',
            price=1000,
            province=province_davao_del_norte,
            category=category_real_estate,
            seller=user,
            status='active'
        )
        Favorite.objects.create(user=user, listing=listing)

        response = authenticated_client.get('/api/listings/favorites/')
        assert response.status_code == status.HTTP_200_OK
        # Could be a list or have results depending on pagination
        results = response.data if isinstance(response.data, list) else response.data.get('results', response.data)
        assert len(results) == 1

    def test_favorites_unauthenticated(self, api_client):
        """Test unauthenticated user cannot access favorites"""
        response = api_client.get('/api/listings/favorites/')
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
class TestListingSearch:
    """Tests for listing search functionality"""

    def test_search_by_title(
        self, api_client, user, province_davao_del_norte, category_real_estate
    ):
        """Test searching listings by title"""
        Listing.objects.create(
            title='Beautiful House',
            description='Nice property',
            price=1000,
            province=province_davao_del_norte,
            category=category_real_estate,
            seller=user,
            status='active'
        )
        Listing.objects.create(
            title='Car for Sale',
            description='Great vehicle',
            price=500,
            province=province_davao_del_norte,
            category=category_real_estate,
            seller=user,
            status='active'
        )

        response = api_client.get('/api/listings/', {'search': 'house'})
        results = response.data.get('results', response.data)
        assert len(results) == 1
        assert 'House' in results[0]['title']

    def test_filter_by_price_range(
        self, api_client, user, province_davao_del_norte, category_real_estate
    ):
        """Test filtering listings by price range"""
        Listing.objects.create(
            title='Cheap Item',
            description='Affordable',
            price=100,
            province=province_davao_del_norte,
            category=category_real_estate,
            seller=user,
            status='active'
        )
        Listing.objects.create(
            title='Expensive Item',
            description='Premium',
            price=10000,
            province=province_davao_del_norte,
            category=category_real_estate,
            seller=user,
            status='active'
        )

        response = api_client.get('/api/listings/', {'min_price': 1000})
        results = response.data.get('results', response.data)
        assert len(results) == 1
        assert results[0]['title'] == 'Expensive Item'

    def test_filter_by_category(
        self, api_client, user, province_davao_del_norte, category_real_estate
    ):
        """Test filtering listings by category"""
        from api.models import Category

        vehicles_category = Category.objects.create(
            name='Vehicles',
            slug='vehicles',
            icon='🚗'
        )

        Listing.objects.create(
            title='House',
            description='Property',
            price=1000,
            province=province_davao_del_norte,
            category=category_real_estate,
            seller=user,
            status='active'
        )
        Listing.objects.create(
            title='Car',
            description='Vehicle',
            price=500,
            province=province_davao_del_norte,
            category=vehicles_category,
            seller=user,
            status='active'
        )

        response = api_client.get('/api/listings/', {'category': category_real_estate.id})
        results = response.data.get('results', response.data)
        assert len(results) == 1
        assert results[0]['title'] == 'House'
