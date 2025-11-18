"""
Custom password reset views with logging
"""
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth import get_user_model
from django.utils.http import urlsafe_base64_decode
from django.utils.encoding import force_str
from django.utils.translation import gettext_lazy as _
from allauth.account.forms import default_token_generator
import logging

logger = logging.getLogger(__name__)
User = get_user_model()


class CustomPasswordResetConfirmView(APIView):
    """
    Custom password reset confirm view that handles uid/token validation properly
    """
    permission_classes = []

    def post(self, request, *args, **kwargs):
        """Handle password reset confirmation"""
        logger.info(f"Password reset confirm request data: {request.data}")

        uid = request.data.get('uid')
        token = request.data.get('token')
        new_password1 = request.data.get('new_password1')
        new_password2 = request.data.get('new_password2')

        # Validate required fields
        if not all([uid, token, new_password1, new_password2]):
            return Response(
                {'detail': _('Missing required fields')},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validate passwords match
        if new_password1 != new_password2:
            return Response(
                {'new_password2': [_('Passwords do not match')]},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Decode uid and get user
        try:
            user_id = force_str(urlsafe_base64_decode(uid))
            logger.info(f"Decoded uid: {user_id}")
            user = User.objects.get(pk=user_id)
            logger.info(f"Found user: {user.username}")
        except (TypeError, ValueError, OverflowError, User.DoesNotExist) as e:
            logger.error(f"Invalid uid: {e}")
            return Response(
                {'detail': _('Invalid reset link')},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validate token
        if not default_token_generator.check_token(user, token):
            logger.error(f"Invalid token for user {user.username}")
            return Response(
                {'detail': _('Invalid or expired reset link')},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Set new password
        try:
            user.set_password(new_password1)
            user.save()
            logger.info(f"Password reset successful for user {user.username}")
            return Response(
                {'detail': _('Password has been reset successfully')},
                status=status.HTTP_200_OK
            )
        except Exception as e:
            logger.error(f"Error setting password: {e}")
            return Response(
                {'detail': _('Failed to reset password')},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
