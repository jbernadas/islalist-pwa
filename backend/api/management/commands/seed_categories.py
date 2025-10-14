from django.core.management.base import BaseCommand
from api.models import Category


class Command(BaseCommand):
    help = 'Seed initial categories for IslaList marketplace'

    def handle(self, *args, **options):
        categories = [
            {
                'name': 'Real Estate',
                'description': 'Houses, land, apartments, and commercial properties',
                'icon': '🏠',
                'order': 1
            },
            {
                'name': 'Vehicles',
                'description': 'Cars, motorcycles, boats, and other vehicles',
                'icon': '🚗',
                'order': 2
            },
            {
                'name': 'Electronics',
                'description': 'Phones, computers, cameras, and gadgets',
                'icon': '📱',
                'order': 3
            },
            {
                'name': 'Home & Garden',
                'description': 'Furniture, appliances, and garden items',
                'icon': '🛋️',
                'order': 4
            },
            {
                'name': 'Jobs',
                'description': 'Job openings and employment opportunities',
                'icon': '💼',
                'order': 5
            },
            {
                'name': 'Services',
                'description': 'Professional services and skills offered',
                'icon': '🔧',
                'order': 6
            },
            {
                'name': 'For Sale',
                'description': 'General items for sale',
                'icon': '🛍️',
                'order': 7
            },
        ]

        created_count = 0
        for cat_data in categories:
            category, created = Category.objects.get_or_create(
                name=cat_data['name'],
                defaults=cat_data
            )
            if created:
                created_count += 1
                self.stdout.write(
                    self.style.SUCCESS(f'Created category: {category.name}')
                )
            else:
                self.stdout.write(
                    self.style.WARNING(f'Category already exists: {category.name}')
                )

        self.stdout.write(
            self.style.SUCCESS(
                f'\\nSuccessfully created {created_count} new categories'
            )
        )
