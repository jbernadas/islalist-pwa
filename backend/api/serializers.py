from rest_framework import serializers
from django.contrib.auth.models import User
from dj_rest_auth.registration.serializers import RegisterSerializer
from .models import (
    Province, Municipality, Barangay, Category, Listing,
    ListingImage, UserProfile, Favorite, Announcement
)


class BarangaySerializer(serializers.ModelSerializer):
    """Serializer for Barangay model"""
    municipality_name = serializers.CharField(source='municipality.name', read_only=True)

    class Meta:
        model = Barangay
        fields = ['id', 'name', 'slug', 'psgc_code', 'municipality', 'municipality_name', 'active']
        read_only_fields = ['id', 'slug']


class MunicipalitySerializer(serializers.ModelSerializer):
    """Serializer for City/Municipality model"""
    province_name = serializers.CharField(source='province.name', read_only=True)

    class Meta:
        model = Municipality
        fields = ['id', 'name', 'slug', 'province', 'province_name', 'type', 'active']
        read_only_fields = ['id', 'slug']


class ProvinceSerializer(serializers.ModelSerializer):
    """Serializer for Province model with cities/municipalities"""
    municipalities = MunicipalitySerializer(many=True, read_only=True)
    municipality_count = serializers.SerializerMethodField()

    class Meta:
        model = Province
        fields = [
            'id', 'name', 'slug', 'active', 'featured',
            'description', 'municipalities', 'municipality_count'
        ]
        read_only_fields = ['id', 'slug']

    def get_municipality_count(self, obj):
        return obj.municipalities.filter(active=True).count()


class ProvinceListSerializer(serializers.ModelSerializer):
    """Simplified serializer for province lists (no cities/municipalities)"""
    municipality_count = serializers.SerializerMethodField()

    class Meta:
        model = Province
        fields = ['id', 'name', 'slug', 'municipality_count']

    def get_municipality_count(self, obj):
        return obj.municipalities.filter(active=True).count()


class UserSerializer(serializers.ModelSerializer):
    """Serializer for User model with profile data"""
    phone_number = serializers.CharField(
        source='profile.phone_number',
        read_only=True,
        allow_null=True
    )
    email_verified = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name',
            'last_name', 'phone_number', 'email_verified'
        ]
        read_only_fields = ['id', 'email_verified']

    def get_email_verified(self, obj):
        """Check if user's email is verified via allauth"""
        return obj.emailaddress_set.filter(
            email=obj.email,
            verified=True
        ).exists()


class CustomRegisterSerializer(RegisterSerializer):
    """Custom registration serializer for dj-rest-auth with additional fields"""
    first_name = serializers.CharField(required=True, max_length=150)
    last_name = serializers.CharField(required=True, max_length=150)
    phone_number = serializers.CharField(required=False, allow_blank=True, max_length=20)

    def __init__(self, *args, **kwargs):
        """Map password fields before initialization"""
        if 'data' in kwargs:
            data = kwargs['data'].copy() if hasattr(kwargs['data'], 'copy') else dict(kwargs['data'])
            # Map frontend field names to dj-rest-auth expected names
            if 'password' in data:
                data['password1'] = data.get('password')
            if 'password_confirm' in data:
                data['password2'] = data.get('password_confirm')
            kwargs['data'] = data
        super().__init__(*args, **kwargs)

    def validate_phone_number(self, value):
        """Validate and format Philippine phone numbers"""
        if not value:
            return value

        # Remove spaces, dashes, and other common separators
        cleaned = ''.join(filter(str.isdigit, value))

        # Convert international format (63) to local format (0)
        if cleaned.startswith('63') and len(cleaned) == 12:
            cleaned = '0' + cleaned[2:]

        # Validate format: must be 11 digits starting with 0
        if cleaned and (len(cleaned) != 11 or not cleaned.startswith('0')):
            raise serializers.ValidationError(
                "Phone number must be 11 digits starting with 0 (e.g., 09681234567)"
            )

        return cleaned

    def get_cleaned_data(self):
        """Override to include custom fields in cleaned data"""
        data = super().get_cleaned_data()
        data['first_name'] = self.validated_data.get('first_name', '')
        data['last_name'] = self.validated_data.get('last_name', '')
        data['phone_number'] = self.validated_data.get('phone_number', '')
        return data

    def custom_signup(self, request, user):
        """Called after user is created to set additional fields"""
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"custom_signup called for user: {user.username}")

        user.first_name = self.validated_data.get('first_name', '')
        user.last_name = self.validated_data.get('last_name', '')
        user.save()

        # Create user profile with phone number
        phone_number = self.validated_data.get('phone_number', '')
        UserProfile.objects.get_or_create(
            user=user,
            defaults={'phone_number': phone_number}
        )
        logger.info(f"User profile created with phone: {phone_number}")


class UserRegistrationSerializer(serializers.ModelSerializer):
    """Serializer for user registration"""
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True, min_length=8)
    phone_number = serializers.CharField(required=False, allow_blank=True, max_length=20)

    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'password_confirm',
                  'first_name', 'last_name', 'phone_number']

    def validate_phone_number(self, value):
        """Validate and format Philippine phone numbers"""
        if not value:
            return value

        # Remove spaces, dashes, and other common separators
        cleaned = ''.join(filter(str.isdigit, value))

        # Convert international format (63) to local format (0)
        if cleaned.startswith('63') and len(cleaned) == 12:
            cleaned = '0' + cleaned[2:]

        # Validate format: must be 11 digits starting with 0
        if cleaned and (len(cleaned) != 11 or not cleaned.startswith('0')):
            raise serializers.ValidationError(
                "Phone number must be 11 digits starting with 0 (e.g., 09681234567)"
            )

        return cleaned

    def validate(self, data):
        if data['password'] != data['password_confirm']:
            raise serializers.ValidationError(
                {"password": "Passwords do not match."}
            )
        return data

    def create(self, validated_data):
        phone_number = validated_data.pop('phone_number', '')
        validated_data.pop('password_confirm')
        user = User.objects.create_user(**validated_data)

        # Create user profile with phone number
        UserProfile.objects.create(user=user, phone_number=phone_number)

        return user


class UserProfileUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating user profile"""
    phone_number = serializers.CharField(
        required=False,
        allow_blank=True,
        max_length=20
    )

    class Meta:
        model = User
        fields = ['first_name', 'last_name', 'email', 'phone_number']

    def validate_phone_number(self, value):
        """Validate and format Philippine phone numbers"""
        if not value:
            return value

        # Remove spaces, dashes, and other common separators
        cleaned = ''.join(filter(str.isdigit, value))

        # Convert international format (63) to local format (0)
        if cleaned.startswith('63') and len(cleaned) == 12:
            cleaned = '0' + cleaned[2:]

        # Validate format: must be 11 digits starting with 0
        if cleaned and (len(cleaned) != 11 or not cleaned.startswith('0')):
            raise serializers.ValidationError(
                "Phone number must be 11 digits starting with 0"
            )

        return cleaned

    def update(self, instance, validated_data):
        phone_number = validated_data.pop('phone_number', None)

        # Update user fields
        instance.first_name = validated_data.get(
            'first_name', instance.first_name
        )
        instance.last_name = validated_data.get(
            'last_name', instance.last_name
        )
        instance.email = validated_data.get('email', instance.email)
        instance.save()

        # Update or create profile with phone number
        if phone_number is not None:
            profile, created = UserProfile.objects.get_or_create(
                user=instance
            )
            profile.phone_number = phone_number
            profile.save()

        return instance


class CategorySerializer(serializers.ModelSerializer):
    """Serializer for Category model"""
    subcategories = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = ['id', 'name', 'slug', 'description', 'icon', 'parent', 'subcategories', 'active']
        read_only_fields = ['id', 'slug']

    def get_subcategories(self, obj):
        if obj.subcategories.exists():
            return CategorySerializer(obj.subcategories.filter(active=True), many=True).data
        return []


class ListingImageSerializer(serializers.ModelSerializer):
    """Serializer for Listing images"""
    image_url = serializers.SerializerMethodField()
    listing_title = serializers.CharField(
        source='listing.title',
        read_only=True
    )
    listing_id = serializers.IntegerField(
        source='listing.id',
        read_only=True
    )

    class Meta:
        model = ListingImage
        fields = [
            'id', 'image', 'image_url', 'order',
            'listing_title', 'listing_id'
        ]
        read_only_fields = ['id']

    def get_image_url(self, obj):
        request = self.context.get('request')
        if obj.image and hasattr(obj.image, 'url'):
            if request is not None:
                return request.build_absolute_uri(obj.image.url)
            return obj.image.url
        return None


class ListingSerializer(serializers.ModelSerializer):
    """Serializer for Listing model"""
    seller = UserSerializer(read_only=True)
    category_name = serializers.CharField(
        source='category.name',
        read_only=True
    )
    images = ListingImageSerializer(many=True, read_only=True)
    uploaded_images = serializers.ListField(
        child=serializers.ImageField(),
        write_only=True,
        required=False
    )
    reused_image_ids = serializers.ListField(
        child=serializers.IntegerField(),
        write_only=True,
        required=False
    )
    is_favorited = serializers.SerializerMethodField()

    class Meta:
        model = Listing
        fields = [
            'id', 'title', 'description', 'price', 'property_type',
            'area_sqm', 'bedrooms', 'bathrooms', 'pay_period',
            'vehicle_type', 'vehicle_year', 'vehicle_make', 'vehicle_model',
            'vehicle_mileage', 'vehicle_transmission', 'vehicle_fuel_type', 'vehicle_condition',
            'category', 'category_name',
            'condition', 'location', 'barangay', 'island', 'seller', 'status',
            'views_count', 'featured', 'created_at', 'updated_at',
            'expires_at', 'images', 'uploaded_images', 'reused_image_ids',
            'is_favorited'
        ]
        read_only_fields = [
            'id', 'seller', 'views_count', 'created_at',
            'updated_at', 'is_favorited'
        ]

    def get_is_favorited(self, obj):
        """Check if current user has favorited this listing"""
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return Favorite.objects.filter(
                user=request.user,
                listing=obj
            ).exists()
        return False

    def create(self, validated_data):
        uploaded_images = validated_data.pop('uploaded_images', [])
        reused_image_ids = validated_data.pop('reused_image_ids', [])
        listing = Listing.objects.create(**validated_data)

        order = 0

        # Add reused images first
        for image_id in reused_image_ids:
            try:
                original_image = ListingImage.objects.get(id=image_id)
                # Create new ListingImage with same file
                ListingImage.objects.create(
                    listing=listing,
                    image=original_image.image.name,
                    order=order
                )
                order += 1
            except ListingImage.DoesNotExist:
                continue

        # Then add new uploaded images
        for image in uploaded_images:
            ListingImage.objects.create(
                listing=listing,
                image=image,
                order=order
            )
            order += 1

        return listing

    def update(self, instance, validated_data):
        uploaded_images = validated_data.pop('uploaded_images', [])
        reused_image_ids = validated_data.pop('reused_image_ids', [])

        # Update listing fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        current_max_order = instance.images.count()

        # Add reused images
        for image_id in reused_image_ids:
            try:
                original_image = ListingImage.objects.get(id=image_id)
                # Create new ListingImage with same file
                ListingImage.objects.create(
                    listing=instance,
                    image=original_image.image.name,
                    order=current_max_order
                )
                current_max_order += 1
            except ListingImage.DoesNotExist:
                continue

        # Add new uploaded images
        for image in uploaded_images:
            ListingImage.objects.create(
                listing=instance,
                image=image,
                order=current_max_order
            )
            current_max_order += 1

        return instance


class ListingListSerializer(serializers.ModelSerializer):
    """Simplified serializer for listing lists"""
    seller_name = serializers.CharField(
        source='seller.username',
        read_only=True
    )
    category_name = serializers.CharField(
        source='category.name',
        read_only=True
    )
    first_image = serializers.SerializerMethodField()
    is_favorited = serializers.SerializerMethodField()

    class Meta:
        model = Listing
        fields = [
            'id', 'title', 'price', 'property_type', 'pay_period',
            'vehicle_type', 'vehicle_year', 'vehicle_make', 'vehicle_model',
            'location', 'barangay', 'island',
            'category_name', 'seller_name', 'status', 'created_at',
            'first_image', 'bedrooms', 'bathrooms', 'area_sqm',
            'is_favorited'
        ]

    def get_first_image(self, obj):
        request = self.context.get('request')
        first_image = obj.images.first()
        if first_image and first_image.image:
            if request is not None:
                return request.build_absolute_uri(first_image.image.url)
            return first_image.image.url
        return None

    def get_is_favorited(self, obj):
        """Check if current user has favorited this listing"""
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return Favorite.objects.filter(
                user=request.user,
                listing=obj
            ).exists()
        return False

class AnnouncementSerializer(serializers.ModelSerializer):
    """Serializer for Announcement model"""
    author = UserSerializer(read_only=True)
    province_name = serializers.CharField(
        source='province.name',
        read_only=True
    )
    municipality_name = serializers.CharField(
        source='municipality.name',
        read_only=True
    )
    is_expired = serializers.SerializerMethodField()

    class Meta:
        model = Announcement
        fields = [
            'id', 'title', 'description', 'priority', 'announcement_type',
            'province', 'province_name', 'municipality', 'municipality_name',
            'barangay', 'is_province_wide', 'is_municipality_wide', 'author', 'contact_info', 'created_at', 'updated_at',
            'expiry_date', 'is_active', 'is_expired'
        ]
        read_only_fields = ['id', 'author', 'created_at', 'updated_at']

    def get_is_expired(self, obj):
        """Check if announcement has expired"""
        return obj.is_expired()


class AnnouncementListSerializer(serializers.ModelSerializer):
    """Simplified serializer for announcement lists"""
    author_name = serializers.CharField(
        source='author.username',
        read_only=True
    )
    province_name = serializers.CharField(
        source='province.name',
        read_only=True
    )
    municipality_name = serializers.CharField(
        source='municipality.name',
        read_only=True
    )
    is_expired = serializers.SerializerMethodField()

    class Meta:
        model = Announcement
        fields = [
            'id', 'title', 'description', 'priority', 'announcement_type',
            'province_name', 'municipality_name', 'barangay',
            'author_name', 'contact_info', 'created_at', 'expiry_date',
            'is_active', 'is_expired'
        ]

    def get_is_expired(self, obj):
        """Check if announcement has expired"""
        return obj.is_expired()
