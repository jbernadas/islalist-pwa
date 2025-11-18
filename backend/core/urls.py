"""
URL configuration for core project - REST API + Admin
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
    TokenVerifyView,
)

urlpatterns = [
    # Django Admin
    path('admin/', admin.site.urls),

    # JWT Authentication endpoints
    path('api/auth/login/', TokenObtainPairView.as_view(),
         name='token_obtain_pair'),
    path('api/auth/refresh/', TokenRefreshView.as_view(),
         name='token_refresh'),
    path('api/auth/verify/', TokenVerifyView.as_view(),
         name='token_verify'),

    # dj-rest-auth endpoints (registration, email verification, password reset)
    path('api/auth/', include('dj_rest_auth.urls')),  # login, logout, password reset, password change
    path('api/auth/registration/', include('dj_rest_auth.registration.urls')),  # registration, email verification

    # API endpoints
    path('api/', include('api.urls')),
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
