from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Category, Listing, ListingImage, UserProfile


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

    class Meta:
        model = ListingImage
        fields = ['id', 'image', 'image_url', 'order']
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
    category_name = serializers.CharField(source='category.name', read_only=True)
    images = ListingImageSerializer(many=True, read_only=True)
    uploaded_images = serializers.ListField(
        child=serializers.ImageField(),
        write_only=True,
        required=False
    )

    class Meta:
        model = Listing
        fields = [
            'id', 'title', 'description', 'price', 'property_type',
            'area_sqm', 'bedrooms', 'bathrooms', 'category', 'category_name',
            'condition', 'location', 'island', 'seller', 'status',
            'views_count', 'featured', 'created_at', 'updated_at',
            'expires_at', 'images', 'uploaded_images'
        ]
        read_only_fields = ['id', 'seller', 'views_count', 'created_at', 'updated_at']

    def create(self, validated_data):
        uploaded_images = validated_data.pop('uploaded_images', [])
        listing = Listing.objects.create(**validated_data)

        # Create images
        for order, image in enumerate(uploaded_images):
            ListingImage.objects.create(
                listing=listing,
                image=image,
                order=order
            )

        return listing

    def update(self, instance, validated_data):
        uploaded_images = validated_data.pop('uploaded_images', [])

        # Update listing fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # Add new images
        if uploaded_images:
            current_max_order = instance.images.count()
            for order, image in enumerate(uploaded_images):
                ListingImage.objects.create(
                    listing=instance,
                    image=image,
                    order=current_max_order + order
                )

        return instance


class ListingListSerializer(serializers.ModelSerializer):
    """Simplified serializer for listing lists"""
    seller_name = serializers.CharField(source='seller.username', read_only=True)
    category_name = serializers.CharField(source='category.name', read_only=True)
    first_image = serializers.SerializerMethodField()

    class Meta:
        model = Listing
        fields = [
            'id', 'title', 'price', 'property_type', 'location', 'island',
            'category_name', 'seller_name', 'status', 'created_at',
            'first_image', 'bedrooms', 'bathrooms', 'area_sqm'
        ]

    def get_first_image(self, obj):
        request = self.context.get('request')
        first_image = obj.images.first()
        if first_image and first_image.image:
            if request is not None:
                return request.build_absolute_uri(first_image.image.url)
            return first_image.image.url
        return None
