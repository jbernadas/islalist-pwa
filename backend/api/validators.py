"""
Custom validators for the API.
"""
from django.core.exceptions import ValidationError
from django.utils.translation import gettext_lazy as _
from rest_framework import serializers


# Image validation constants
MAX_IMAGE_SIZE = 5 * 1024 * 1024  # 5MB
ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
ALLOWED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp']


def validate_image_file(image):
    """
    Validate an uploaded image file for size and type.
    Can be used as a Django model validator or called directly.

    Args:
        image: An uploaded file object (UploadedFile or InMemoryUploadedFile)

    Raises:
        ValidationError: If image is invalid
    """
    if not image:
        return

    # Check file size
    if hasattr(image, 'size') and image.size > MAX_IMAGE_SIZE:
        raise ValidationError(
            _('Image file too large. Maximum size is %(max_size)s MB.'),
            code='file_too_large',
            params={'max_size': MAX_IMAGE_SIZE // (1024 * 1024)}
        )

    # Check content type
    content_type = getattr(image, 'content_type', None)
    if content_type and content_type not in ALLOWED_IMAGE_TYPES:
        raise ValidationError(
            _('Invalid image type "%(content_type)s". Allowed types: %(allowed)s'),
            code='invalid_type',
            params={
                'content_type': content_type,
                'allowed': ', '.join(ALLOWED_IMAGE_TYPES)
            }
        )

    # Check file extension as fallback
    if hasattr(image, 'name') and image.name:
        name_lower = image.name.lower()
        has_valid_extension = any(
            name_lower.endswith(ext) for ext in ALLOWED_IMAGE_EXTENSIONS
        )
        if not has_valid_extension:
            raise ValidationError(
                _('Invalid file extension. Allowed: %(allowed)s'),
                code='invalid_extension',
                params={'allowed': ', '.join(ALLOWED_IMAGE_EXTENSIONS)}
            )


class ValidatedImageField(serializers.ImageField):
    """
    Custom ImageField serializer that validates image size and type.

    Usage in serializers:
        uploaded_images = serializers.ListField(
            child=ValidatedImageField(),
            write_only=True,
            required=False
        )
    """

    def __init__(self, *args, max_size=MAX_IMAGE_SIZE,
                 allowed_types=None, **kwargs):
        self.max_size = max_size
        self.allowed_types = allowed_types or ALLOWED_IMAGE_TYPES
        super().__init__(*args, **kwargs)

    def to_internal_value(self, data):
        # Run parent validation first (checks it's a valid image)
        file = super().to_internal_value(data)

        # Check file size
        if file.size > self.max_size:
            raise serializers.ValidationError(
                f'Image file too large. Maximum size is {self.max_size // (1024 * 1024)}MB.'
            )

        # Check content type
        if hasattr(file, 'content_type') and file.content_type not in self.allowed_types:
            raise serializers.ValidationError(
                f'Invalid image type "{file.content_type}". '
                f'Allowed types: {", ".join(self.allowed_types)}'
            )

        return file
