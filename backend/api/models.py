from django.db import models
from django.contrib.auth.models import User
from django.utils.text import slugify
from django.utils import timezone
from datetime import timedelta


class Province(models.Model):
    """Philippine provinces for location filtering"""
    name = models.CharField(max_length=100, unique=True, help_text="Province name (e.g., Camarines Norte)")
    slug = models.SlugField(unique=True, blank=True, help_text="URL-friendly version (e.g., camarines-norte)")
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
    province = models.ForeignKey(
        Province,
        on_delete=models.CASCADE,
        related_name='municipalities',
        help_text="Parent province"
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
        return f"{self.name}, {self.province.name}"


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

    # Location
    location = models.CharField(max_length=200, help_text="City/Municipality/Barangay")
    barangay = models.CharField(max_length=100, blank=True, help_text="Barangay (optional)")
    island = models.CharField(max_length=100, default='Siquijor')

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
            models.Index(fields=['island', 'status']),
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


class ListingImage(models.Model):
    """Images for listings"""
    listing = models.ForeignKey(
        Listing,
        on_delete=models.CASCADE,
        related_name='images'
    )
    image = models.ImageField(upload_to='listings/%Y/%m/%d/')
    order = models.IntegerField(default=0)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['order', 'uploaded_at']

    def __str__(self):
        return f"Image for {self.listing.title}"


class UserProfile(models.Model):
    """Extended user profile"""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    phone_number = models.CharField(max_length=20, blank=True)
    location = models.CharField(max_length=200, blank=True)
    bio = models.TextField(blank=True)
    profile_picture = models.ImageField(upload_to='profiles/', blank=True)
    verified = models.BooleanField(default=False)

    def __str__(self):
        return f"Profile for {self.user.username}"


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
    barangay = models.CharField(
        max_length=100,
        blank=True,
        help_text="Barangay (optional)"
    )
    is_province_wide = models.BooleanField(
        default=False,
        help_text="Show this announcement in all municipalities within the province"
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
