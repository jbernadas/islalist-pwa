"""
Image processing utilities for resizing and converting images to WebP format.

This module provides functions to resize uploaded images into multiple size variants
optimized for different display contexts (thumbnails, cards, detail views, lightbox).
"""

import os
import uuid
from io import BytesIO
from PIL import Image
from django.core.files.base import ContentFile


# Image size configurations: (width, height, quality)
IMAGE_SIZES = {
    'thumb': (150, 100, 75),      # Thumbnail strips, small previews
    'small': (300, 200, 80),      # Mobile cards
    'medium': (500, 333, 85),     # Desktop cards
    'large': (1200, 800, 85),     # Detail page hero, mobile lightbox
    'xlarge': (1920, 1280, 85),   # Desktop lightbox
}

# Profile picture sizes (square aspect ratio)
PROFILE_SIZES = {
    'thumb': (100, 100, 75),      # Small avatar
    'small': (200, 200, 80),      # Standard avatar
    'medium': (400, 400, 85),     # Large avatar / profile page
}


def generate_unique_filename(original_filename, size_name):
    """
    Generate a unique filename for the resized image.

    Args:
        original_filename: Original uploaded filename
        size_name: Size variant name (thumb, small, medium, large, xlarge)

    Returns:
        Unique filename with size suffix and .webp extension
    """
    # Extract base name without extension
    base_name = os.path.splitext(original_filename)[0]
    # Generate unique ID to prevent collisions
    unique_id = uuid.uuid4().hex[:8]
    return f"{base_name}_{unique_id}_{size_name}.webp"


def resize_image(image_file, target_width, target_height, quality=85):
    """
    Resize an image while maintaining aspect ratio and convert to WebP.

    The image is resized to fit within the target dimensions while maintaining
    its aspect ratio, then center-cropped to exactly match the target size.

    Args:
        image_file: Django UploadedFile or file-like object
        target_width: Target width in pixels
        target_height: Target height in pixels
        quality: WebP quality (1-100)

    Returns:
        BytesIO object containing the resized WebP image
    """
    # Open the image
    img = Image.open(image_file)

    # Convert to RGB if necessary (handles PNG with transparency, RGBA, etc.)
    if img.mode in ('RGBA', 'LA', 'P'):
        # Create white background for transparent images
        background = Image.new('RGB', img.size, (255, 255, 255))
        if img.mode == 'P':
            img = img.convert('RGBA')
        background.paste(img, mask=img.split()[-1] if img.mode == 'RGBA' else None)
        img = background
    elif img.mode != 'RGB':
        img = img.convert('RGB')

    # Handle EXIF orientation
    try:
        from PIL import ExifTags
        for orientation in ExifTags.TAGS.keys():
            if ExifTags.TAGS[orientation] == 'Orientation':
                break
        exif = img._getexif()
        if exif is not None:
            orientation_value = exif.get(orientation)
            if orientation_value == 3:
                img = img.rotate(180, expand=True)
            elif orientation_value == 6:
                img = img.rotate(270, expand=True)
            elif orientation_value == 8:
                img = img.rotate(90, expand=True)
    except (AttributeError, KeyError, IndexError):
        # No EXIF data or orientation tag
        pass

    original_width, original_height = img.size
    target_ratio = target_width / target_height
    original_ratio = original_width / original_height

    # Calculate dimensions for resize (cover the target area)
    if original_ratio > target_ratio:
        # Image is wider than target - fit by height
        new_height = target_height
        new_width = int(original_width * (target_height / original_height))
    else:
        # Image is taller than target - fit by width
        new_width = target_width
        new_height = int(original_height * (target_width / original_width))

    # Only resize if image is larger than target
    if new_width < original_width or new_height < original_height:
        img = img.resize((new_width, new_height), Image.Resampling.LANCZOS)
    else:
        new_width, new_height = original_width, original_height

    # Center crop to exact target dimensions
    left = (new_width - target_width) // 2
    top = (new_height - target_height) // 2
    right = left + target_width
    bottom = top + target_height

    # Only crop if necessary
    if left > 0 or top > 0 or right < new_width or bottom < new_height:
        img = img.crop((max(0, left), max(0, top), min(new_width, right), min(new_height, bottom)))

    # Save as WebP
    output = BytesIO()
    img.save(output, format='WEBP', quality=quality, method=6)
    output.seek(0)

    return output


def process_listing_image(image_file, upload_to_base='listings'):
    """
    Process an uploaded listing image into multiple size variants.

    Args:
        image_file: Django UploadedFile object
        upload_to_base: Base directory for uploads (default: 'listings')

    Returns:
        Dict with size names as keys and tuples of (filename, ContentFile) as values
        Example: {'thumb': ('image_abc123_thumb.webp', ContentFile(...)), ...}
    """
    from django.utils import timezone

    results = {}
    original_name = image_file.name if hasattr(image_file, 'name') else 'image'

    # Generate date-based path
    now = timezone.now()
    date_path = now.strftime('%Y/%m/%d')

    for size_name, (width, height, quality) in IMAGE_SIZES.items():
        # Reset file pointer for each resize operation
        if hasattr(image_file, 'seek'):
            image_file.seek(0)

        # Resize the image
        resized_data = resize_image(image_file, width, height, quality)

        # Generate unique filename
        filename = generate_unique_filename(original_name, size_name)
        full_path = f"{upload_to_base}/{date_path}/{filename}"

        # Create ContentFile for Django storage
        content_file = ContentFile(resized_data.read(), name=filename)

        results[size_name] = (full_path, content_file)

    return results


def process_profile_picture(image_file, upload_to_base='profiles'):
    """
    Process an uploaded profile picture into multiple size variants.

    Args:
        image_file: Django UploadedFile object
        upload_to_base: Base directory for uploads (default: 'profiles')

    Returns:
        Dict with size names as keys and tuples of (filename, ContentFile) as values
    """
    results = {}
    original_name = image_file.name if hasattr(image_file, 'name') else 'profile'

    for size_name, (width, height, quality) in PROFILE_SIZES.items():
        # Reset file pointer for each resize operation
        if hasattr(image_file, 'seek'):
            image_file.seek(0)

        # Resize the image
        resized_data = resize_image(image_file, width, height, quality)

        # Generate unique filename
        filename = generate_unique_filename(original_name, size_name)
        full_path = f"{upload_to_base}/{filename}"

        # Create ContentFile for Django storage
        content_file = ContentFile(resized_data.read(), name=filename)

        results[size_name] = (full_path, content_file)

    return results


def delete_image_variants(base_path):
    """
    Delete all size variants of an image.

    Args:
        base_path: The base path of the image (without size suffix)
    """
    from django.core.files.storage import default_storage

    # Extract directory and base filename
    directory = os.path.dirname(base_path)
    filename = os.path.basename(base_path)
    base_name = os.path.splitext(filename)[0]

    # Remove size suffix to get the true base name
    # Filename format: originalname_uniqueid_size.webp
    parts = base_name.rsplit('_', 1)
    if len(parts) > 1 and parts[1] in IMAGE_SIZES:
        base_name = parts[0]

    # Try to delete all size variants
    all_sizes = list(IMAGE_SIZES.keys()) + list(PROFILE_SIZES.keys())
    for size_name in set(all_sizes):
        variant_filename = f"{base_name}_{size_name}.webp"
        variant_path = os.path.join(directory, variant_filename)
        if default_storage.exists(variant_path):
            default_storage.delete(variant_path)
