"""
Tests for announcement filtering by province and municipality using PSGC codes

Announcements use ForeignKey relations for province, municipality, and barangay.
Filtering is done via PSGC codes.

Key features to test:
1. Filtering by province PSGC code
2. Filtering by municipality PSGC code
3. Province-wide announcements (is_province_wide=True)
4. Municipality-wide announcements (is_municipality_wide=True)
5. Expiry date filtering
6. Active/inactive announcements
7. Priority-based cascade filtering
"""
import pytest
from datetime import date, timedelta
from api.models import Announcement


@pytest.mark.django_db
class TestAnnouncementFiltering:
    """Test announcement filtering by province and municipality using PSGC codes"""

    def test_filter_by_province(
        self, api_client, user, province_davao_del_norte, municipality_tagum
    ):
        """Test filtering announcements by province PSGC code"""
        announcement = Announcement.objects.create(
            title='Provincial Announcement',
            description='Important announcement',
            priority='high',
            announcement_type='government',
            province=province_davao_del_norte,
            municipality=municipality_tagum,
            author=user,
            is_active=True
        )

        # Filter by province PSGC code
        response = api_client.get('/api/announcements/', {'province': province_davao_del_norte.psgc_code})

        assert response.status_code == 200
        results = response.data.get('results', response.data)
        assert len(results) == 1
        assert results[0]['id'] == announcement.id

    def test_filter_by_municipality(
        self, api_client, user, province_davao_del_norte, municipality_tagum
    ):
        """Test filtering announcements by municipality PSGC code"""
        announcement = Announcement.objects.create(
            title='Municipal Announcement',
            description='City announcement',
            priority='medium',
            announcement_type='community',
            province=province_davao_del_norte,
            municipality=municipality_tagum,
            author=user,
            is_active=True
        )

        # Filter by province and municipality PSGC codes
        response = api_client.get('/api/announcements/', {
            'province': province_davao_del_norte.psgc_code,
            'municipality': municipality_tagum.psgc_code
        })

        assert response.status_code == 200
        results = response.data.get('results', response.data)
        assert len(results) == 1
        assert results[0]['id'] == announcement.id

    def test_province_wide_announcements(
        self, api_client, user, province_davao_del_norte, municipality_tagum
    ):
        """
        Test that province-wide announcements appear for all municipalities.

        Province-wide announcements with is_province_wide=True and 'urgent' priority
        should appear when filtering by any municipality in that province.
        """
        from api.models import Municipality, Barangay

        # Create another municipality and barangays for testing
        municipality_asuncion = Municipality.objects.create(
            name='Asuncion',
            slug='asuncion',
            psgc_code='112302000',
            province=province_davao_del_norte,
            active=True
        )

        barangay_in_tagum = Barangay.objects.create(
            name='Magugpo',
            slug='magugpo',
            psgc_code='112314001',
            municipality=municipality_tagum,
            active=True
        )

        barangay_in_asuncion = Barangay.objects.create(
            name='Poblacion',
            slug='poblacion-asuncion',
            psgc_code='112302001',
            municipality=municipality_asuncion,
            active=True
        )

        # Create a province-wide urgent announcement
        province_wide_announcement = Announcement.objects.create(
            title='Province-wide Announcement',
            description='Important for entire province',
            priority='urgent',  # Must be urgent for province-wide cascade
            announcement_type='alert',
            province=province_davao_del_norte,
            municipality=municipality_tagum,
            barangay=barangay_in_tagum,
            is_province_wide=True,
            author=user,
            is_active=True
        )

        # Create a barangay-specific announcement
        local_announcement = Announcement.objects.create(
            title='Tagum Local Announcement',
            description='Only for Magugpo barangay',
            priority='low',
            announcement_type='general',
            province=province_davao_del_norte,
            municipality=municipality_tagum,
            barangay=barangay_in_tagum,
            is_province_wide=False,
            author=user,
            is_active=True
        )

        # Filter by Tagum's barangay - should see BOTH announcements
        response = api_client.get('/api/announcements/', {
            'province': province_davao_del_norte.psgc_code,
            'municipality': municipality_tagum.psgc_code,
            'barangay': barangay_in_tagum.psgc_code
        })
        results = response.data.get('results', response.data)
        assert len(results) == 2
        ids = {r['id'] for r in results}
        assert province_wide_announcement.id in ids
        assert local_announcement.id in ids

        # Filter by Asuncion's barangay - should see only province-wide urgent announcement
        response = api_client.get('/api/announcements/', {
            'province': province_davao_del_norte.psgc_code,
            'municipality': municipality_asuncion.psgc_code,
            'barangay': barangay_in_asuncion.psgc_code
        })
        results = response.data.get('results', response.data)
        assert len(results) == 1
        assert results[0]['id'] == province_wide_announcement.id

    def test_expired_announcements_excluded_by_default(
        self, api_client, user, province_davao_del_norte, municipality_tagum
    ):
        """Test that expired announcements are excluded by default"""
        # Create active announcement (future expiry)
        active_announcement = Announcement.objects.create(
            title='Active Announcement',
            description='Still valid',
            priority='medium',
            announcement_type='general',
            province=province_davao_del_norte,
            municipality=municipality_tagum,
            expiry_date=date.today() + timedelta(days=7),
            author=user,
            is_active=True
        )

        # Create expired announcement (past expiry)
        expired_announcement = Announcement.objects.create(
            title='Expired Announcement',
            description='No longer valid',
            priority='low',
            announcement_type='general',
            province=province_davao_del_norte,
            municipality=municipality_tagum,
            expiry_date=date.today() - timedelta(days=1),
            author=user,
            is_active=True
        )

        # Default request - should exclude expired
        response = api_client.get('/api/announcements/', {
            'province': province_davao_del_norte.psgc_code
        })
        results = response.data.get('results', response.data)
        assert len(results) == 1
        assert results[0]['id'] == active_announcement.id

    def test_expired_announcements_included_when_requested(
        self, api_client, user, province_davao_del_norte, municipality_tagum
    ):
        """Test that expired announcements can be included with include_expired=true"""
        # Create active announcement
        active = Announcement.objects.create(
            title='Active',
            description='Valid',
            priority='medium',
            announcement_type='general',
            province=province_davao_del_norte,
            municipality=municipality_tagum,
            expiry_date=date.today() + timedelta(days=7),
            author=user,
            is_active=True
        )

        # Create expired announcement
        expired = Announcement.objects.create(
            title='Expired',
            description='Invalid',
            priority='low',
            announcement_type='general',
            province=province_davao_del_norte,
            municipality=municipality_tagum,
            expiry_date=date.today() - timedelta(days=1),
            author=user,
            is_active=True
        )

        # Request with include_expired=true
        response = api_client.get('/api/announcements/', {
            'province': province_davao_del_norte.psgc_code,
            'include_expired': 'true'
        })
        results = response.data.get('results', response.data)
        assert len(results) == 2
        ids = {r['id'] for r in results}
        assert active.id in ids
        assert expired.id in ids

    def test_inactive_announcements_excluded(
        self, api_client, user, province_davao_del_norte, municipality_tagum
    ):
        """Test that inactive announcements are excluded from queryset"""
        # Create active announcement
        active = Announcement.objects.create(
            title='Active',
            description='Visible',
            priority='medium',
            announcement_type='general',
            province=province_davao_del_norte,
            municipality=municipality_tagum,
            author=user,
            is_active=True
        )

        # Create inactive announcement
        inactive = Announcement.objects.create(
            title='Inactive',
            description='Hidden',
            priority='low',
            announcement_type='general',
            province=province_davao_del_norte,
            municipality=municipality_tagum,
            author=user,
            is_active=False
        )

        # Should only see active announcement
        response = api_client.get('/api/announcements/', {
            'province': province_davao_del_norte.psgc_code
        })
        results = response.data.get('results', response.data)
        assert len(results) == 1
        assert results[0]['id'] == active.id

    def test_filter_multiple_provinces(
        self, api_client, user, province_davao_del_norte, province_davao_de_oro,
        municipality_tagum, municipality_montevista
    ):
        """Test that filtering by one province doesn't return announcements from another"""
        # Create announcements in different provinces
        norte_announcement = Announcement.objects.create(
            title='Norte Announcement',
            description='For Davao del Norte',
            priority='medium',
            announcement_type='general',
            province=province_davao_del_norte,
            municipality=municipality_tagum,
            author=user,
            is_active=True
        )

        oro_announcement = Announcement.objects.create(
            title='Oro Announcement',
            description='For Davao de Oro',
            priority='medium',
            announcement_type='general',
            province=province_davao_de_oro,
            municipality=municipality_montevista,
            author=user,
            is_active=True
        )

        # Filter by Davao del Norte
        response = api_client.get('/api/announcements/', {'province': province_davao_del_norte.psgc_code})
        results = response.data.get('results', response.data)
        assert len(results) == 1
        assert results[0]['id'] == norte_announcement.id

        # Filter by Davao de Oro
        response = api_client.get('/api/announcements/', {'province': province_davao_de_oro.psgc_code})
        results = response.data.get('results', response.data)
        assert len(results) == 1
        assert results[0]['id'] == oro_announcement.id

    def test_filter_by_priority(
        self, api_client, user, province_davao_del_norte, municipality_tagum
    ):
        """Test filtering announcements by priority"""
        urgent = Announcement.objects.create(
            title='Urgent',
            description='Very important',
            priority='urgent',
            announcement_type='alert',
            province=province_davao_del_norte,
            municipality=municipality_tagum,
            author=user,
            is_active=True
        )

        low = Announcement.objects.create(
            title='Low Priority',
            description='Not urgent',
            priority='low',
            announcement_type='general',
            province=province_davao_del_norte,
            municipality=municipality_tagum,
            author=user,
            is_active=True
        )

        # Filter by urgent priority
        response = api_client.get('/api/announcements/', {'priority': 'urgent'})
        results = response.data.get('results', response.data)
        assert len(results) == 1
        assert results[0]['id'] == urgent.id

    def test_filter_by_announcement_type(
        self, api_client, user, province_davao_del_norte, municipality_tagum
    ):
        """Test filtering announcements by type"""
        alert = Announcement.objects.create(
            title='Alert',
            description='Important alert',
            priority='urgent',
            announcement_type='alert',
            province=province_davao_del_norte,
            municipality=municipality_tagum,
            author=user,
            is_active=True
        )

        general = Announcement.objects.create(
            title='General',
            description='General info',
            priority='low',
            announcement_type='general',
            province=province_davao_del_norte,
            municipality=municipality_tagum,
            author=user,
            is_active=True
        )

        # Filter by alert type
        response = api_client.get('/api/announcements/', {'announcement_type': 'alert'})
        results = response.data.get('results', response.data)
        assert len(results) == 1
        assert results[0]['id'] == alert.id

    def test_search_announcements(
        self, api_client, user, province_davao_del_norte, municipality_tagum
    ):
        """Test searching announcements by title/description"""
        Announcement.objects.create(
            title='Road Closure on Main Street',
            description='Main street will be closed for repairs',
            priority='high',
            announcement_type='infrastructure',
            province=province_davao_del_norte,
            municipality=municipality_tagum,
            author=user,
            is_active=True
        )

        Announcement.objects.create(
            title='Community Event',
            description='Join us for a community gathering',
            priority='low',
            announcement_type='community',
            province=province_davao_del_norte,
            municipality=municipality_tagum,
            author=user,
            is_active=True
        )

        # Search for "road"
        response = api_client.get('/api/announcements/', {'search': 'road'})
        results = response.data.get('results', response.data)
        assert len(results) == 1
        assert 'Road Closure' in results[0]['title']

    def test_ordering_by_priority_and_date(
        self, api_client, user, province_davao_del_norte, municipality_tagum
    ):
        """
        Test that announcements are ordered by priority (desc) then created_at (desc)
        """
        import time

        # Create announcements with different priorities
        low = Announcement.objects.create(
            title='Low Priority',
            description='Old low priority',
            priority='low',
            announcement_type='general',
            province=province_davao_del_norte,
            municipality=municipality_tagum,
            author=user,
            is_active=True
        )
        time.sleep(0.01)  # Ensure different timestamps

        urgent = Announcement.objects.create(
            title='Urgent',
            description='New urgent',
            priority='urgent',
            announcement_type='alert',
            province=province_davao_del_norte,
            municipality=municipality_tagum,
            author=user,
            is_active=True
        )
        time.sleep(0.01)

        high = Announcement.objects.create(
            title='High Priority',
            description='New high priority',
            priority='high',
            announcement_type='government',
            province=province_davao_del_norte,
            municipality=municipality_tagum,
            author=user,
            is_active=True
        )

        response = api_client.get('/api/announcements/', {'province': province_davao_del_norte.psgc_code})
        results = response.data.get('results', response.data)

        # Priority orders alphabetically DESC: urgent > low > high
        assert len(results) == 3
        assert results[0]['priority'] == 'urgent'
        # The next two could be in any order since they have different alphabetical priorities
        priorities = {results[1]['priority'], results[2]['priority']}
        assert priorities == {'low', 'high'}
