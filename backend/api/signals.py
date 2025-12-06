"""
Django signals for the API app.

Handles automatic cleanup of hero images when they are replaced or cleared.
"""
from django.db.models.signals import pre_save
from django.dispatch import receiver

from .models import Province, Municipality


@receiver(pre_save, sender=Province)
@receiver(pre_save, sender=Municipality)
def delete_old_hero_image_on_change(sender, instance, **kwargs):
    """
    Delete old hero image file from storage when:
    - A new hero image is uploaded (replacing the old one)
    - The hero image field is cleared (set to blank)

    This prevents orphaned image files from accumulating in storage.
    """
    if not instance.pk:
        # New instance, no old image to delete
        return

    try:
        old_instance = sender.objects.get(pk=instance.pk)
    except sender.DoesNotExist:
        # Instance doesn't exist yet
        return

    old_image = old_instance.hero_image
    new_image = instance.hero_image

    # Check if hero_image has changed
    if old_image and old_image != new_image:
        # Delete the old image file from storage
        # save=False prevents triggering another save
        old_image.delete(save=False)
