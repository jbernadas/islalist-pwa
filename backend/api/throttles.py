"""
Custom throttle classes for rate limiting API endpoints.

These throttles protect sensitive endpoints from brute force attacks
and abuse while allowing normal usage patterns.
"""
from rest_framework.throttling import SimpleRateThrottle


class AuthRateThrottle(SimpleRateThrottle):
    """
    Rate limit for authentication endpoints (login, register).
    Limits by IP address to prevent brute force attacks.
    """
    scope = 'auth'

    def get_cache_key(self, request, view):
        # Use IP address for throttling (works for both anon and auth users)
        return self.cache_format % {
            'scope': self.scope,
            'ident': self.get_ident(request)
        }


class PasswordResetRateThrottle(SimpleRateThrottle):
    """
    Stricter rate limit for password reset endpoints.
    Prevents email enumeration and spam.
    """
    scope = 'password_reset'

    def get_cache_key(self, request, view):
        # Use IP address for throttling
        return self.cache_format % {
            'scope': self.scope,
            'ident': self.get_ident(request)
        }


class BurstRateThrottle(SimpleRateThrottle):
    """
    Short burst protection for sensitive operations.
    Allows 10 requests per minute to prevent rapid-fire abuse.
    """
    scope = 'burst'
    rate = '10/minute'

    def get_cache_key(self, request, view):
        if request.user and request.user.is_authenticated:
            ident = request.user.pk
        else:
            ident = self.get_ident(request)

        return self.cache_format % {
            'scope': self.scope,
            'ident': ident
        }
