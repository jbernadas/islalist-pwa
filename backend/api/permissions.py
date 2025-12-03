"""
Custom permissions for the API
"""
from rest_framework import permissions


class IsEmailVerified(permissions.BasePermission):
    """
    Permission class to check if user's email is verified.
    Used to prevent unverified users from posting listings or announcements.
    """
    message = "You must verify your email address before posting. Please check your email for the verification link."

    def has_permission(self, request, view):
        # Allow read-only requests (GET, HEAD, OPTIONS)
        if request.method in permissions.SAFE_METHODS:
            return True

        # Check if user is authenticated
        if not request.user or not request.user.is_authenticated:
            return False

        # Check if email is verified via allauth
        return request.user.emailaddress_set.filter(
            email=request.user.email,
            verified=True
        ).exists()


class IsOwnerOrReadOnly(permissions.BasePermission):
    """
    Object-level permission to only allow owners to edit/delete their own objects.
    Assumes the model instance has a `seller` or `author` attribute.
    """
    message = "You can only modify your own content."

    def has_object_permission(self, request, view, obj):
        # Read permissions are allowed to any request
        if request.method in permissions.SAFE_METHODS:
            return True

        # Write permissions only allowed to the owner
        # Check for 'seller' (listings) or 'author' (announcements)
        owner = getattr(obj, 'seller', None) or getattr(obj, 'author', None)
        return owner == request.user
