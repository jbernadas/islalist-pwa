import json
import os
from django.core.management.base import BaseCommand
from api.models import Province, Municipality


class Command(BaseCommand):
    help = 'Reseed database with Philippine provinces and cities/municipalities'

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

        self.stdout.write('='*50)
        self.stdout.write(self.style.WARNING('DATABASE RESEED'))
        self.stdout.write('='*50)
        self.stdout.write(f'Current provinces: {province_count}')
        self.stdout.write(f'Current cities/municipalities: {municipality_count}')
        self.stdout.write('')

        # Confirmation
        if not no_input:
            confirm = input('This will DELETE all provinces and cities/municipalities. Continue? (yes/no): ')
            if confirm.lower() != 'yes':
                self.stdout.write(self.style.ERROR('Operation cancelled.'))
                return

        # Delete all existing data
        self.stdout.write('')
        self.stdout.write('Deleting existing data...')

        deleted_municipalities = Municipality.objects.all().delete()
        deleted_provinces = Province.objects.all().delete()

        self.stdout.write(
            self.style.SUCCESS(f'  Deleted {deleted_provinces[0]} provinces')
        )
        self.stdout.write(
            self.style.SUCCESS(f'  Deleted {deleted_municipalities[0]} cities/municipalities')
        )

        # Reseed data
        self.stdout.write('')
        self.stdout.write('Reseeding provinces and cities/municipalities...')

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

        for province_name, municipalities in provinces_data.items():
            # Create province
            province = Province.objects.create(
                name=province_name,
                active=True
            )
            created_provinces += 1
            self.stdout.write(
                self.style.SUCCESS(f'  Created province: {province_name}')
            )

            # Create cities/municipalities for this province
            for municipality_name in municipalities:
                Municipality.objects.create(
                    name=municipality_name,
                    province=province,
                    active=True
                )
                created_municipalities += 1
                self.stdout.write(
                    self.style.SUCCESS(
                        f'    Created city/municipality: {municipality_name}'
                    )
                )

        # Summary
        self.stdout.write('')
        self.stdout.write('='*50)
        self.stdout.write(self.style.SUCCESS('RESEED COMPLETE!'))
        self.stdout.write(f'Provinces created: {created_provinces}')
        self.stdout.write(f'Cities/Municipalities created: {created_municipalities}')
        self.stdout.write(
            f'Total active provinces: {Province.objects.filter(active=True).count()}'
        )
        self.stdout.write(
            f'Total active cities/municipalities: '
            f'{Municipality.objects.filter(active=True).count()}'
        )
        self.stdout.write('='*50)
