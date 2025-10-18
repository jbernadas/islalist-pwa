import json
import os
from django.core.management.base import BaseCommand
from api.models import Province, Municipality


class Command(BaseCommand):
    help = 'Seed database with Philippine provinces and cities/municipalities'

    def handle(self, *args, **kwargs):
        self.stdout.write('Seeding provinces and cities/municipalities...')

        # Load Province and Municipality data from JSON file
        json_path = os.path.join(
            os.path.dirname(__file__),
            'provinces_data.json'
        )

        try:
            with open(json_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
                provinces_data = data['provinces_data']
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
        updated_provinces = 0
        updated_municipalities = 0

        for province_name, municipalities in provinces_data.items():
            # Get or create province
            province, created = Province.objects.get_or_create(
                name=province_name,
                defaults={'active': True}
            )

            if created:
                created_provinces += 1
                self.stdout.write(
                    self.style.SUCCESS(f'  Created province: {province_name}')
                )
            else:
                updated_provinces += 1
                self.stdout.write(
                    self.style.WARNING(f'  Province exists: {province_name}')
                )

            # Create cities/municipalities for this province
            for municipality_name in municipalities:
                municipality, created = Municipality.objects.get_or_create(
                    name=municipality_name,
                    province=province,
                    defaults={'active': True}
                )

                if created:
                    created_municipalities += 1
                    self.stdout.write(
                        self.style.SUCCESS(
                            f'    Created city/municipality: {municipality_name}'
                        )
                    )
                else:
                    updated_municipalities += 1

        # Summary
        self.stdout.write('\n' + '='*50)
        self.stdout.write(self.style.SUCCESS('Seeding complete!'))
        self.stdout.write(f'Provinces created: {created_provinces}')
        self.stdout.write(f'Provinces existing: {updated_provinces}')
        self.stdout.write(f'Cities/Municipalities created: {created_municipalities}')
        self.stdout.write(f'Cities/Municipalities existing: {updated_municipalities}')
        self.stdout.write(
            f'Total active provinces: {Province.objects.filter(active=True).count()}'
        )
        self.stdout.write(
            f'Total active cities/municipalities: '
            f'{Municipality.objects.filter(active=True).count()}'
        )
        self.stdout.write('='*50)
