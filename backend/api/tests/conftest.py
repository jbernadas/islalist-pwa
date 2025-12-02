"""
Pytest configuration and shared fixtures

Note: The application uses PSGC (Philippine Standard Geographic Code) for location filtering.
All province, municipality, and barangay filtering is done via PSGC codes, not slugs or names.
"""
import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from api.models import Province, Municipality, Barangay, Category

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
    """Create Davao del Norte province with PSGC code"""
    return Province.objects.create(
        name='Davao del Norte',
        slug='davao-del-norte',
        psgc_code='112300000',  # Actual PSGC code for Davao del Norte
        featured=False
    )


@pytest.fixture
def province_davao_de_oro(db):
    """Create Davao de Oro province with PSGC code"""
    return Province.objects.create(
        name='Davao de Oro',
        slug='davao-de-oro',
        psgc_code='118200000',  # Actual PSGC code for Davao de Oro
        featured=False
    )


@pytest.fixture
def municipality_tagum(db, province_davao_del_norte):
    """Create City of Tagum municipality with PSGC code"""
    return Municipality.objects.create(
        name='City of Tagum',
        slug='city-of-tagum',
        psgc_code='112314000',  # Actual PSGC code for Tagum
        province=province_davao_del_norte,
        active=True
    )


@pytest.fixture
def municipality_montevista(db, province_davao_de_oro):
    """Create Montevista municipality with PSGC code"""
    return Municipality.objects.create(
        name='Montevista',
        slug='montevista',
        psgc_code='118205000',  # PSGC code for Montevista
        province=province_davao_de_oro,
        active=True
    )


@pytest.fixture
def barangay_magugpo(db, municipality_tagum):
    """Create a barangay in City of Tagum"""
    return Barangay.objects.create(
        name='Magugpo Poblacion',
        slug='magugpo-poblacion',
        psgc_code='112314001',
        municipality=municipality_tagum,
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
