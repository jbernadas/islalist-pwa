"""
Regression tests for listing filtering by province/municipality

This test suite specifically addresses the bug where provinces with lowercase
particles like "del", "de", or "of" (e.g., "Davao del Norte", "Davao de Oro")
were not showing listings when filtering by "All Cities/Municipalities".

The bug occurred because:
1. Frontend was title-casing province slugs: "davao-del-norte" → "Davao Del Norte"
2. Backend was using case-sensitive exact matching on the `island` field
3. Database had: "Davao del Norte" (lowercase "del")
4. No match: "Davao Del Norte" ≠ "Davao del Norte"

The fix:
1. Frontend now uses actual province names from API data
2. Backend now uses case-insensitive matching (island__iexact)
"""
import pytest
from api.models import Listing


@pytest.mark.django_db
class TestListingProvinceFiltering:
    """Test listing filtering by province with proper case handling"""

    def test_filter_by_province_with_lowercase_del(
        self, api_client, user, province_davao_del_norte, category_real_estate
    ):
        """
        Regression test: Provinces with lowercase 'del' should work

        This tests the specific bug where "Davao del Norte" listings
        were not showing when filtering by province.
        """
        # Create a listing in Davao del Norte
        listing = Listing.objects.create(
            title='Beautiful House in Tagum',
            description='A nice house',
            price=5000000,
            location='City of Tagum',
            island='Davao del Norte',  # Lowercase "del" (correct)
            barangay='Poblacion',
            category=category_real_estate,
            seller=user,
            status='active'
        )

        # Test 1: Filter with correct case (lowercase "del")
        response = api_client.get('/api/listings/', {'island': 'Davao del Norte'})
        assert response.status_code == 200
        results = response.data.get('results', response.data)
        assert len(results) == 1
        assert results[0]['id'] == listing.id

        # Test 2: Filter with WRONG case (uppercase "Del") - should still work due to iexact
        response = api_client.get('/api/listings/', {'island': 'Davao Del Norte'})
        assert response.status_code == 200
        results = response.data.get('results', response.data)
        assert len(results) == 1, "Case-insensitive filtering should find the listing"
        assert results[0]['id'] == listing.id

    def test_filter_by_province_with_lowercase_de(
        self, api_client, user, province_davao_de_oro, category_real_estate
    ):
        """
        Test provinces with lowercase 'de' particle (e.g., Davao de Oro)
        """
        listing = Listing.objects.create(
            title='Gold Mining Property',
            description='Rich in minerals',
            price=10000000,
            location='Montevista',
            island='Davao de Oro',  # Lowercase "de" (correct)
            barangay='Centro',
            category=category_real_estate,
            seller=user,
            status='active'
        )

        # Should work with correct case
        response = api_client.get('/api/listings/', {'island': 'Davao de Oro'})
        assert response.status_code == 200
        results = response.data.get('results', response.data)
        assert len(results) == 1

        # Should work with wrong case
        response = api_client.get('/api/listings/', {'island': 'Davao De Oro'})
        assert response.status_code == 200
        results = response.data.get('results', response.data)
        assert len(results) == 1

    def test_filter_excludes_other_provinces(
        self, api_client, user, province_davao_del_norte,
        province_davao_de_oro, category_real_estate
    ):
        """
        Test that filtering by one province doesn't return listings from another
        """
        # Create listings in both provinces
        listing_norte = Listing.objects.create(
            title='House in Norte',
            description='Test',
            price=1000000,
            location='City of Tagum',
            island='Davao del Norte',
            category=category_real_estate,
            seller=user,
            status='active'
        )

        listing_oro = Listing.objects.create(
            title='House in Oro',
            description='Test',
            price=2000000,
            location='Montevista',
            island='Davao de Oro',
            category=category_real_estate,
            seller=user,
            status='active'
        )

        # Filter by Davao del Norte - should only get Norte listing
        response = api_client.get('/api/listings/', {'island': 'Davao del Norte'})
        results = response.data.get('results', response.data)
        assert len(results) == 1
        assert results[0]['id'] == listing_norte.id

        # Filter by Davao de Oro - should only get Oro listing
        response = api_client.get('/api/listings/', {'island': 'Davao de Oro'})
        results = response.data.get('results', response.data)
        assert len(results) == 1
        assert results[0]['id'] == listing_oro.id

    def test_filter_by_municipality_with_province(
        self, api_client, user, province_davao_del_norte,
        municipality_tagum, category_real_estate
    ):
        """
        Test filtering by specific municipality works correctly

        This was working before the bug fix, but we test it to ensure
        the fix didn't break municipality filtering.
        """
        listing = Listing.objects.create(
            title='House in Tagum City',
            description='Near market',
            price=3000000,
            location='City of Tagum',
            island='Davao del Norte',
            barangay='San Agustin',
            category=category_real_estate,
            seller=user,
            status='active'
        )

        # Filter by province AND municipality
        response = api_client.get('/api/listings/', {
            'island': 'Davao del Norte',
            'municipality': 'city-of-tagum',
            'province': 'davao-del-norte'
        })

        assert response.status_code == 200
        results = response.data.get('results', response.data)
        assert len(results) == 1
        assert results[0]['id'] == listing.id

    def test_no_listings_returns_empty_list(self, api_client, province_davao_del_norte):
        """
        Test that filtering a province with no listings returns empty list (not error)
        """
        response = api_client.get('/api/listings/', {'island': 'Davao del Norte'})
        assert response.status_code == 200
        results = response.data.get('results', response.data)
        assert len(results) == 0
        assert isinstance(results, list)

    @pytest.mark.parametrize('province_name,expected_case', [
        ('Davao del Norte', 'del'),
        ('Davao del Sur', 'del'),
        ('Davao de Oro', 'de'),
        ('Agusan del Norte', 'del'),
        ('Agusan del Sur', 'del'),
        ('Lanao del Norte', 'del'),
        ('Lanao del Sur', 'del'),
        ('Zamboanga del Norte', 'del'),
        ('Zamboanga del Sur', 'del'),
        ('Surigao del Norte', 'del'),
        ('Surigao del Sur', 'del'),
        ('Maguindanao del Norte', 'del'),
        ('Maguindanao del Sur', 'del'),
    ])
    def test_all_affected_provinces(
        self, api_client, user, category_real_estate, db, province_name, expected_case
    ):
        """
        Parametrized test for all 13 provinces affected by the bug

        This ensures the fix works for ALL provinces with lowercase particles,
        not just Davao del Norte.
        """
        from api.models import Province

        # Create province
        slug = province_name.lower().replace(' ', '-')
        province = Province.objects.create(
            name=province_name,
            slug=slug,
            featured=False
        )

        # Create listing
        listing = Listing.objects.create(
            title=f'Property in {province_name}',
            description='Test listing',
            price=1000000,
            location='Test Location',
            island=province_name,  # Use exact province name
            category=category_real_estate,
            seller=user,
            status='active'
        )

        # Test with correct case
        response = api_client.get('/api/listings/', {'island': province_name})
        results = response.data.get('results', response.data)
        assert len(results) == 1, f"Failed for {province_name} with correct case"

        # Test with wrong case (title-cased particle)
        wrong_case_name = province_name.replace(' del ', ' Del ').replace(' de ', ' De ')
        response = api_client.get('/api/listings/', {'island': wrong_case_name})
        results = response.data.get('results', response.data)
        assert len(results) == 1, f"Failed for {province_name} with wrong case: {wrong_case_name}"
