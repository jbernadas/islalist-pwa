import json
import os
from django.core.management.base import BaseCommand
from api.models import Province, Municipality, Barangay


class Command(BaseCommand):
    help = 'Reseed database with Philippine provinces, cities/municipalities, and barangays'

    def add_arguments(self, parser):
        parser.add_argument(
            '--no-input',
            action='store_true',
            help='Skip confirmation prompt',
        )

    def handle(self, *args, **kwargs):
        no_input = kwargs.get('no_input', False)

        # Show current counts
        province_count = Province.objects.count()
        municipality_count = Municipality.objects.count()
        barangay_count = Barangay.objects.count()

        self.stdout.write('='*50)
        self.stdout.write(self.style.WARNING('DATABASE RESEED'))
        self.stdout.write('='*50)
        self.stdout.write(f'Current provinces: {province_count}')
        self.stdout.write(f'Current cities/municipalities: {municipality_count}')
        self.stdout.write(f'Current barangays: {barangay_count}')
        self.stdout.write('')

        # Confirmation
        if not no_input:
            confirm = input('This will DELETE all provinces, cities/municipalities, and barangays. Continue? (yes/no): ')
            if confirm.lower() != 'yes':
                self.stdout.write(self.style.ERROR('Operation cancelled.'))
                return

        # Delete all existing data
        self.stdout.write('')
        self.stdout.write('Deleting existing data...')

        deleted_barangays = Barangay.objects.all().delete()
        deleted_municipalities = Municipality.objects.all().delete()
        deleted_provinces = Province.objects.all().delete()

        self.stdout.write(
            self.style.SUCCESS(f'  Deleted {deleted_provinces[0]} provinces')
        )
        self.stdout.write(
            self.style.SUCCESS(f'  Deleted {deleted_municipalities[0]} cities/municipalities')
        )
        self.stdout.write(
            self.style.SUCCESS(f'  Deleted {deleted_barangays[0]} barangays')
        )

        # Reseed data
        self.stdout.write('')
        self.stdout.write('Reseeding provinces, cities/municipalities, and barangays...')

        # Load Province and Municipality data from JSON file
        json_path = os.path.join(
            os.path.dirname(__file__),
            'provinces_data.json'
        )

        try:
            with open(json_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
                provinces_data = data['provinces']
        except FileNotFoundError:
            self.stdout.write(
                self.style.ERROR(
                    f'Error: provinces_data.json not found at {json_path}'
                )
            )
            return
        except json.JSONDecodeError as e:
            self.stdout.write(
                self.style.ERROR(f'Error parsing JSON file: {e}')
            )
            return

        created_provinces = 0
        created_municipalities = 0
        created_barangays = 0

        for province_data in provinces_data:
            province_name = province_data['name']
            province_code = province_data.get('code', '')

            # Create province
            province = Province.objects.create(
                name=province_name,
                psgc_code=str(province_code) if province_code else None,
                active=True
            )
            created_provinces += 1
            self.stdout.write(
                self.style.SUCCESS(f'  Created province: {province_name}')
            )

            # Create cities/municipalities for this province
            for city_mun in province_data['cities_municipalities']:
                municipality_name = city_mun['name']
                municipality_type = city_mun.get('type', 'Mun')
                municipality_code = city_mun.get('code', '')
                # Preserve SubMun type for Manila districts
                municipality = Municipality.objects.create(
                    name=municipality_name,
                    psgc_code=str(municipality_code) if municipality_code else None,
                    province=province,
                    type=municipality_type,
                    active=True
                )
                created_municipalities += 1
                self.stdout.write(
                    self.style.SUCCESS(
                        f'    Created city/municipality: {municipality_name}'
                    )
                )

                # Create barangays for this city/municipality
                for barangay_data in city_mun.get('barangays', []):
                    barangay_name = barangay_data['name']
                    barangay_code = barangay_data.get('code', '')
                    Barangay.objects.create(
                        name=barangay_name,
                        psgc_code=str(barangay_code) if barangay_code else None,
                        municipality=municipality,
                        active=True
                    )
                    created_barangays += 1

                # Show barangay count for this municipality
                barangay_count = len(city_mun.get('barangays', []))
                if barangay_count > 0:
                    self.stdout.write(
                        self.style.SUCCESS(
                            f'      Created {barangay_count} barangays'
                        )
                    )

        # Summary
        self.stdout.write('')
        self.stdout.write('='*50)
        self.stdout.write(self.style.SUCCESS('RESEED COMPLETE!'))
        self.stdout.write(f'Provinces created: {created_provinces}')
        self.stdout.write(f'Cities/Municipalities created: {created_municipalities}')
        self.stdout.write(f'Barangays created: {created_barangays}')
        self.stdout.write(
            f'Total active provinces: {Province.objects.filter(active=True).count()}'
        )
        self.stdout.write(
            f'Total active cities/municipalities: '
            f'{Municipality.objects.filter(active=True).count()}'
        )
        self.stdout.write(
            f'Total active barangays: '
            f'{Barangay.objects.filter(active=True).count()}'
        )
        self.stdout.write('='*50)
