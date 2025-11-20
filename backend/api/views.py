from rest_framework import status, generics, viewsets, filters
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.permissions import AllowAny, IsAuthenticated, IsAuthenticatedOrReadOnly
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth.models import User
from django_filters.rest_framework import DjangoFilterBackend

from .models import (
    Province, Municipality, Barangay, Category, Listing,
    ListingImage, Favorite, Announcement
)
from .serializers import (
    ProvinceSerializer, ProvinceListSerializer, MunicipalitySerializer,
    BarangaySerializer,
    UserSerializer, UserRegistrationSerializer,
    UserProfileUpdateSerializer,
    CategorySerializer, ListingSerializer, ListingListSerializer,
    AnnouncementSerializer, AnnouncementListSerializer
)
from .permissions import IsEmailVerified


class UserRegistrationView(generics.CreateAPIView):
    """API endpoint for user registration"""
    queryset = User.objects.all()
    serializer_class = UserRegistrationSerializer
    permission_classes = [AllowAny]

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
    try:
        refresh_token = request.data.get('refresh')
        if refresh_token:
            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response({
                'message': 'Successfully logged out.'
            }, status=status.HTTP_200_OK)
        else:
            return Response({
                'error': 'Refresh token is required.'
            }, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        return Response({
            'error': str(e)
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
        """Get all cities/municipalities for a province"""
        province = self.get_object()
        municipalities = province.municipalities.filter(active=True)
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
    # Removed 'island' from filterset_fields to handle it with case-insensitive matching in get_queryset()
    # barangay is now a ForeignKey, so we filter by ID in get_queryset()
    filterset_fields = ['category', 'property_type', 'location', 'status']
    search_fields = ['title', 'description', 'location', 'barangay__name']
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

        # Filter by island/province (accepts both name and slug format)
        island = self.request.query_params.get('island')
        if island:
            # Try to match by province name first (case-insensitive)
            # If the parameter looks like a slug (contains hyphens), also try to find the province by slug
            if '-' in island:
                # Looks like a slug format (e.g., "davao-del-norte")
                # Try to get the actual province name from the Province model
                try:
                    from api.models import Province
                    province = Province.objects.get(slug__iexact=island)
                    # Use the actual province name for filtering
                    queryset = queryset.filter(island__iexact=province.name)
                except Province.DoesNotExist:
                    # Slug not found, fall back to direct matching
                    queryset = queryset.filter(island__iexact=island)
            else:
                # Looks like a province name (e.g., "Davao del Norte")
                queryset = queryset.filter(island__iexact=island)

        # Filter by price range
        min_price = self.request.query_params.get('min_price')
        max_price = self.request.query_params.get('max_price')

        if min_price:
            queryset = queryset.filter(price__gte=min_price)
        if max_price:
            queryset = queryset.filter(price__lte=max_price)

        # Filter by municipality and barangay (case-insensitive, partial match in location field)
        municipality = self.request.query_params.get('municipality')
        province_param = self.request.query_params.get('province')
        barangay = self.request.query_params.get('barangay')

        if barangay and municipality and province_param:
            # Priority-based cascade filtering for barangay level:
            # For listings, we show ALL listings in the barangay since listings don't have priority
            # This includes: barangay-specific OR municipality-level OR province-wide
            # barangay parameter is now expected to be an ID
            municipality_formatted = municipality.replace('-', ' ').title()
            province_formatted = province_param.replace('-', ' ').title()

            try:
                barangay_id = int(barangay)
                queryset = queryset.filter(
                    Q(barangay_id=barangay_id) |
                    Q(barangay__isnull=True, location__icontains=municipality_formatted) |
                    Q(is_province_wide=True, island__iexact=province_formatted)
                )
            except (ValueError, TypeError):
                # If barangay is not a valid ID, filter only municipality and province-wide
                queryset = queryset.filter(
                    Q(barangay__isnull=True, location__icontains=municipality_formatted) |
                    Q(is_province_wide=True, island__iexact=province_formatted)
                )
        elif municipality:
            # Convert URL slug format to title case (e.g., 'san-juan' -> 'San Juan')
            municipality_formatted = municipality.replace('-', ' ').title()

            # HIERARCHICAL VISIBILITY: Municipality view shows:
            # 1. Listings with location matching municipality (municipality-wide)
            # 2. Listings with barangay field set (barangay-specific within this municipality)
            # 3. Province-wide listings (location matching province name)

            if province_param:
                province_formatted = province_param.replace('-', ' ').title()

                # Get all barangays for this municipality to include barangay-specific listings
                try:
                    from api.models import Municipality as MunicipalityModel
                    municipality_obj = MunicipalityModel.objects.get(slug=municipality)

                    # Build query: municipality-wide OR any barangay in this municipality OR province-wide
                    # With FK, we can filter by municipality relationship directly
                    query = Q(location__icontains=municipality_formatted, barangay__isnull=True)

                    # Add all barangays in this municipality
                    query |= Q(barangay__municipality=municipality_obj)

                    # Add province-wide listings
                    query |= Q(location__iexact=province_formatted, barangay__isnull=True)

                    queryset = queryset.filter(query)
                except MunicipalityModel.DoesNotExist:
                    # Fallback to old behavior if municipality not found
                    queryset = queryset.filter(
                        Q(location__icontains=municipality_formatted) |
                        Q(location__iexact=province_formatted)
                    )
            else:
                queryset = queryset.filter(location__icontains=municipality_formatted)

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

        # Handle province, municipality, and barangay filtering with cascade support
        municipality = self.request.query_params.get('municipality')
        province = self.request.query_params.get('province')
        barangay = self.request.query_params.get('barangay')

        if barangay and municipality and province:
            from django.db.models import Q
            # Priority-based cascade filtering for barangay level:
            # 1. Direct barangay match (by ID)
            # 2. Municipality-wide with High/Urgent priority
            # 3. Province-wide with Urgent priority only
            # barangay parameter is now expected to be an ID
            try:
                barangay_id = int(barangay)
                queryset = queryset.filter(
                    Q(barangay_id=barangay_id, municipality=municipality, province=province) |
                    Q(is_municipality_wide=True, municipality=municipality, province=province,
                      priority__in=['high', 'urgent']) |
                    Q(is_province_wide=True, province=province, priority='urgent')
                )
            except (ValueError, TypeError):
                # If barangay is not a valid ID, show only municipality and province-wide
                queryset = queryset.filter(
                    Q(is_municipality_wide=True, municipality=municipality, province=province,
                      priority__in=['high', 'urgent']) |
                    Q(is_province_wide=True, province=province, priority='urgent')
                )
        elif municipality and province:
            from django.db.models import Q
            # HIERARCHICAL VISIBILITY: Municipality view shows:
            # 1. Municipality-wide announcements (municipality FK matches, barangay='')
            # 2. ALL barangay-specific announcements in this municipality (municipality FK matches, barangay set)
            # 3. Province-wide announcements (is_province_wide=True)
            # This naturally includes all barangays because we filter by municipality FK
            queryset = queryset.filter(
                Q(municipality=municipality, province=province) |
                Q(is_province_wide=True, province=province)
            )
        elif municipality and not province:
            # Filter by municipality only
            queryset = queryset.filter(municipality=municipality)
        elif province and not municipality:
            # Filter by province only
            queryset = queryset.filter(province=province)

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
