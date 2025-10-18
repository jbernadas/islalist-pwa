from rest_framework import serializers
from django.contrib.auth.models import User
from .models import (
    Province, Municipality, Category, Listing,
    ListingImage, UserProfile, Favorite
)


class MunicipalitySerializer(serializers.ModelSerializer):
    """Serializer for City/Municipality model"""
    province_name = serializers.CharField(source='province.name', read_only=True)

    class Meta:
        model = Municipality
        fields = ['id', 'name', 'slug', 'province', 'province_name', 'active']
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

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name',
            'last_name', 'phone_number'
        ]
        read_only_fields = ['id']


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
            'area_sqm', 'bedrooms', 'bathrooms', 'category', 'category_name',
            'condition', 'location', 'island', 'seller', 'status',
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
            'id', 'title', 'price', 'property_type', 'location', 'island',
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
