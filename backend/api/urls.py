from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

app_name = 'api'

# Create router for viewsets
router = DefaultRouter()
router.register(r'provinces', views.ProvinceViewSet, basename='province')
router.register(r'municipalities', views.MunicipalityViewSet, basename='municipality')
router.register(r'barangays', views.BarangayViewSet, basename='barangay')
router.register(r'categories', views.CategoryViewSet, basename='category')
router.register(r'listings', views.ListingViewSet, basename='listing')
router.register(r'announcements', views.AnnouncementViewSet, basename='announcement')

urlpatterns = [
    # Authentication endpoints
    path('auth/register/', views.UserRegistrationView.as_view(),
         name='register'),
    path('auth/logout/', views.logout_view, name='logout'),
    path('auth/profile/', views.user_profile_view, name='profile'),
    path('auth/profile/picture/', views.upload_profile_picture, name='profile-picture-upload'),
    path('auth/profile/picture/delete/', views.delete_profile_picture, name='profile-picture-delete'),

    # Public user profile endpoints
    path('users/<str:username>/', views.public_user_profile_view, name='public-user-profile'),
    path('users/<str:username>/listings/', views.public_user_listings_view, name='public-user-listings'),
    path('users/<str:username>/announcements/', views.public_user_announcements_view, name='public-user-announcements'),

    # Location search endpoint
    path('locations/search/', views.location_search, name='location-search'),

    # Include router URLs
    path('', include(router.urls)),
]
