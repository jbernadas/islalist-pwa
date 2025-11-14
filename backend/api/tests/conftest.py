"""
Pytest configuration and shared fixtures
"""
import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from api.models import Province, Municipality, Category

User = get_user_model()


@pytest.fixture
def api_client():
    """API client for making requests"""
    return APIClient()


@pytest.fixture
def user(db):
    """Create a test user"""
    return User.objects.create_user(
        username='testuser',
        email='test@example.com',
        password='testpass123'
    )


@pytest.fixture
def authenticated_client(api_client, user):
    """API client with authenticated user"""
    api_client.force_authenticate(user=user)
    return api_client


@pytest.fixture
def province_davao_del_norte(db):
    """Create Davao del Norte province"""
    return Province.objects.create(
        name='Davao del Norte',
        slug='davao-del-norte',
        featured=False
    )


@pytest.fixture
def province_davao_de_oro(db):
    """Create Davao de Oro province"""
    return Province.objects.create(
        name='Davao de Oro',
        slug='davao-de-oro',
        featured=False
    )


@pytest.fixture
def municipality_tagum(db, province_davao_del_norte):
    """Create City of Tagum municipality"""
    return Municipality.objects.create(
        name='City of Tagum',
        slug='city-of-tagum',
        province=province_davao_del_norte,
        active=True
    )


@pytest.fixture
def category_real_estate(db):
    """Create Real Estate category"""
    return Category.objects.create(
        name='Real Estate',
        slug='real-estate',
        icon='🏠'
    )
