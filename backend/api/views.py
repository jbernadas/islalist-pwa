import logging

from rest_framework import status, generics, viewsets, filters
from rest_framework.decorators import api_view, permission_classes, action, throttle_classes
from rest_framework.permissions import AllowAny, IsAuthenticated, IsAuthenticatedOrReadOnly
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError
from django.contrib.auth.models import User
from django_filters.rest_framework import DjangoFilterBackend

from .throttles import AuthRateThrottle, PasswordResetRateThrottle

logger = logging.getLogger(__name__)

from .models import (
    Province, Municipality, Barangay, Category, Listing,
    ListingImage, Favorite, Announcement
)
from .serializers import (
    ProvinceSerializer, ProvinceListSerializer, MunicipalitySerializer,
    BarangaySerializer,
    UserSerializer, PublicUserSerializer, UserRegistrationSerializer,
    UserProfileUpdateSerializer, ProfilePictureSerializer,
    CategorySerializer, ListingSerializer, ListingListSerializer,
    AnnouncementSerializer, AnnouncementListSerializer
)
from .permissions import IsEmailVerified


class UserRegistrationView(generics.CreateAPIView):
    """API endpoint for user registration"""
    queryset = User.objects.all()
    serializer_class = UserRegistrationSerializer
    permission_classes = [AllowAny]
    throttle_classes = [AuthRateThrottle]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        # Generate JWT tokens for the new user
        refresh = RefreshToken.for_user(user)

        return Response({
            'user': UserSerializer(user).data,
            'tokens': {
                'refresh': str(refresh),
                'access': str(refresh.access_token),
            }
        }, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_view(request):
    """API endpoint for user logout - blacklists the refresh token"""
    refresh_token = request.data.get('refresh')
    if not refresh_token:
        return Response({
            'error': 'Refresh token is required.'
        }, status=status.HTTP_400_BAD_REQUEST)

    try:
        token = RefreshToken(refresh_token)
        token.blacklist()
        return Response({
            'message': 'Successfully logged out.'
        }, status=status.HTTP_200_OK)
    except TokenError as e:
        logger.warning(f"Invalid token during logout: {e}")
        return Response({
            'error': 'Invalid or expired token.'
        }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT', 'PATCH'])
@permission_classes([IsAuthenticated])
def user_profile_view(request):
    """API endpoint to get and update current user's profile"""
    if request.method == 'GET':
        serializer = UserSerializer(request.user)
        return Response(serializer.data)

    elif request.method in ['PUT', 'PATCH']:
        serializer = UserProfileUpdateSerializer(
            request.user,
            data=request.data,
            partial=(request.method == 'PATCH')
        )
        if serializer.is_valid():
            serializer.save()
            # Return updated user data with phone number
            user_serializer = UserSerializer(request.user)
            return Response(user_serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def upload_profile_picture(request):
    """API endpoint to upload/update profile picture"""
    # Use serializer for validation
    serializer = ProfilePictureSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    image_file = serializer.validated_data['image']

    try:
        # Get or create user profile
        profile = request.user.profile
    except AttributeError:
        # Profile doesn't exist yet, create one
        from .models import UserProfile
        profile, _ = UserProfile.objects.get_or_create(user=request.user)

    # Process and save the profile picture
    profile.set_profile_picture(image_file)

    # Return updated user data
    user_serializer = UserSerializer(request.user)
    return Response(user_serializer.data, status=status.HTTP_200_OK)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_profile_picture(request):
    """API endpoint to delete profile picture"""
    try:
        profile = request.user.profile
    except AttributeError:
        return Response(
            {'error': 'No profile found.'},
            status=status.HTTP_404_NOT_FOUND
        )

    try:
        profile.delete_profile_pictures()
        profile.save()

        # Return updated user data
        user_serializer = UserSerializer(request.user)
        return Response(user_serializer.data, status=status.HTTP_200_OK)
    except OSError as e:
        logger.error(f"Error deleting profile picture files: {e}")
        return Response(
            {'error': 'Failed to delete profile picture.'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([AllowAny])
def public_user_profile_view(request, username):
    """API endpoint to get public user profile by username"""
    try:
        user = User.objects.get(username=username)
        serializer = PublicUserSerializer(user, context={'request': request})
        return Response(serializer.data)
    except User.DoesNotExist:
        return Response(
            {'error': 'User not found.'},
            status=status.HTTP_404_NOT_FOUND
        )


@api_view(['GET'])
@permission_classes([AllowAny])
def public_user_listings_view(request, username):
    """API endpoint to get listings by a specific user"""
    try:
        user = User.objects.get(username=username)
        queryset = Listing.objects.filter(seller=user, status='active').order_by('-created_at')

        from .serializers import ListingListSerializer
        serializer = ListingListSerializer(queryset, many=True, context={'request': request})
        return Response(serializer.data)
    except User.DoesNotExist:
        return Response(
            {'error': 'User not found.'},
            status=status.HTTP_404_NOT_FOUND
        )


@api_view(['GET'])
@permission_classes([AllowAny])
def public_user_announcements_view(request, username):
    """API endpoint to get announcements by a specific user"""
    try:
        user = User.objects.get(username=username)
        queryset = Announcement.objects.filter(author=user, is_active=True).order_by('-created_at')

        from .serializers import AnnouncementListSerializer
        serializer = AnnouncementListSerializer(queryset, many=True, context={'request': request})
        return Response(serializer.data)
    except User.DoesNotExist:
        return Response(
            {'error': 'User not found.'},
            status=status.HTTP_404_NOT_FOUND
        )


class ProvinceViewSet(viewsets.ReadOnlyModelViewSet):
    """API endpoint for viewing provinces"""
    queryset = Province.objects.filter(active=True).prefetch_related('municipalities')
    permission_classes = [AllowAny]
    lookup_field = 'slug'
    pagination_class = None  # Disable pagination - need all provinces for dropdown

    def get_serializer_class(self):
        if self.action == 'list':
            return ProvinceListSerializer
        return ProvinceSerializer

    @action(detail=True, methods=['get'])
    def municipalities(self, request, slug=None):
        """Get all cities/municipalities for a province (excludes SubMun districts)"""
        province = self.get_object()
        # Exclude SubMun types - these are districts within City of Manila, not standalone municipalities
        municipalities = province.municipalities.filter(active=True, type__in=['City', 'Mun']).order_by('name')
        serializer = MunicipalitySerializer(municipalities, many=True)
        return Response(serializer.data)


class MunicipalityViewSet(viewsets.ReadOnlyModelViewSet):
    """API endpoint for viewing cities/municipalities"""
    queryset = Municipality.objects.filter(active=True).select_related('province')
    serializer_class = MunicipalitySerializer
    permission_classes = [AllowAny]
    lookup_field = 'slug'
    pagination_class = None  # Disable pagination - need all municipalities for dropdown
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['province']

    def get_object(self):
        """Override to support lookup by both slug and psgc_code"""
        queryset = self.filter_queryset(self.get_queryset())
        lookup_url_kwarg = self.lookup_url_kwarg or self.lookup_field
        lookup_value = self.kwargs[lookup_url_kwarg]

        # Try to get by slug first
        try:
            obj = queryset.get(slug=lookup_value)
            self.check_object_permissions(self.request, obj)
            return obj
        except Municipality.DoesNotExist:
            pass
        except Municipality.MultipleObjectsReturned:
            # If multiple objects with same slug, try psgc_code
            pass

        # Try to get by psgc_code
        try:
            obj = queryset.get(psgc_code=lookup_value)
            self.check_object_permissions(self.request, obj)
            return obj
        except Municipality.DoesNotExist:
            pass

        # If neither worked, raise 404
        from django.http import Http404
        raise Http404

    @action(detail=True, methods=['get'], url_path='districts-or-barangays')
    def districts_or_barangays(self, request, slug=None):
        """Get districts (for Manila) or barangays (for other municipalities)

        Special handling: City of Manila returns 14 SubMun districts instead of barangays
        """
        municipality = self.get_object()

        # Special case for City of Manila - return SubMun districts
        if municipality.name == "City of Manila" and municipality.province.name == "Metro Manila (NCR)":
            districts = Municipality.objects.filter(
                province=municipality.province,
                type='SubMun',
                active=True
            ).order_by('name')

            # Serialize as municipalities but format like barangays for frontend compatibility
            data = [{
                'id': district.id,
                'name': district.name,
                'slug': district.slug,
                'municipality': municipality.id,
                'municipality_name': municipality.name,
                'active': district.active,
                'is_district': True  # Flag to indicate this is a district, not a barangay
            } for district in districts]

            return Response(data)

        # Regular case - return barangays
        barangays = Barangay.objects.filter(
            municipality=municipality,
            active=True
        ).order_by('name')

        serializer = BarangaySerializer(barangays, many=True, context={'request': request})
        return Response(serializer.data)


class BarangayViewSet(viewsets.ReadOnlyModelViewSet):
    """API endpoint for viewing barangays"""
    queryset = Barangay.objects.filter(active=True).select_related('municipality')
    serializer_class = BarangaySerializer
    permission_classes = [AllowAny]
    lookup_field = 'slug'
    pagination_class = None  # Disable pagination - need all barangays for dropdown
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['municipality']


class CategoryViewSet(viewsets.ReadOnlyModelViewSet):
    """API endpoint for viewing categories"""
    queryset = Category.objects.filter(active=True, parent=None)
    serializer_class = CategorySerializer
    permission_classes = [AllowAny]
    lookup_field = 'slug'


class ListingViewSet(viewsets.ModelViewSet):
    """API endpoint for creating and managing listings"""
    queryset = Listing.objects.filter(status='active')
    permission_classes = [IsAuthenticatedOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    # Province, municipality, barangay are handled in get_queryset() with slug-based filtering
    filterset_fields = ['category', 'property_type', 'status']
    search_fields = ['title', 'description', 'barangay__name', 'municipality__name', 'province__name']
    ordering_fields = ['created_at', 'price', 'views_count']
    ordering = ['-created_at']

    def get_permissions(self):
        """
        Require email verification for create and update actions
        """
        if self.action in ['create', 'update', 'partial_update']:
            return [IsAuthenticated(), IsEmailVerified()]
        return super().get_permissions()

    def get_serializer_class(self):
        if self.action in ['list', 'my_listings', 'favorites']:
            return ListingListSerializer
        return ListingSerializer

    def get_queryset(self):
        from django.db.models import Q
        queryset = super().get_queryset()

        # Filter by price range
        min_price = self.request.query_params.get('min_price')
        max_price = self.request.query_params.get('max_price')

        if min_price:
            queryset = queryset.filter(price__gte=min_price)
        if max_price:
            queryset = queryset.filter(price__lte=max_price)

        # Hierarchical location filtering using PSGC codes
        province_code = self.request.query_params.get('province')
        municipality_code = self.request.query_params.get('municipality')
        barangay_code = self.request.query_params.get('barangay')

        if province_code and municipality_code and barangay_code:
            # Barangay level: Show listings in this barangay, or municipality-wide, or province-wide
            try:
                from api.models import Province, Municipality, Barangay
                province_obj = Province.objects.get(psgc_code=province_code)
                municipality_obj = Municipality.objects.get(psgc_code=municipality_code, province=province_obj)
                barangay_obj = Barangay.objects.get(psgc_code=barangay_code, municipality=municipality_obj)

                queryset = queryset.filter(
                    Q(barangay=barangay_obj) |  # Barangay-specific
                    Q(municipality=municipality_obj, barangay__isnull=True) |  # Municipality-wide
                    Q(province=province_obj, municipality__isnull=True, barangay__isnull=True)  # Province-wide
                )
            except (Province.DoesNotExist, Municipality.DoesNotExist, Barangay.DoesNotExist):
                # If location not found, return empty queryset
                queryset = queryset.none()

        elif province_code and municipality_code:
            # Municipality level: Show listings in this municipality (any barangay) or province-wide
            try:
                from api.models import Province, Municipality
                province_obj = Province.objects.get(psgc_code=province_code)
                municipality_obj = Municipality.objects.get(psgc_code=municipality_code, province=province_obj)

                queryset = queryset.filter(
                    Q(municipality=municipality_obj) |  # Municipality and its barangays
                    Q(province=province_obj, municipality__isnull=True)  # Province-wide
                )
            except (Province.DoesNotExist, Municipality.DoesNotExist):
                queryset = queryset.none()

        elif province_code:
            # Province level: Show all listings in this province
            try:
                from api.models import Province
                province_obj = Province.objects.get(psgc_code=province_code)
                queryset = queryset.filter(province=province_obj)
            except Province.DoesNotExist:
                queryset = queryset.none()

        return queryset

    def perform_create(self, serializer):
        serializer.save(seller=self.request.user)

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        # Increment view count
        instance.views_count += 1
        instance.save(update_fields=['views_count'])
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def my_listings(self, request):
        """Get listings created by the current user"""
        queryset = Listing.objects.filter(seller=request.user).order_by('-created_at')
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def mark_sold(self, request, pk=None):
        """Mark a listing as sold"""
        listing = self.get_object()

        if listing.seller != request.user:
            return Response(
                {'error': 'You can only mark your own listings as sold.'},
                status=status.HTTP_403_FORBIDDEN
            )

        listing.status = 'sold'
        listing.save()

        serializer = self.get_serializer(listing)
        return Response(serializer.data)

    @action(detail=True, methods=['delete'], permission_classes=[IsAuthenticated])
    def delete_image(self, request, pk=None):
        """Delete an image from a listing"""
        listing = self.get_object()

        if listing.seller != request.user:
            return Response(
                {'error': 'You can only delete images from your own listings.'},
                status=status.HTTP_403_FORBIDDEN
            )

        image_id = request.data.get('image_id')
        try:
            image = ListingImage.objects.get(id=image_id, listing=listing)
            image.delete()
            return Response({'message': 'Image deleted successfully.'})
        except ListingImage.DoesNotExist:
            return Response(
                {'error': 'Image not found.'},
                status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def toggle_favorite(self, request, pk=None):
        """Add or remove listing from favorites"""
        listing = self.get_object()
        favorite = Favorite.objects.filter(
            user=request.user,
            listing=listing
        ).first()

        if favorite:
            # Remove from favorites
            favorite.delete()
            return Response({
                'message': 'Removed from favorites',
                'is_favorited': False
            })
        else:
            # Add to favorites
            Favorite.objects.create(user=request.user, listing=listing)
            return Response({
                'message': 'Added to favorites',
                'is_favorited': True
            }, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def favorites(self, request):
        """Get all favorited listings for the current user"""
        favorites = Favorite.objects.filter(
            user=request.user
        ).select_related('listing')
        listings = [fav.listing for fav in favorites]
        serializer = self.get_serializer(listings, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def my_images(self, request):
        """Get all images uploaded by the current user across all their listings"""
        from .serializers import ListingImageSerializer

        images = ListingImage.objects.filter(
            listing__seller=request.user
        ).select_related('listing').order_by('-id')

        serializer = ListingImageSerializer(
            images,
            many=True,
            context={'request': request}
        )
        return Response(serializer.data)


class AnnouncementViewSet(viewsets.ModelViewSet):
    """API endpoint for creating and managing announcements"""
    queryset = Announcement.objects.filter(is_active=True)
    permission_classes = [IsAuthenticatedOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    # Note: province and municipality are handled manually in get_queryset() to support province-wide announcements
    # barangay is now a ForeignKey, so we filter by ID in get_queryset()
    filterset_fields = ['priority', 'announcement_type']
    search_fields = ['title', 'description', 'barangay__name']
    ordering_fields = ['created_at', 'priority', 'expiry_date']
    ordering = ['-priority', '-created_at']

    def get_permissions(self):
        """
        Require email verification for create and update actions
        """
        if self.action in ['create', 'update', 'partial_update']:
            return [IsAuthenticated(), IsEmailVerified()]
        return super().get_permissions()

    def get_serializer_class(self):
        if self.action in ['list', 'my_announcements']:
            return AnnouncementListSerializer
        return AnnouncementSerializer

    def get_queryset(self):
        queryset = super().get_queryset()

        # Option to show expired announcements
        include_expired = self.request.query_params.get('include_expired', 'false')
        if include_expired.lower() != 'true':
            from django.utils import timezone
            # Filter out expired announcements
            queryset = queryset.exclude(
                expiry_date__lt=timezone.now().date()
            )

        # Handle province, municipality, and barangay filtering using PSGC codes
        municipality_code = self.request.query_params.get('municipality')
        province_code = self.request.query_params.get('province')
        barangay_code = self.request.query_params.get('barangay')

        if barangay_code and municipality_code and province_code:
            from django.db.models import Q
            from api.models import Province, Municipality, Barangay
            # Priority-based cascade filtering for barangay level:
            # 1. Direct barangay match (by PSGC code)
            # 2. Municipality-wide with High/Urgent priority
            # 3. Province-wide with Urgent priority only
            try:
                province_obj = Province.objects.get(psgc_code=province_code)
                municipality_obj = Municipality.objects.get(psgc_code=municipality_code, province=province_obj)
                barangay_obj = Barangay.objects.get(psgc_code=barangay_code, municipality=municipality_obj)

                queryset = queryset.filter(
                    Q(barangay=barangay_obj, municipality=municipality_obj, province=province_obj) |
                    Q(is_municipality_wide=True, municipality=municipality_obj, province=province_obj,
                      priority__in=['high', 'urgent']) |
                    Q(is_province_wide=True, province=province_obj, priority='urgent')
                )
            except (Province.DoesNotExist, Municipality.DoesNotExist, Barangay.DoesNotExist):
                # If location not found, return empty queryset
                queryset = queryset.none()
        elif municipality_code and province_code:
            from django.db.models import Q
            from api.models import Province, Municipality
            # HIERARCHICAL VISIBILITY: Municipality view shows:
            # 1. Municipality-wide announcements (municipality FK matches, barangay='')
            # 2. ALL barangay-specific announcements in this municipality (municipality FK matches, barangay set)
            # 3. Province-wide announcements (is_province_wide=True)
            # This naturally includes all barangays because we filter by municipality FK
            try:
                province_obj = Province.objects.get(psgc_code=province_code)
                municipality_obj = Municipality.objects.get(psgc_code=municipality_code, province=province_obj)

                queryset = queryset.filter(
                    Q(municipality=municipality_obj, province=province_obj) |
                    Q(is_province_wide=True, province=province_obj)
                )
            except (Province.DoesNotExist, Municipality.DoesNotExist):
                queryset = queryset.none()
        elif municipality_code and not province_code:
            # Filter by municipality only
            from api.models import Municipality
            try:
                municipality_obj = Municipality.objects.get(psgc_code=municipality_code)
                queryset = queryset.filter(municipality=municipality_obj)
            except Municipality.DoesNotExist:
                queryset = queryset.none()
        elif province_code and not municipality_code:
            # Filter by province only
            from api.models import Province
            try:
                province_obj = Province.objects.get(psgc_code=province_code)
                queryset = queryset.filter(province=province_obj)
            except Province.DoesNotExist:
                queryset = queryset.none()

        return queryset

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def my_announcements(self, request):
        """Get announcements created by the current user"""
        queryset = Announcement.objects.filter(
            author=request.user
        ).order_by('-created_at')
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
