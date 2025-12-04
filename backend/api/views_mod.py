"""
Moderator-specific API views.
All views require IsProvinceModerator permission.
"""
from rest_framework import status, generics
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth.models import User
from django.db.models import Count, Q

from .models import Province, Listing, Announcement
from .permissions import IsProvinceModerator, IsProvinceModeratorForObject
from .serializers import (
    ListingListSerializer, ListingSerializer,
    AnnouncementListSerializer, AnnouncementSerializer,
    PublicUserSerializer
)


def get_mod_province(user):
    """Helper to get the moderator's assigned province"""
    if hasattr(user, 'province_moderator') and user.province_moderator.is_active:
        return user.province_moderator.province
    return None


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsProvinceModerator])
def mod_dashboard_stats(request):
    """
    Get dashboard statistics for the moderator's province.
    Returns counts of users, listings, and announcements.
    """
    province = get_mod_province(request.user)
    if not province:
        return Response(
            {'error': 'No active province assignment found'},
            status=status.HTTP_403_FORBIDDEN
        )

    # Count users who have posted in this province
    users_with_listings = User.objects.filter(
        listings__province=province
    ).distinct().count()

    users_with_announcements = User.objects.filter(
        announcements__province=province
    ).distinct().count()

    # Combined unique users
    total_users = User.objects.filter(
        Q(listings__province=province) | Q(announcements__province=province)
    ).distinct().count()

    # Listing counts by status
    listings_active = Listing.objects.filter(province=province, status='active').count()
    listings_hidden = Listing.objects.filter(province=province, status='hidden').count()
    listings_sold = Listing.objects.filter(province=province, status='sold').count()
    listings_total = Listing.objects.filter(province=province).count()

    # Announcement counts
    announcements_active = Announcement.objects.filter(province=province, is_active=True).count()
    announcements_hidden = Announcement.objects.filter(province=province, is_active=False).count()
    announcements_total = Announcement.objects.filter(province=province).count()

    return Response({
        'province': {
            'id': province.id,
            'name': province.name,
            'slug': province.slug,
        },
        'users': {
            'total': total_users,
            'with_listings': users_with_listings,
            'with_announcements': users_with_announcements,
        },
        'listings': {
            'total': listings_total,
            'active': listings_active,
            'hidden': listings_hidden,
            'sold': listings_sold,
        },
        'announcements': {
            'total': announcements_total,
            'active': announcements_active,
            'hidden': announcements_hidden,
        }
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsProvinceModerator])
def mod_users_list(request):
    """
    Get list of users who have posted content in the moderator's province.
    """
    province = get_mod_province(request.user)
    if not province:
        return Response(
            {'error': 'No active province assignment found'},
            status=status.HTTP_403_FORBIDDEN
        )

    # Get users who have listings or announcements in this province
    users = User.objects.filter(
        Q(listings__province=province) | Q(announcements__province=province)
    ).distinct().annotate(
        listings_count=Count('listings', filter=Q(listings__province=province)),
        announcements_count=Count('announcements', filter=Q(announcements__province=province))
    ).select_related('profile').order_by('username')

    # Build response data
    users_data = []
    for user in users:
        user_data = {
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'date_joined': user.date_joined,
            'listings_count': user.listings_count,
            'announcements_count': user.announcements_count,
        }
        # Add profile data if exists
        if hasattr(user, 'profile'):
            user_data['location'] = user.profile.location
            user_data['profile_picture'] = None
            if user.profile.profile_picture_small:
                user_data['profile_picture'] = request.build_absolute_uri(
                    user.profile.profile_picture_small.url
                )
        users_data.append(user_data)

    return Response(users_data)


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsProvinceModerator])
def mod_listings_list(request):
    """
    Get all listings in the moderator's province.
    Supports filtering by status, municipality, and search.
    """
    province = get_mod_province(request.user)
    if not province:
        return Response(
            {'error': 'No active province assignment found'},
            status=status.HTTP_403_FORBIDDEN
        )

    queryset = Listing.objects.filter(province=province).select_related(
        'seller', 'category', 'province', 'municipality', 'barangay'
    ).prefetch_related('images').order_by('-created_at')

    # Filter by status
    status_filter = request.query_params.get('status')
    if status_filter:
        queryset = queryset.filter(status=status_filter)

    # Filter by municipality
    municipality = request.query_params.get('municipality')
    if municipality:
        queryset = queryset.filter(municipality__slug=municipality)

    # Filter by barangay
    barangay = request.query_params.get('barangay')
    if barangay:
        queryset = queryset.filter(barangay__slug=barangay)

    # Search
    search = request.query_params.get('search')
    if search:
        queryset = queryset.filter(
            Q(title__icontains=search) | Q(seller__username__icontains=search)
        )

    serializer = ListingListSerializer(queryset, many=True, context={'request': request})
    return Response(serializer.data)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated, IsProvinceModerator])
def mod_listing_update_status(request, pk):
    """
    Update a listing's status (publish/unpublish).
    Only allows changing status field.
    """
    province = get_mod_province(request.user)
    if not province:
        return Response(
            {'error': 'No active province assignment found'},
            status=status.HTTP_403_FORBIDDEN
        )

    try:
        listing = Listing.objects.get(pk=pk, province=province)
    except Listing.DoesNotExist:
        return Response(
            {'error': 'Listing not found in your province'},
            status=status.HTTP_404_NOT_FOUND
        )

    new_status = request.data.get('status')
    if new_status not in ['active', 'hidden']:
        return Response(
            {'error': 'Invalid status. Must be "active" or "hidden"'},
            status=status.HTTP_400_BAD_REQUEST
        )

    listing.status = new_status
    listing.save(update_fields=['status', 'updated_at'])

    serializer = ListingSerializer(listing, context={'request': request})
    return Response(serializer.data)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated, IsProvinceModerator])
def mod_listing_delete(request, pk):
    """
    Delete a listing from the moderator's province.
    """
    province = get_mod_province(request.user)
    if not province:
        return Response(
            {'error': 'No active province assignment found'},
            status=status.HTTP_403_FORBIDDEN
        )

    try:
        listing = Listing.objects.get(pk=pk, province=province)
    except Listing.DoesNotExist:
        return Response(
            {'error': 'Listing not found in your province'},
            status=status.HTTP_404_NOT_FOUND
        )

    listing_title = listing.title
    listing.delete()

    return Response({
        'message': f'Listing "{listing_title}" has been deleted'
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsProvinceModerator])
def mod_announcements_list(request):
    """
    Get all announcements in the moderator's province.
    Supports filtering by status, municipality, type, and search.
    """
    province = get_mod_province(request.user)
    if not province:
        return Response(
            {'error': 'No active province assignment found'},
            status=status.HTTP_403_FORBIDDEN
        )

    queryset = Announcement.objects.filter(province=province).select_related(
        'author', 'province', 'municipality', 'barangay'
    ).order_by('-created_at')

    # Filter by active status
    is_active = request.query_params.get('is_active')
    if is_active is not None:
        queryset = queryset.filter(is_active=is_active.lower() == 'true')

    # Filter by municipality
    municipality = request.query_params.get('municipality')
    if municipality:
        queryset = queryset.filter(municipality__slug=municipality)

    # Filter by type
    announcement_type = request.query_params.get('type')
    if announcement_type:
        queryset = queryset.filter(announcement_type=announcement_type)

    # Search
    search = request.query_params.get('search')
    if search:
        queryset = queryset.filter(
            Q(title__icontains=search) | Q(author__username__icontains=search)
        )

    serializer = AnnouncementListSerializer(queryset, many=True, context={'request': request})
    return Response(serializer.data)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated, IsProvinceModerator])
def mod_announcement_update_status(request, pk):
    """
    Update an announcement's status (publish/unpublish).
    Only allows changing is_active field.
    """
    province = get_mod_province(request.user)
    if not province:
        return Response(
            {'error': 'No active province assignment found'},
            status=status.HTTP_403_FORBIDDEN
        )

    try:
        announcement = Announcement.objects.get(pk=pk, province=province)
    except Announcement.DoesNotExist:
        return Response(
            {'error': 'Announcement not found in your province'},
            status=status.HTTP_404_NOT_FOUND
        )

    is_active = request.data.get('is_active')
    if is_active is None or not isinstance(is_active, bool):
        return Response(
            {'error': 'Invalid is_active value. Must be true or false'},
            status=status.HTTP_400_BAD_REQUEST
        )

    announcement.is_active = is_active
    announcement.save(update_fields=['is_active', 'updated_at'])

    serializer = AnnouncementSerializer(announcement, context={'request': request})
    return Response(serializer.data)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated, IsProvinceModerator])
def mod_announcement_delete(request, pk):
    """
    Delete an announcement from the moderator's province.
    """
    province = get_mod_province(request.user)
    if not province:
        return Response(
            {'error': 'No active province assignment found'},
            status=status.HTTP_403_FORBIDDEN
        )

    try:
        announcement = Announcement.objects.get(pk=pk, province=province)
    except Announcement.DoesNotExist:
        return Response(
            {'error': 'Announcement not found in your province'},
            status=status.HTTP_404_NOT_FOUND
        )

    announcement_title = announcement.title
    announcement.delete()

    return Response({
        'message': f'Announcement "{announcement_title}" has been deleted'
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsProvinceModerator])
def mod_check_status(request):
    """
    Check if the current user is a province moderator and return their assignment details.
    Useful for frontend to determine if mod features should be shown.
    """
    province = get_mod_province(request.user)
    if not province:
        return Response({
            'is_moderator': False,
            'province': None
        })

    return Response({
        'is_moderator': True,
        'province': {
            'id': province.id,
            'name': province.name,
            'slug': province.slug,
        }
    })
