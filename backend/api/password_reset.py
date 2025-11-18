"""
Custom password reset URL generator for dj-rest-auth
"""
from django.conf import settings


def password_reset_url_generator(request, user, temp_key):
    """
    Generate frontend URL for password reset instead of backend URL
    """
    from django.utils.http import urlsafe_base64_encode
    from django.utils.encoding import force_bytes

    frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
    # Encode uid (in Django 5.x, urlsafe_base64_encode returns a string)
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    # Handle both str and bytes return types for compatibility
    if isinstance(uid, bytes):
        uid = uid.decode('utf-8')

    # Generate frontend URL: http://localhost:5173/reset-password/{uid}/{token}
    url = f"{frontend_url}/reset-password/{uid}/{temp_key}"

    return url
