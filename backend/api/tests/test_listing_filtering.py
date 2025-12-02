"""
Tests for listing filtering by province and municipality using PSGC codes

The application uses ForeignKey relations and PSGC (Philippine Standard Geographic Code)
for location filtering. Filtering is done via PSGC codes, not slugs or names.

Key features to test:
1. Filtering by province PSGC code
2. Filtering by province + municipality PSGC codes
3. Filtering by province + municipality + barangay PSGC codes
4. Province-wide listings visibility
5. Municipality-wide listings visibility
"""
import pytest
from api.models import Listing


@pytest.mark.django_db
class TestListingProvinceFiltering:
    """Test listing filtering by province using PSGC codes"""

    def test_filter_by_province(
        self, api_client, user, province_davao_del_norte, category_real_estate
    ):
        """Test filtering listings by province PSGC code"""
        listing = Listing.objects.create(
            title='Beautiful House in Tagum',
            description='A nice house',
            price=5000000,
            province=province_davao_del_norte,
            category=category_real_estate,
            seller=user,
            status='active'
        )

        # Filter by province PSGC code
        response = api_client.get('/api/listings/', {'province': province_davao_del_norte.psgc_code})
        assert response.status_code == 200
        results = response.data.get('results', response.data)
        assert len(results) == 1
        assert results[0]['id'] == listing.id

    def test_filter_by_province_and_municipality(
        self, api_client, user, province_davao_del_norte, municipality_tagum, category_real_estate
    ):
        """Test filtering listings by province and municipality PSGC codes"""
        listing = Listing.objects.create(
            title='House in City of Tagum',
            description='Near market',
            price=3000000,
            province=province_davao_del_norte,
            municipality=municipality_tagum,
            category=category_real_estate,
            seller=user,
            status='active'
        )

        # Filter by both province and municipality PSGC codes
        response = api_client.get('/api/listings/', {
            'province': province_davao_del_norte.psgc_code,
            'municipality': municipality_tagum.psgc_code
        })

        assert response.status_code == 200
        results = response.data.get('results', response.data)
        assert len(results) == 1
        assert results[0]['id'] == listing.id

    def test_filter_excludes_other_provinces(
        self, api_client, user, province_davao_del_norte, province_davao_de_oro,
        municipality_tagum, municipality_montevista, category_real_estate
    ):
        """Test that filtering by one province doesn't return listings from another"""
        listing_norte = Listing.objects.create(
            title='House in Norte',
            description='Test',
            price=1000000,
            province=province_davao_del_norte,
            municipality=municipality_tagum,
            category=category_real_estate,
            seller=user,
            status='active'
        )

        listing_oro = Listing.objects.create(
            title='House in Oro',
            description='Test',
            price=2000000,
            province=province_davao_de_oro,
            municipality=municipality_montevista,
            category=category_real_estate,
            seller=user,
            status='active'
        )

        # Filter by Davao del Norte - should only get Norte listing
        response = api_client.get('/api/listings/', {'province': province_davao_del_norte.psgc_code})
        results = response.data.get('results', response.data)
        assert len(results) == 1
        assert results[0]['id'] == listing_norte.id

        # Filter by Davao de Oro - should only get Oro listing
        response = api_client.get('/api/listings/', {'province': province_davao_de_oro.psgc_code})
        results = response.data.get('results', response.data)
        assert len(results) == 1
        assert results[0]['id'] == listing_oro.id

    def test_no_listings_returns_empty_list(
        self, api_client, province_davao_del_norte
    ):
        """Test that filtering a province with no listings returns empty list (not error)"""
        response = api_client.get('/api/listings/', {'province': province_davao_del_norte.psgc_code})
        assert response.status_code == 200
        results = response.data.get('results', response.data)
        assert len(results) == 0
        assert isinstance(results, list)

    def test_invalid_psgc_code_returns_empty(self, api_client):
        """Test that an invalid PSGC code returns empty results (not error)"""
        response = api_client.get('/api/listings/', {'province': '999999999'})
        assert response.status_code == 200
        results = response.data.get('results', response.data)
        assert len(results) == 0
        assert isinstance(results, list)

    def test_province_wide_listing_visibility(
        self, api_client, user, province_davao_del_norte, municipality_tagum, category_real_estate
    ):
        """
        Test that province-wide listings (no municipality set) appear when filtering by municipality.

        A listing with only province set (no municipality) should appear when users
        filter by any municipality within that province.
        """
        from api.models import Municipality

        # Create another municipality in the same province
        municipality_asuncion = Municipality.objects.create(
            name='Asuncion',
            slug='asuncion',
            psgc_code='112302000',
            province=province_davao_del_norte,
            active=True
        )

        # Create a province-wide listing (no specific municipality)
        province_wide_listing = Listing.objects.create(
            title='Province-wide Service',
            description='Available throughout Davao del Norte',
            price=10000,
            province=province_davao_del_norte,
            municipality=None,  # No specific municipality
            category=category_real_estate,
            seller=user,
            status='active'
        )

        # Create a municipality-specific listing
        tagum_listing = Listing.objects.create(
            title='Tagum Property',
            description='Only in Tagum',
            price=5000000,
            province=province_davao_del_norte,
            municipality=municipality_tagum,
            category=category_real_estate,
            seller=user,
            status='active'
        )

        # Filter by Tagum municipality - should see BOTH
        response = api_client.get('/api/listings/', {
            'province': province_davao_del_norte.psgc_code,
            'municipality': municipality_tagum.psgc_code
        })
        results = response.data.get('results', response.data)
        assert len(results) == 2
        ids = {r['id'] for r in results}
        assert province_wide_listing.id in ids
        assert tagum_listing.id in ids

        # Filter by Asuncion municipality - should see only province-wide
        response = api_client.get('/api/listings/', {
            'province': province_davao_del_norte.psgc_code,
            'municipality': municipality_asuncion.psgc_code
        })
        results = response.data.get('results', response.data)
        assert len(results) == 1
        assert results[0]['id'] == province_wide_listing.id

    def test_filter_with_barangay(
        self, api_client, user, province_davao_del_norte, municipality_tagum,
        barangay_magugpo, category_real_estate
    ):
        """Test filtering by province, municipality, and barangay PSGC codes"""
        from api.models import Barangay

        # Create another barangay
        barangay_apokon = Barangay.objects.create(
            name='Apokon',
            slug='apokon',
            psgc_code='112314002',
            municipality=municipality_tagum,
            active=True
        )

        # Create listings at different levels
        barangay_listing = Listing.objects.create(
            title='Barangay Property',
            description='In Magugpo Poblacion',
            price=1000000,
            province=province_davao_del_norte,
            municipality=municipality_tagum,
            barangay=barangay_magugpo,
            category=category_real_estate,
            seller=user,
            status='active'
        )

        municipality_wide_listing = Listing.objects.create(
            title='Municipality-wide Service',
            description='Throughout City of Tagum',
            price=5000,
            province=province_davao_del_norte,
            municipality=municipality_tagum,
            barangay=None,  # Municipality-wide
            category=category_real_estate,
            seller=user,
            status='active'
        )

        # Filter by Magugpo barangay - should see barangay listing + municipality-wide
        response = api_client.get('/api/listings/', {
            'province': province_davao_del_norte.psgc_code,
            'municipality': municipality_tagum.psgc_code,
            'barangay': barangay_magugpo.psgc_code
        })
        results = response.data.get('results', response.data)
        assert len(results) == 2
        ids = {r['id'] for r in results}
        assert barangay_listing.id in ids
        assert municipality_wide_listing.id in ids

        # Filter by Apokon barangay - should see only municipality-wide
        response = api_client.get('/api/listings/', {
            'province': province_davao_del_norte.psgc_code,
            'municipality': municipality_tagum.psgc_code,
            'barangay': barangay_apokon.psgc_code
        })
        results = response.data.get('results', response.data)
        assert len(results) == 1
        assert results[0]['id'] == municipality_wide_listing.id
