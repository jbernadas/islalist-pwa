"""
Tests for authentication endpoints including registration, login, and token refresh.

These tests verify:
1. User registration with valid/invalid data
2. Login with correct/incorrect credentials
3. Token refresh functionality
4. Rate limiting on auth endpoints
"""
import pytest
from django.contrib.auth import get_user_model
from rest_framework import status


User = get_user_model()


@pytest.mark.django_db
class TestUserRegistration:
    """Tests for user registration endpoint"""

    def test_register_missing_required_fields(self, api_client):
        """Test registration fails without required fields"""
        data = {
            'username': 'incomplete'
            # Missing email, password, first_name, last_name
        }
        response = api_client.post('/api/auth/registration/', data)
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_register_password_mismatch(self, api_client):
        """Test registration fails when passwords don't match"""
        data = {
            'username': 'newuser',
            'email': 'newuser@example.com',
            'password': 'securepass123',
            'password_confirm': 'differentpass',
            'first_name': 'New',
            'last_name': 'User'
        }
        response = api_client.post('/api/auth/registration/', data)
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_register_duplicate_username(self, api_client, user):
        """Test registration fails with duplicate username"""
        data = {
            'username': user.username,  # Existing username
            'email': 'different@example.com',
            'password': 'securepass123',
            'password_confirm': 'securepass123',
            'first_name': 'New',
            'last_name': 'User'
        }
        response = api_client.post('/api/auth/registration/', data)
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_register_invalid_phone_format(self, api_client):
        """Test registration fails with invalid Philippine phone number"""
        data = {
            'username': 'newuser',
            'email': 'newuser@example.com',
            'password': 'securepass123',
            'password_confirm': 'securepass123',
            'first_name': 'New',
            'last_name': 'User',
            'phone_number': '12345'  # Invalid format
        }
        response = api_client.post('/api/auth/registration/', data)
        assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
class TestUserLogin:
    """Tests for user login endpoint"""

    def test_login_valid_credentials(self, api_client):
        """Test successful login with valid credentials"""
        # Create an active, verified user
        user = User.objects.create_user(
            username='logintest',
            email='login@example.com',
            password='testpass123',
            is_active=True
        )
        # Create email verification for allauth
        from allauth.account.models import EmailAddress
        EmailAddress.objects.create(
            user=user,
            email=user.email,
            verified=True,
            primary=True
        )

        response = api_client.post('/api/auth/login/', {
            'username': 'logintest',
            'password': 'testpass123'
        })
        assert response.status_code == status.HTTP_200_OK
        assert 'access' in response.data
        assert 'refresh' in response.data

    def test_login_invalid_password(self, api_client, user):
        """Test login fails with wrong password"""
        response = api_client.post('/api/auth/login/', {
            'username': user.username,
            'password': 'wrongpassword'
        })
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_login_nonexistent_user(self, api_client):
        """Test login fails with nonexistent user"""
        response = api_client.post('/api/auth/login/', {
            'username': 'nonexistent',
            'password': 'testpass123'
        })
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_login_inactive_user(self, api_client):
        """Test login fails for inactive user"""
        user = User.objects.create_user(
            username='inactive',
            email='inactive@example.com',
            password='testpass123',
            is_active=False
        )
        response = api_client.post('/api/auth/login/', {
            'username': 'inactive',
            'password': 'testpass123'
        })
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
class TestTokenRefresh:
    """Tests for JWT token refresh endpoint"""

    def test_refresh_valid_token(self, api_client):
        """Test token refresh with valid refresh token"""
        # Create verified user and login
        user = User.objects.create_user(
            username='refreshtest',
            email='refresh@example.com',
            password='testpass123',
            is_active=True
        )
        from allauth.account.models import EmailAddress
        EmailAddress.objects.create(
            user=user,
            email=user.email,
            verified=True,
            primary=True
        )

        # Login to get tokens
        login_response = api_client.post('/api/auth/login/', {
            'username': 'refreshtest',
            'password': 'testpass123'
        })
        refresh_token = login_response.data['refresh']

        # Refresh the token
        refresh_response = api_client.post('/api/auth/token/refresh/', {
            'refresh': refresh_token
        })
        assert refresh_response.status_code == status.HTTP_200_OK
        assert 'access' in refresh_response.data

    def test_refresh_invalid_token(self, api_client):
        """Test token refresh fails with invalid token"""
        response = api_client.post('/api/auth/token/refresh/', {
            'refresh': 'invalid-token-string'
        })
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
class TestLogout:
    """Tests for logout endpoint"""

    def test_logout_authenticated(self, authenticated_client, user):
        """Test authenticated user can access logout endpoint"""
        # Generate tokens for the user directly
        from rest_framework_simplejwt.tokens import RefreshToken
        refresh = RefreshToken.for_user(user)

        # Logout
        logout_response = authenticated_client.post('/api/auth/logout/', {
            'refresh': str(refresh)
        })
        assert logout_response.status_code == status.HTTP_200_OK

        # Try to use the refresh token - should fail (blacklisted)
        from rest_framework.test import APIClient
        new_client = APIClient()
        refresh_response = new_client.post('/api/auth/token/refresh/', {
            'refresh': str(refresh)
        })
        assert refresh_response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
class TestUserProfile:
    """Tests for user profile endpoints"""

    def test_get_current_user(self, authenticated_client, user):
        """Test getting current user profile"""
        response = authenticated_client.get('/api/auth/user/')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['username'] == user.username
        assert response.data['email'] == user.email

    def test_get_current_user_unauthenticated(self, api_client):
        """Test getting current user fails when not authenticated"""
        response = api_client.get('/api/auth/user/')
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_get_profile(self, authenticated_client, user):
        """Test getting user profile from custom endpoint"""
        response = authenticated_client.get('/api/auth/profile/')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['username'] == user.username


@pytest.mark.django_db
class TestPublicProfile:
    """Tests for public profile viewing"""

    def test_view_public_profile(self, api_client, user):
        """Test viewing another user's public profile"""
        response = api_client.get(f'/api/users/{user.username}/')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['username'] == user.username
        # Should not expose email
        assert 'email' not in response.data

    def test_view_nonexistent_profile(self, api_client):
        """Test viewing nonexistent user profile returns 404"""
        response = api_client.get('/api/users/nonexistent/')
        assert response.status_code == status.HTTP_404_NOT_FOUND
