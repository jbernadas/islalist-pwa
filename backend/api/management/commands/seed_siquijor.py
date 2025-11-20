from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from django.utils import timezone
from datetime import timedelta
from decimal import Decimal
import random

from api.models import Province, Municipality, Barangay, Category, Listing, Announcement


class Command(BaseCommand):
    help = 'Seeds Siquijor province with realistic test data covering all use cases'

    def add_arguments(self, parser):
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Clear existing Siquijor data before seeding',
        )

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('Starting Siquijor seed data generation...'))

        if options['clear']:
            self.stdout.write(self.style.WARNING('Clearing existing Siquijor data...'))
            self.clear_siquijor_data()

        province, municipalities = self.ensure_locations()
        users = self.create_users()
        categories = self.ensure_categories()

        self.stdout.write(self.style.SUCCESS('Seeding announcements...'))
        self.seed_announcements(province, municipalities, users)

        self.stdout.write(self.style.SUCCESS('Seeding listings...'))
        self.seed_listings(province, municipalities, categories, users)

        self.stdout.write(self.style.SUCCESS('Siquijor seed data generation complete!'))
        self.print_summary(province, municipalities)

    def clear_siquijor_data(self):
        try:
            province = Province.objects.get(name='Siquijor')
            Listing.objects.filter(island='Siquijor').delete()
            Announcement.objects.filter(province=province).delete()
            self.stdout.write(self.style.SUCCESS('   Cleared existing data'))
        except Province.DoesNotExist:
            pass

    def ensure_locations(self):
        self.stdout.write(self.style.SUCCESS('Setting up locations...'))

        province, _ = Province.objects.get_or_create(
            name='Siquijor',
            defaults={'active': True, 'featured': True}
        )

        municipality_data = [
            ('Siquijor', 'Mun'),
            ('Larena', 'Mun'),
            ('Enrique Villanueva', 'Mun'),
            ('Maria', 'Mun'),
            ('Lazi', 'Mun'),
            ('San Juan', 'Mun'),
        ]

        municipalities = {}
        for name, mun_type in municipality_data:
            mun, created = Municipality.objects.get_or_create(
                name=name,
                province=province,
                defaults={'type': mun_type, 'active': True}
            )
            municipalities[name] = mun

        barangay_data = {
            'Siquijor': ['Poblacion', 'Cananay Sur', 'Dumala'],
            'Larena': ['Poblacion', 'Cangomantong', 'Nonok'],
            'Enrique Villanueva': ['Poblacion', 'Bino-ongan', 'Libo'],
            'Maria': ['Poblacion', 'Catamboan', 'Cangmangki'],
            'Lazi': ['Poblacion', 'Campalanas', 'Tigbawan'],
            'San Juan': ['Poblacion', 'Tubod', 'Can-uba'],
        }

        for mun_name, barangay_names in barangay_data.items():
            mun = municipalities[mun_name]
            for brgy_name in barangay_names:
                Barangay.objects.get_or_create(
                    name=brgy_name,
                    municipality=mun,
                    defaults={'active': True}
                )

        return province, municipalities

    def create_users(self):
        self.stdout.write(self.style.SUCCESS('Creating test users...'))

        users = []
        user_data = [
            ('juan_seller', 'Juan', 'Dela Cruz', 'juan@example.com'),
            ('maria_realtor', 'Maria', 'Santos', 'maria@example.com'),
            ('pedro_trader', 'Pedro', 'Reyes', 'pedro@example.com'),
            ('ana_business', 'Ana', 'Garcia', 'ana@example.com'),
            ('carlos_admin', 'Carlos', 'Ramos', 'carlos@example.com'),
        ]

        for username, first_name, last_name, email in user_data:
            user, created = User.objects.get_or_create(
                username=username,
                defaults={
                    'first_name': first_name,
                    'last_name': last_name,
                    'email': email,
                }
            )
            if created:
                user.set_password('testpass123')
                user.save()
            users.append(user)

        return users

    def ensure_categories(self):
        categories = {}
        category_data = [
            ('Real Estate', 'house'),
            ('Vehicles', 'car'),
            ('For Sale', 'tag'),
            ('Jobs', 'briefcase'),
            ('Services', 'wrench'),
        ]

        for name, icon in category_data:
            cat, _ = Category.objects.get_or_create(
                name=name,
                defaults={'icon': icon, 'active': True}
            )
            categories[name] = cat

        return categories

    def seed_announcements(self, province, municipalities, users):
        # PROVINCE-WIDE (5)
        province_announcements = [
            ('Tropical Storm Warning for Siquijor Province', 'PAGASA has issued a tropical storm warning. All residents prepare emergency kits.', 'urgent', 'alert', True),
            ('Provincial Health Advisory: Dengue Prevention', 'Island-wide dengue prevention campaign. Free mosquito nets at health centers.', 'high', 'health', True),
            ('Siquijor Tourism Festival 2024', 'Annual tourism festival with week-long festivities. All municipalities participating!', 'medium', 'community', True),
            ('Marine Conservation Program', 'Environmental groups partner for marine conservation. Volunteers needed!', 'low', 'general', True),
            ('Provincial Government Updates', 'Monthly updates from Governor. New infrastructure projects and improvements.', 'medium', 'government', True),
        ]

        for title, desc, priority, ann_type, is_prov in province_announcements:
            Announcement.objects.create(
                title=title,
                description=desc,
                priority=priority,
                announcement_type=ann_type,
                province=province,
                municipality=municipalities['Siquijor'],
                is_province_wide=is_prov,
                author=random.choice(users),
                created_at=timezone.now() - timedelta(days=random.randint(1, 30))
            )

        # MUNICIPALITY-WIDE (12)
        mun_announcements = [
            ('Siquijor', 'Town Fiesta Schedule', 'Annual town fiesta with three days of festivities!', 'high', 'community'),
            ('Siquijor', 'Road Closure: Highway Repair', 'National highway closed for emergency repairs. Alternate routes available.', 'urgent', 'infrastructure'),
            ('Larena', 'Port Advisory: Ferry Schedule Changes', 'Temporary ferry schedule changes due to vessel maintenance.', 'high', 'government'),
            ('Larena', 'Market Hours Extended', 'Public market now open until 8 PM with new night market section.', 'medium', 'business'),
            ('Enrique Villanueva', 'Free Tourism Training', 'Free tourism and hospitality training. Limited slots available!', 'medium', 'community'),
            ('Enrique Villanueva', 'Water Interruption Schedule', 'Scheduled water interruption for pipeline improvement.', 'high', 'infrastructure'),
            ('Maria', 'Sports Festival Registration', 'Inter-barangay sports festival. Registration open for all!', 'medium', 'community'),
            ('Maria', 'Agricultural Support Program', 'Free seedlings and equipment for registered farmers.', 'low', 'government'),
            ('Lazi', 'Church Restoration Update', 'Historic church restoration progressing well. Completion in 3 months.', 'medium', 'general'),
            ('Lazi', 'Tourism Development Meeting', 'Community meeting to discuss tourism development plans.', 'high', 'government'),
            ('San Juan', 'Beach Cleanup Drive', 'Monthly beach cleanup at Paliton and Salagdoong beaches!', 'medium', 'community'),
            ('San Juan', 'New Business Permit Requirements', 'Updated business permit requirements. Orientation required.', 'low', 'business'),
        ]

        for mun_name, title, desc, priority, ann_type in mun_announcements:
            Announcement.objects.create(
                title=title,
                description=desc,
                priority=priority,
                announcement_type=ann_type,
                province=province,
                municipality=municipalities[mun_name],
                is_municipality_wide=True,
                author=random.choice(users),
                created_at=timezone.now() - timedelta(days=random.randint(1, 25))
            )

        # BARANGAY-SPECIFIC (12)
        brgy_announcements = [
            ('Siquijor', 'Poblacion', 'Barangay Cleanup Schedule', 'Monthly cleanup every first Sunday.', 'community', 'medium'),
            ('Siquijor', 'Cananay Sur', 'Basketball League Registration', 'Inter-purok basketball league now open!', 'community', 'low'),
            ('Larena', 'Poblacion', 'Water Interruption Notice', 'Water supply interruption tomorrow for pump repair.', 'infrastructure', 'urgent'),
            ('Larena', 'Cangomantong', 'Barangay Assembly', 'Quarterly assembly this Friday 6 PM.', 'government', 'medium'),
            ('Enrique Villanueva', 'Poblacion', 'Street Light Repairs', 'Electrician will repair street lights this week.', 'infrastructure', 'low'),
            ('Enrique Villanueva', 'Bino-ongan', 'Vaccination Drive', 'Free vaccination for children 0-5 years old.', 'health', 'high'),
            ('Maria', 'Poblacion', 'Senior Citizens Meeting', 'Monthly meeting and social pension distribution.', 'community', 'medium'),
            ('Maria', 'Catamboan', 'Road Project Update', 'Sitio road 50% complete. Finish in 2 weeks.', 'infrastructure', 'low'),
            ('Lazi', 'Poblacion', 'Barangay Tanod Recruitment', 'Hiring additional barangay tanod. Apply now!', 'government', 'medium'),
            ('Lazi', 'Campalanas', 'Farm Road Opening', 'New farm-to-market road now open!', 'infrastructure', 'medium'),
            ('San Juan', 'Poblacion', 'Fiesta Celebration', 'Barangay fiesta with street dancing and competitions!', 'community', 'high'),
            ('San Juan', 'Tubod', 'Scholarship Program', 'Scholarship grants for deserving students.', 'community', 'medium'),
        ]

        for mun_name, brgy_name, title, desc, ann_type, priority in brgy_announcements:
            # Look up the Barangay object
            try:
                barangay_obj = Barangay.objects.get(
                    name=brgy_name,
                    municipality=municipalities[mun_name]
                )
                Announcement.objects.create(
                    title=title,
                    description=desc,
                    priority=priority,
                    announcement_type=ann_type,
                    province=province,
                    municipality=municipalities[mun_name],
                    barangay=barangay_obj,
                    author=random.choice(users),
                    created_at=timezone.now() - timedelta(days=random.randint(1, 20))
                )
            except Barangay.DoesNotExist:
                self.stdout.write(self.style.WARNING(f'   Skipping announcement for non-existent barangay: {brgy_name} in {mun_name}'))

        self.stdout.write('   Created 29 announcements')

    def seed_listings(self, province, municipalities, categories, users):
        listings_data = [
            # Real Estate listings
            ('Siquijor', 'Poblacion', 'Beach House for Rent', 'Beautiful beachfront property with 3 bedrooms', 'Real Estate', 25000.00),
            ('Siquijor', 'Cananay Sur', 'Lot for Sale - Ocean View', '500 sqm lot with stunning ocean views', 'Real Estate', 1500000.00),
            ('Larena', 'Poblacion', 'Apartment Near Port', '2BR apartment, walking distance to port', 'Real Estate', 8000.00),
            ('San Juan', 'Tubod', 'Beach Resort Property', 'Prime beachfront resort property for sale', 'Real Estate', 5000000.00),

            # Vehicles
            ('Siquijor', 'Poblacion', 'Motorcycle for Sale', 'Honda TMX 2020 model, good condition', 'Vehicles', 45000.00),
            ('Larena', 'Cangomantong', 'Multicab for Rent', 'Daily or weekly rental available', 'Vehicles', 1500.00),

            # For Sale items
            ('Enrique Villanueva', 'Poblacion', 'Fresh Organic Vegetables', 'Farm fresh vegetables daily', 'For Sale', 50.00),
            ('Maria', 'Catamboan', 'Handmade Crafts', 'Local handmade souvenirs and crafts', 'For Sale', 150.00),
            ('Lazi', 'Poblacion', 'Fresh Seafood Daily', 'Freshly caught fish and seafood', 'For Sale', 300.00),
            ('San Juan', 'Can-uba', 'Homemade Delicacies', 'Traditional Siquijor delicacies', 'For Sale', 200.00),

            # Jobs
            ('Siquijor', 'Poblacion', 'Tour Guide Needed', 'Looking for experienced tour guide', 'Jobs', 500.00),
            ('Larena', 'Poblacion', 'Restaurant Staff Hiring', 'Hiring kitchen staff and waiters', 'Jobs', 400.00),
            ('San Juan', 'Poblacion', 'Dive Instructor Position', 'PADI certified instructor needed', 'Jobs', 800.00),

            # Services
            ('Siquijor', 'Poblacion', 'Motorcycle Rental Service', 'Affordable motorcycle rentals for tourists', 'Services', 500.00),
            ('Larena', 'Poblacion', 'Laundry Service', 'Same day laundry service available', 'Services', 50.00),
            ('Enrique Villanueva', 'Poblacion', 'Island Tour Packages', 'Full day and half day tour packages', 'Services', 1500.00),
            ('Maria', 'Poblacion', 'Massage and Spa', 'Relaxing massage and spa services', 'Services', 500.00),
            ('Lazi', 'Poblacion', 'Photography Services', 'Professional photography for events', 'Services', 2000.00),
            ('San Juan', 'Poblacion', 'Diving Lessons', 'Learn to dive with certified instructors', 'Services', 3000.00),
        ]

        for mun_name, brgy_name, title, desc, cat_name, price in listings_data:
            try:
                barangay_obj = Barangay.objects.get(
                    name=brgy_name,
                    municipality=municipalities[mun_name]
                )
                Listing.objects.create(
                    title=title,
                    description=desc,
                    category=categories[cat_name],
                    price=Decimal(str(price)),
                    barangay=barangay_obj,
                    seller=random.choice(users),
                    status='active',
                    island='Siquijor',
                    created_at=timezone.now() - timedelta(days=random.randint(1, 30))
                )
            except Barangay.DoesNotExist:
                self.stdout.write(self.style.WARNING(f'   Skipping listing for non-existent barangay: {brgy_name} in {mun_name}'))

        self.stdout.write(f'   Created {len(listings_data)} listings')

    def print_summary(self, province, municipalities):
        self.stdout.write(self.style.SUCCESS('\nSEED DATA SUMMARY'))
        self.stdout.write('=' * 50)

        announcement_count = Announcement.objects.filter(province=province).count()
        listing_count = Listing.objects.filter(island='Siquijor', status='active').count()

        self.stdout.write(f'Province: {province.name}')
        self.stdout.write(f'Municipalities: {len(municipalities)}')
        self.stdout.write(f'Total Announcements: {announcement_count}')
        self.stdout.write(f'Total Listings: {listing_count}')
