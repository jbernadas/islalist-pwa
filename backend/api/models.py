from django.db import models
from django.contrib.auth.models import User
from django.utils.text import slugify
from django.utils import timezone
from datetime import timedelta


class Province(models.Model):
    """Philippine provinces for location filtering"""
    name = models.CharField(max_length=100, unique=True, help_text="Province name (e.g., Camarines Norte)")
    slug = models.SlugField(unique=True, blank=True, help_text="URL-friendly version (e.g., camarines-norte)")
    psgc_code = models.CharField(
        max_length=20,
        unique=True,
        null=True,
        blank=True,
        help_text="10-digit PSGC code"
    )
    active = models.BooleanField(default=True, help_text="Show in province listings")
    featured = models.BooleanField(default=False, help_text="Highlight on homepage")
    description = models.TextField(blank=True, help_text="Province description")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']
        verbose_name = "Province"
        verbose_name_plural = "Provinces"

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class Municipality(models.Model):
    """Cities and municipalities within provinces"""
    name = models.CharField(max_length=100, help_text="City/Municipality name (e.g., Daet, Cebu City)")
    slug = models.SlugField(help_text="URL-friendly version (e.g., daet, cebu-city)")
    psgc_code = models.CharField(
        max_length=20,
        unique=True,
        null=True,
        blank=True,
        help_text="10-digit PSGC code"
    )
    province = models.ForeignKey(
        Province,
        on_delete=models.CASCADE,
        related_name='municipalities',
        help_text="Parent province"
    )
    type = models.CharField(
        max_length=6,
        choices=[('City', 'City'), ('Mun', 'Municipality'), ('SubMun', 'Sub-Municipality')],
        default='Mun',
        help_text="Designation: City, Municipality, or Sub-Municipality (Manila districts)"
    )
    active = models.BooleanField(default=True, help_text="Show in city/municipality listings")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']
        verbose_name = "City/Municipality"
        verbose_name_plural = "Cities/Municipalities"
        unique_together = ['province', 'slug']

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class Barangay(models.Model):
    """Barangays within cities/municipalities"""
    name = models.CharField(max_length=100, help_text="Barangay name")
    slug = models.SlugField(help_text="URL-friendly version", max_length=150)
    psgc_code = models.CharField(
        max_length=20,
        unique=True,
        null=True,
        blank=True,
        help_text="10-digit PSGC code"
    )
    municipality = models.ForeignKey(
        Municipality,
        on_delete=models.CASCADE,
        related_name='barangays',
        help_text="Parent city/municipality"
    )
    active = models.BooleanField(default=True, help_text="Show in barangay listings")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']
        verbose_name = "Barangay"
        verbose_name_plural = "Barangays"
        # Removed unique_together constraint to allow duplicate barangay names
        # within same municipality (as exists in official PSGC data)

    def save(self, *args, **kwargs):
        if not self.slug:
            # Create unique slug by combining name and checking for duplicates
            base_slug = slugify(self.name)
            slug = base_slug
            counter = 1
            while Barangay.objects.filter(
                municipality=self.municipality,
                slug=slug
            ).exclude(pk=self.pk).exists():
                slug = f"{base_slug}-{counter}"
                counter += 1
            self.slug = slug
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class Category(models.Model):
    """Categories for marketplace listings"""
    name = models.CharField(max_length=100)
    slug = models.SlugField(unique=True, blank=True)
    description = models.TextField(blank=True)
    icon = models.CharField(max_length=50, blank=True, help_text="Icon name or emoji")
    parent = models.ForeignKey(
        'self',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='subcategories'
    )
    active = models.BooleanField(default=True)
    order = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name_plural = "Categories"
        ordering = ['order', 'name']

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class Listing(models.Model):
    """Marketplace listing for items, properties, or services"""

    CONDITION_CHOICES = [
        ('new', 'New'),
        ('like_new', 'Like New'),
        ('good', 'Good'),
        ('fair', 'Fair'),
        ('for_parts', 'For Parts'),
        ('not_applicable', 'Not Applicable'),
    ]

    STATUS_CHOICES = [
        ('active', 'Active'),
        ('sold', 'Sold'),
        ('expired', 'Expired'),
        ('hidden', 'Hidden'),
    ]

    PROPERTY_TYPE_CHOICES = [
        ('house', 'House'),
        ('land', 'Land'),
        ('apartment', 'Apartment'),
        ('commercial', 'Commercial'),
        ('condo', 'Condominium'),
    ]

    PAY_PERIOD_CHOICES = [
        ('per_day', 'Per Day'),
        ('monthly', 'Monthly'),
        ('quarterly', 'Quarterly'),
        ('not_applicable', 'Not Applicable'),
    ]

    VEHICLE_TYPE_CHOICES = [
        ('car', 'Car'),
        ('motorcycle', 'Motorcycle'),
        ('truck', 'Truck'),
        ('van', 'Van'),
        ('suv', 'SUV'),
        ('bus', 'Bus'),
        ('boat', 'Boat'),
        ('other', 'Other'),
    ]

    TRANSMISSION_CHOICES = [
        ('manual', 'Manual'),
        ('automatic', 'Automatic'),
        ('cvt', 'CVT'),
        ('not_applicable', 'Not Applicable'),
    ]

    FUEL_TYPE_CHOICES = [
        ('gasoline', 'Gasoline'),
        ('diesel', 'Diesel'),
        ('electric', 'Electric'),
        ('hybrid', 'Hybrid'),
        ('not_applicable', 'Not Applicable'),
    ]

    VEHICLE_CONDITION_CHOICES = [
        ('brand_new', 'Brand New'),
        ('like_new', 'Like New'),
        ('used_excellent', 'Used - Excellent'),
        ('used_good', 'Used - Good'),
        ('used_fair', 'Used - Fair'),
        ('for_parts', 'For Parts'),
    ]

    # Basic Information
    title = models.CharField(max_length=200)
    description = models.TextField()
    price = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Leave blank for 'Contact for price'"
    )

    # Real Estate Specific Fields
    property_type = models.CharField(
        max_length=20,
        choices=PROPERTY_TYPE_CHOICES,
        null=True,
        blank=True
    )
    area_sqm = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Area in square meters"
    )
    bedrooms = models.IntegerField(null=True, blank=True)
    bathrooms = models.IntegerField(null=True, blank=True)

    # Job Specific Fields
    pay_period = models.CharField(
        max_length=20,
        choices=PAY_PERIOD_CHOICES,
        null=True,
        blank=True,
        default='not_applicable',
        help_text="Pay period for job listings"
    )

    # Vehicle Specific Fields
    vehicle_type = models.CharField(
        max_length=20,
        choices=VEHICLE_TYPE_CHOICES,
        null=True,
        blank=True,
        help_text="Type of vehicle"
    )
    vehicle_year = models.IntegerField(
        null=True,
        blank=True,
        help_text="Manufacturing year"
    )
    vehicle_make = models.CharField(
        max_length=100,
        null=True,
        blank=True,
        help_text="Vehicle make/brand (e.g., Toyota, Honda)"
    )
    vehicle_model = models.CharField(
        max_length=100,
        null=True,
        blank=True,
        help_text="Vehicle model (e.g., Vios, City)"
    )
    vehicle_mileage = models.IntegerField(
        null=True,
        blank=True,
        help_text="Odometer reading in kilometers"
    )
    vehicle_transmission = models.CharField(
        max_length=20,
        choices=TRANSMISSION_CHOICES,
        null=True,
        blank=True,
        help_text="Transmission type"
    )
    vehicle_fuel_type = models.CharField(
        max_length=20,
        choices=FUEL_TYPE_CHOICES,
        null=True,
        blank=True,
        help_text="Fuel type"
    )
    vehicle_condition = models.CharField(
        max_length=20,
        choices=VEHICLE_CONDITION_CHOICES,
        null=True,
        blank=True,
        help_text="Vehicle condition (used when category is Vehicle)"
    )

    # Categorization
    category = models.ForeignKey(
        Category,
        on_delete=models.PROTECT,
        related_name='listings'
    )
    condition = models.CharField(
        max_length=20,
        choices=CONDITION_CHOICES,
        default='not_applicable'
    )

    # Location - Philippine Administrative Hierarchy
    province = models.ForeignKey(
        Province,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='listings',
        help_text="Province"
    )
    municipality = models.ForeignKey(
        Municipality,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='listings',
        help_text="City/Municipality"
    )
    barangay = models.ForeignKey(
        'Barangay',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='listings',
        help_text="Barangay (optional)"
    )

    # User and Status
    seller = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='listings'
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='active'
    )

    # Tracking
    views_count = models.IntegerField(default=0)
    featured = models.BooleanField(default=False)

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    expires_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status', '-created_at']),
            models.Index(fields=['category', 'status']),
            models.Index(fields=['province', 'status']),
            models.Index(fields=['municipality', 'status']),
        ]

    def save(self, *args, **kwargs):
        # Set expiration date if not set (60 days from creation)
        if not self.expires_at:
            self.expires_at = timezone.now() + timedelta(days=60)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.title

    def is_expired(self):
        return timezone.now() > self.expires_at if self.expires_at else False

    @property
    def location_display(self):
        """
        Returns a properly formatted location string based on the administrative hierarchy.

        Format:
        - If barangay exists: "Barangay, Municipality, Province"
        - If only municipality: "Municipality, Province"
        - If only province: "Province"
        - Otherwise: "Location not specified"
        """
        parts = []

        if self.barangay:
            parts.append(self.barangay.name)
            parts.append(self.municipality.name if self.municipality else self.barangay.municipality.name)
            parts.append(self.province.name if self.province else self.barangay.municipality.province.name)
        elif self.municipality:
            parts.append(self.municipality.name)
            parts.append(self.province.name if self.province else self.municipality.province.name)
        elif self.province:
            parts.append(self.province.name)

        return ', '.join(parts) if parts else 'Location not specified'


class ListingImage(models.Model):
    """Images for listings with multiple size variants in WebP format"""
    listing = models.ForeignKey(
        Listing,
        on_delete=models.CASCADE,
        related_name='images'
    )
    # Size variants - all stored as WebP
    image_thumb = models.ImageField(
        upload_to='listings/%Y/%m/%d/',
        blank=True,
        help_text="Thumbnail (150x100)"
    )
    image_small = models.ImageField(
        upload_to='listings/%Y/%m/%d/',
        blank=True,
        help_text="Small (300x200) - mobile cards"
    )
    image_medium = models.ImageField(
        upload_to='listings/%Y/%m/%d/',
        blank=True,
        help_text="Medium (500x333) - desktop cards"
    )
    image_large = models.ImageField(
        upload_to='listings/%Y/%m/%d/',
        blank=True,
        help_text="Large (1200x800) - detail page"
    )
    image_xlarge = models.ImageField(
        upload_to='listings/%Y/%m/%d/',
        blank=True,
        help_text="Extra large (1920x1280) - desktop lightbox"
    )
    order = models.IntegerField(default=0)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['order', 'uploaded_at']

    def __str__(self):
        return f"Image for {self.listing.title}"

    def delete(self, *args, **kwargs):
        """Delete all image files when model instance is deleted"""
        # Delete all size variant files
        for field_name in ['image_thumb', 'image_small', 'image_medium', 'image_large', 'image_xlarge']:
            image_field = getattr(self, field_name, None)
            if image_field and image_field.name:
                image_field.delete(save=False)
        super().delete(*args, **kwargs)

    @classmethod
    def create_from_upload(cls, listing, image_file, order=0):
        """
        Create a ListingImage with all size variants from an uploaded file.

        Args:
            listing: Listing instance to associate with
            image_file: Uploaded image file
            order: Display order for the image

        Returns:
            ListingImage instance with all size variants
        """
        from .utils import process_listing_image

        instance = cls(listing=listing, order=order)

        # Process image into all size variants
        variants = process_listing_image(image_file)

        # Save each variant to the corresponding field
        for size_name, (path, content_file) in variants.items():
            field_name = f'image_{size_name}'
            field = getattr(instance, field_name, None)
            if field is not None:
                field.save(content_file.name, content_file, save=False)

        instance.save()
        return instance


class UserProfile(models.Model):
    """Extended user profile with multiple profile picture size variants"""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    phone_number = models.CharField(max_length=20, blank=True)
    location = models.CharField(max_length=200, blank=True)
    bio = models.TextField(blank=True)
    # Profile picture size variants - all stored as WebP
    profile_picture_thumb = models.ImageField(
        upload_to='profiles/',
        blank=True,
        help_text="Thumbnail (100x100)"
    )
    profile_picture_small = models.ImageField(
        upload_to='profiles/',
        blank=True,
        help_text="Small (200x200) - standard avatar"
    )
    profile_picture_medium = models.ImageField(
        upload_to='profiles/',
        blank=True,
        help_text="Medium (400x400) - profile page"
    )
    verified = models.BooleanField(default=False)

    def __str__(self):
        return f"Profile for {self.user.username}"

    def delete_profile_pictures(self):
        """Delete all profile picture files"""
        for field_name in ['profile_picture_thumb', 'profile_picture_small', 'profile_picture_medium']:
            image_field = getattr(self, field_name, None)
            if image_field and image_field.name:
                image_field.delete(save=False)

    def set_profile_picture(self, image_file):
        """
        Set profile picture with all size variants from an uploaded file.

        Args:
            image_file: Uploaded image file
        """
        from .utils import process_profile_picture

        # Delete existing profile pictures
        self.delete_profile_pictures()

        # Process image into all size variants
        variants = process_profile_picture(image_file)

        # Save each variant to the corresponding field
        for size_name, (path, content_file) in variants.items():
            field_name = f'profile_picture_{size_name}'
            field = getattr(self, field_name, None)
            if field is not None:
                field.save(content_file.name, content_file, save=False)

        self.save()


class Favorite(models.Model):
    """User favorites/bookmarks for listings"""
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='favorites'
    )
    listing = models.ForeignKey(
        Listing,
        on_delete=models.CASCADE,
        related_name='favorited_by'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['user', 'listing']
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.username} favorited {self.listing.title}"


class Announcement(models.Model):
    """Community announcements and notices"""

    PRIORITY_CHOICES = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('urgent', 'Urgent'),
    ]

    TYPE_CHOICES = [
        ('general', 'General'),
        ('government', 'Government'),
        ('community', 'Community'),
        ('alert', 'Alert'),
        ('infrastructure', 'Infrastructure'),
        ('safety', 'Safety'),
        ('health', 'Health'),
        ('business', 'Business'),
    ]

    # Basic Information
    title = models.CharField(max_length=200)
    description = models.TextField()

    # Classification
    priority = models.CharField(
        max_length=20,
        choices=PRIORITY_CHOICES,
        default='medium'
    )
    announcement_type = models.CharField(
        max_length=50,
        choices=TYPE_CHOICES,
        default='general'
    )

    # Location
    province = models.ForeignKey(
        Province,
        on_delete=models.CASCADE,
        related_name='announcements'
    )
    municipality = models.ForeignKey(
        Municipality,
        on_delete=models.CASCADE,
        related_name='announcements'
    )
    barangay = models.ForeignKey(
        'Barangay',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='announcements',
        help_text="Barangay (optional)"
    )
    is_province_wide = models.BooleanField(
        default=False,
        help_text="Show this announcement in all municipalities within the province"
    )
    is_municipality_wide = models.BooleanField(
        default=False,
        help_text="Show this announcement in all barangays within the municipality"
    )

    # Author and Contact
    author = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='announcements'
    )
    contact_info = models.CharField(
        max_length=200,
        blank=True,
        help_text="Contact information for inquiries"
    )

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    expiry_date = models.DateField(
        null=True,
        blank=True,
        help_text="When announcement is no longer relevant"
    )

    # Status
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['-priority', '-created_at']
        indexes = [
            models.Index(fields=['province', 'municipality', '-created_at']),
            models.Index(fields=['priority', '-created_at']),
            models.Index(fields=['announcement_type']),
        ]

    def __str__(self):
        return self.title

    def is_expired(self):
        """Check if announcement has expired"""
        if not self.expiry_date:
            return False
        return timezone.now().date() > self.expiry_date
