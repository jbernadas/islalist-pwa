"""
Regression tests for listing filtering by province slug format

This test suite addresses the race condition bug where the frontend sometimes
sends the province slug (e.g., "davao-del-norte") instead of the province name
(e.g., "Davao del Norte") when the provinces array hasn't loaded yet.

The fix:
- Backend now accepts BOTH slug format AND name format for the `island` parameter
- If the parameter contains hyphens, it's treated as a slug and looked up in Province model
- The actual province name is then used for filtering
- This makes the API more forgiving and prevents race conditions from causing empty results
"""
import pytest
from api.models import Listing, Province


@pytest.mark.django_db
class TestListingProvinceSlugFiltering:
    """Test listing filtering accepts both province slugs and names"""

    def test_filter_by_province_slug(
        self, api_client, user, province_davao_del_norte, category_real_estate
    ):
        """
        Test filtering by province SLUG format (e.g., "davao-del-norte")

        This is what the frontend sends during the race condition when
        provinces array hasn't loaded yet.
        """
        listing = Listing.objects.create(
            title='House in Davao del Norte',
            description='A nice property',
            price=2000000,
            location='City of Tagum',
            island='Davao del Norte',  # Stored as name
            category=category_real_estate,
            seller=user,
            status='active'
        )

        # Filter by SLUG format (what frontend sends during race condition)
        response = api_client.get('/api/listings/', {'island': 'davao-del-norte'})

        assert response.status_code == 200
        results = response.data.get('results', response.data)
        assert len(results) == 1
        assert results[0]['id'] == listing.id

    def test_filter_by_province_name(
        self, api_client, user, province_davao_del_norte, category_real_estate
    ):
        """
        Test filtering by province NAME format (e.g., "Davao del Norte")

        This is what the frontend sends after provinces have loaded.
        """
        listing = Listing.objects.create(
            title='House in Davao del Norte',
            description='A nice property',
            price=2000000,
            location='City of Tagum',
            island='Davao del Norte',
            category=category_real_estate,
            seller=user,
            status='active'
        )

        # Filter by NAME format (what frontend sends after provinces load)
        response = api_client.get('/api/listings/', {'island': 'Davao del Norte'})

        assert response.status_code == 200
        results = response.data.get('results', response.data)
        assert len(results) == 1
        assert results[0]['id'] == listing.id

    def test_filter_by_slug_case_insensitive(
        self, api_client, user, province_davao_del_norte, category_real_estate
    ):
        """
        Test that slug matching is case-insensitive
        """
        listing = Listing.objects.create(
            title='Property in Norte',
            description='Test',
            price=1000000,
            location='Asuncion',
            island='Davao del Norte',
            category=category_real_estate,
            seller=user,
            status='active'
        )

        # Try various case combinations of the slug
        test_cases = [
            'davao-del-norte',
            'Davao-Del-Norte',
            'DAVAO-DEL-NORTE',
            'DaVaO-dEl-NoRtE',
        ]

        for slug_variant in test_cases:
            response = api_client.get('/api/listings/', {'island': slug_variant})
            results = response.data.get('results', response.data)
            assert len(results) == 1, f"Failed for slug variant: {slug_variant}"
            assert results[0]['id'] == listing.id

    def test_filter_by_name_case_insensitive(
        self, api_client, user, province_davao_del_norte, category_real_estate
    ):
        """
        Test that name matching is case-insensitive
        """
        listing = Listing.objects.create(
            title='Property in Norte',
            description='Test',
            price=1000000,
            location='Carmen',
            island='Davao del Norte',
            category=category_real_estate,
            seller=user,
            status='active'
        )

        # Try various case combinations of the name
        test_cases = [
            'Davao del Norte',
            'davao del norte',
            'DAVAO DEL NORTE',
            'DaVaO dEl NoRtE',
        ]

        for name_variant in test_cases:
            response = api_client.get('/api/listings/', {'island': name_variant})
            results = response.data.get('results', response.data)
            assert len(results) == 1, f"Failed for name variant: {name_variant}"
            assert results[0]['id'] == listing.id

    def test_filter_invalid_slug_returns_empty(
        self, api_client, province_davao_del_norte
    ):
        """
        Test that an invalid/non-existent slug returns empty results (not error)
        """
        response = api_client.get('/api/listings/', {'island': 'non-existent-province'})

        assert response.status_code == 200
        results = response.data.get('results', response.data)
        assert len(results) == 0
        assert isinstance(results, list)

    def test_filter_invalid_name_returns_empty(
        self, api_client, province_davao_del_norte
    ):
        """
        Test that an invalid/non-existent name returns empty results (not error)
        """
        response = api_client.get('/api/listings/', {'island': 'Non Existent Province'})

        assert response.status_code == 200
        results = response.data.get('results', response.data)
        assert len(results) == 0
        assert isinstance(results, list)

    def test_slug_and_name_return_same_results(
        self, api_client, user, province_davao_del_norte, category_real_estate
    ):
        """
        Test that filtering by slug and name return identical results

        This ensures consistency regardless of which format is used.
        """
        # Create multiple listings
        listings = [
            Listing.objects.create(
                title=f'Property {i}',
                description='Test',
                price=1000000 + (i * 100000),
                location='City of Tagum',
                island='Davao del Norte',
                category=category_real_estate,
                seller=user,
                status='active'
            )
            for i in range(3)
        ]

        # Filter by slug
        response_slug = api_client.get('/api/listings/', {'island': 'davao-del-norte'})
        results_slug = response_slug.data.get('results', response_slug.data)

        # Filter by name
        response_name = api_client.get('/api/listings/', {'island': 'Davao del Norte'})
        results_name = response_name.data.get('results', response_name.data)

        # Should have same number of results
        assert len(results_slug) == len(results_name) == 3

        # Should have same listing IDs (order might differ, so compare sets)
        ids_slug = {r['id'] for r in results_slug}
        ids_name = {r['id'] for r in results_name}
        assert ids_slug == ids_name

    def test_filter_with_hyphenated_province_name(
        self, api_client, user, category_real_estate, db
    ):
        """
        Test that province names containing hyphens still work

        Edge case: What if a province name itself contains hyphens?
        The slug detection (checking for '-') should still work correctly.
        """
        # Create a hypothetical province with hyphens in the name
        province = Province.objects.create(
            name='Test-Province',  # Name with hyphen
            slug='test-province',
            featured=False
        )

        listing = Listing.objects.create(
            title='Property in Test Province',
            description='Test',
            price=1000000,
            location='Test City',
            island='Test-Province',  # Stored with hyphen
            category=category_real_estate,
            seller=user,
            status='active'
        )

        # Filter by slug should work
        response = api_client.get('/api/listings/', {'island': 'test-province'})
        results = response.data.get('results', response.data)
        assert len(results) == 1

        # Filter by name should also work
        response = api_client.get('/api/listings/', {'island': 'Test-Province'})
        results = response.data.get('results', response.data)
        assert len(results) == 1

    @pytest.mark.parametrize('province_slug,province_name', [
        ('davao-del-sur', 'Davao del Sur'),
        ('davao-de-oro', 'Davao de Oro'),
        ('agusan-del-norte', 'Agusan del Norte'),
        ('lanao-del-sur', 'Lanao del Sur'),
        ('zamboanga-del-norte', 'Zamboanga del Norte'),
    ])
    def test_slug_acceptance_for_multiple_provinces(
        self, api_client, user, category_real_estate, db, province_slug, province_name
    ):
        """
        Parametrized test for multiple provinces with lowercase particles

        Ensures slug acceptance works for all affected provinces.
        """
        from api.models import Province

        # Create province
        province = Province.objects.create(
            name=province_name,
            slug=province_slug,
            featured=False
        )

        listing = Listing.objects.create(
            title=f'Property in {province_name}',
            description='Test',
            price=1000000,
            location='Test City',
            island=province_name,
            category=category_real_estate,
            seller=user,
            status='active'
        )

        # Test both slug and name formats
        response_slug = api_client.get('/api/listings/', {'island': province_slug})
        response_name = api_client.get('/api/listings/', {'island': province_name})

        results_slug = response_slug.data.get('results', response_slug.data)
        results_name = response_name.data.get('results', response_name.data)

        assert len(results_slug) == 1, f"Slug format failed for {province_slug}"
        assert len(results_name) == 1, f"Name format failed for {province_name}"
        assert results_slug[0]['id'] == listing.id
        assert results_name[0]['id'] == listing.id
