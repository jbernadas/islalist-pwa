"""
Custom authentication views
"""
from dj_rest_auth.registration.views import RegisterView, VerifyEmailView
from allauth.account.models import EmailAddress, EmailConfirmation, EmailConfirmationHMAC
from allauth.account import app_settings as allauth_settings
from rest_framework.response import Response
from rest_framework import status
from django.utils.translation import gettext_lazy as _
import logging

logger = logging.getLogger(__name__)


class CustomRegisterView(RegisterView):
    """
    Custom registration view that properly integrates with allauth email verification
    """

    def create(self, request, *args, **kwargs):
        """Override to handle errors gracefully"""
        try:
            return super().create(request, *args, **kwargs)
        except Exception as e:
            logger.error(f"Registration error: {type(e).__name__}")
            raise

    def perform_create(self, serializer):
        """
        Override to ensure EmailAddress is created and verification email is sent
        """
        user = serializer.save(self.request)  # Don't call super() which tries to login

        # Create EmailAddress object for allauth
        email_address, created = EmailAddress.objects.get_or_create(
            user=user,
            email=user.email.lower(),
            defaults={'primary': True, 'verified': False}
        )

        # If email verification is mandatory, set user as inactive
        if allauth_settings.EMAIL_VERIFICATION == allauth_settings.EmailVerificationMethod.MANDATORY:
            user.is_active = False
            user.save()
            logger.info(f"New user registered (ID: {user.pk}), email verification required")

            # Send verification email
            email_address.send_confirmation(self.request, signup=True)

        return user


class CustomVerifyEmailView(VerifyEmailView):
    """
    Custom email verification view that activates the user after verification
    """

    def post(self, request, *args, **kwargs):
        """Override to activate user after email verification"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.kwargs['key'] = serializer.validated_data['key']

        try:
            confirmation = self.get_object()
            confirmation.confirm(self.request)

            # Activate the user after successful email confirmation
            user = confirmation.email_address.user
            if not user.is_active:
                user.is_active = True
                user.save()
                logger.info(f"Email verified and user activated (ID: {user.pk})")

            return Response({'detail': _('ok')}, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"Email verification error: {type(e).__name__}")
            return Response(
                {'detail': _('Invalid or expired verification link.')},
                status=status.HTTP_400_BAD_REQUEST
            )

    def get_object(self, queryset=None):
        """Get the email confirmation object"""
        key = self.kwargs['key']
        emailconfirmation = EmailConfirmationHMAC.from_key(key)
        if not emailconfirmation:
            try:
                emailconfirmation = EmailConfirmation.objects.get(key=key.lower())
            except EmailConfirmation.DoesNotExist:
                raise Exception("Invalid confirmation key")
        return emailconfirmation
