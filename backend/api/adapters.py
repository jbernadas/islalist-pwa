"""
Custom adapters for django-allauth
"""
from allauth.account.adapter import DefaultAccountAdapter
from allauth.account.utils import user_email, user_username
from django.conf import settings
import logging

logger = logging.getLogger(__name__)


class CustomAccountAdapter(DefaultAccountAdapter):
    """
    Custom account adapter to handle email verification and user activation
    """

    def save_user(self, request, user, form, commit=True):
        """
        Override save_user to ensure email is properly added to allauth's EmailAddress model
        """
        logger.info(f"CustomAccountAdapter.save_user called for {user.username}")

        # Call parent to handle basic user saving
        user = super().save_user(request, user, form, commit=False)

        # User should be inactive until email is verified
        if self.is_email_verification_mandatory():
            user.is_active = False
            logger.info(f"Setting user {user.username} as inactive (email verification required)")

        if commit:
            user.save()

        return user

    def is_email_verification_mandatory(self):
        """
        Check if email verification is mandatory from settings
        """
        return settings.ACCOUNT_EMAIL_VERIFICATION == 'mandatory'

    def get_email_confirmation_url(self, request, emailconfirmation):
        """
        Override to generate frontend URL for email confirmation
        """
        # For API usage, redirect to frontend with the key
        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')
        url = f"{frontend_url}/verify-email/{emailconfirmation.key}"
        logger.info(f"Generated email confirmation URL: {url}")
        return url

    def send_confirmation_mail(self, request, emailconfirmation, signup):
        """
        Override to add logging for debugging
        """
        logger.info(f"Sending confirmation email to {emailconfirmation.email_address.email}")
        super().send_confirmation_mail(request, emailconfirmation, signup)
        logger.info(f"Confirmation email sent successfully")
