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


class IsProvinceModerator(permissions.BasePermission):
    """
    Permission class for Province Moderators.
    Checks if the user has an active ProvinceModerator assignment.
    """
    message = "You must be an active province moderator to access this resource."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        # Check if user has an active province moderator assignment
        return hasattr(request.user, 'province_moderator') and \
               request.user.province_moderator.is_active

    def get_mod_province(self, user):
        """Helper to get the moderator's province"""
        if hasattr(user, 'province_moderator') and user.province_moderator.is_active:
            return user.province_moderator.province
        return None


class IsProvinceModeratorForObject(permissions.BasePermission):
    """
    Object-level permission for Province Moderators.
    Checks if the object belongs to the moderator's province.
    """
    message = "You can only moderate content within your assigned province."

    def has_object_permission(self, request, view, obj):
        if not request.user or not request.user.is_authenticated:
            return False

        # Check if user is an active province moderator
        if not hasattr(request.user, 'province_moderator') or \
           not request.user.province_moderator.is_active:
            return False

        mod_province = request.user.province_moderator.province

        # Check if object's province matches mod's province
        obj_province = getattr(obj, 'province', None)
        return obj_province == mod_province
