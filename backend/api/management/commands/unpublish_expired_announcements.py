from django.core.management.base import BaseCommand
from django.utils import timezone
from api.models import Announcement


class Command(BaseCommand):
    help = 'Unpublish announcements that have passed their expiry date'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be unpublished without actually doing it',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        today = timezone.now().date()

        # Find active announcements that have expired
        expired_announcements = Announcement.objects.filter(
            is_active=True,
            expiry_date__isnull=False,
            expiry_date__lt=today
        )

        count = expired_announcements.count()

        if count == 0:
            self.stdout.write(
                self.style.SUCCESS('No expired announcements found.')
            )
            return

        if dry_run:
            self.stdout.write(
                self.style.WARNING(f'[DRY RUN] Would unpublish {count} announcement(s):')
            )
            for announcement in expired_announcements:
                self.stdout.write(
                    f'  - "{announcement.title}" (expired: {announcement.expiry_date})'
                )
        else:
            # Unpublish the expired announcements
            updated = expired_announcements.update(is_active=False)

            self.stdout.write(
                self.style.SUCCESS(
                    f'Successfully unpublished {updated} expired announcement(s).'
                )
            )

            # Log the unpublished announcements
            for announcement in Announcement.objects.filter(
                is_active=False,
                expiry_date__isnull=False,
                expiry_date__lt=today
            )[:count]:
                self.stdout.write(
                    f'  - "{announcement.title}" (expired: {announcement.expiry_date})'
                )
