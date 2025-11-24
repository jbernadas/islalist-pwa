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

        # Reseed data (using update_or_create to preserve IDs)
        self.stdout.write('')
        self.stdout.write('Updating/Creating provinces, cities/municipalities, and barangays...')
        self.stdout.write(self.style.WARNING('Using PSGC codes to preserve database IDs'))

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
        updated_provinces = 0
        created_municipalities = 0
        updated_municipalities = 0
        created_barangays = 0
        updated_barangays = 0

        for province_data in provinces_data:
            province_name = province_data['name']
            province_code = province_data.get('code', '')

            if not province_code:
                self.stdout.write(
                    self.style.WARNING(f'  Skipping province {province_name} - no PSGC code')
                )
                continue

            # Update or create province using PSGC code as lookup key
            province, created = Province.objects.update_or_create(
                psgc_code=str(province_code),
                defaults={
                    'name': province_name,
                    'active': True
                }
            )

            if created:
                created_provinces += 1
                self.stdout.write(
                    self.style.SUCCESS(f'  Created province: {province_name}')
                )
            else:
                updated_provinces += 1
                self.stdout.write(
                    f'  Updated province: {province_name}'
                )

            # Update or create cities/municipalities for this province
            for city_mun in province_data['cities_municipalities']:
                municipality_name = city_mun['name']
                municipality_type = city_mun.get('type', 'Mun')
                municipality_code = city_mun.get('code', '')

                if not municipality_code:
                    self.stdout.write(
                        self.style.WARNING(f'    Skipping {municipality_name} - no PSGC code')
                    )
                    continue

                # Update or create municipality using PSGC code as lookup key
                municipality, mun_created = Municipality.objects.update_or_create(
                    psgc_code=str(municipality_code),
                    defaults={
                        'name': municipality_name,
                        'province': province,
                        'type': municipality_type,
                        'active': True
                    }
                )

                if mun_created:
                    created_municipalities += 1
                    self.stdout.write(
                        self.style.SUCCESS(
                            f'    Created city/municipality: {municipality_name}'
                        )
                    )
                else:
                    updated_municipalities += 1

                # Update or create barangays for this city/municipality
                barangay_created_count = 0
                barangay_updated_count = 0

                for barangay_data in city_mun.get('barangays', []):
                    barangay_name = barangay_data['name']
                    barangay_code = barangay_data.get('code', '')

                    if not barangay_code:
                        continue

                    # Update or create barangay using PSGC code as lookup key
                    barangay, brgy_created = Barangay.objects.update_or_create(
                        psgc_code=str(barangay_code),
                        defaults={
                            'name': barangay_name,
                            'municipality': municipality,
                            'active': True
                        }
                    )

                    if brgy_created:
                        created_barangays += 1
                        barangay_created_count += 1
                    else:
                        updated_barangays += 1
                        barangay_updated_count += 1

                # Show barangay count for this municipality
                if barangay_created_count > 0 or barangay_updated_count > 0:
                    self.stdout.write(
                        self.style.SUCCESS(
                            f'      Barangays: {barangay_created_count} created, {barangay_updated_count} updated'
                        )
                    )

        # Summary
        self.stdout.write('')
        self.stdout.write('='*50)
        self.stdout.write(self.style.SUCCESS('RESEED COMPLETE!'))
        self.stdout.write('')
        self.stdout.write('Provinces:')
        self.stdout.write(f'  Created: {created_provinces}')
        self.stdout.write(f'  Updated: {updated_provinces}')
        self.stdout.write('')
        self.stdout.write('Cities/Municipalities:')
        self.stdout.write(f'  Created: {created_municipalities}')
        self.stdout.write(f'  Updated: {updated_municipalities}')
        self.stdout.write('')
        self.stdout.write('Barangays:')
        self.stdout.write(f'  Created: {created_barangays}')
        self.stdout.write(f'  Updated: {updated_barangays}')
        self.stdout.write('')
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
