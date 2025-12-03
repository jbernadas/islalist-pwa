"""
Django system checks for production configuration.

These checks run during Django startup and warn about misconfigurations
that could cause silent failures in production.
"""
import os
from django.conf import settings
from django.core.checks import Warning, Error, register, Tags


@register(Tags.security, deploy=True)
def check_email_configuration(app_configs, **kwargs):
    """
    Check that email is properly configured when email verification is mandatory.
    """
    errors = []

    # Check if email verification is mandatory
    email_verification = getattr(settings, 'ACCOUNT_EMAIL_VERIFICATION', 'none')

    if email_verification == 'mandatory':
        # Check email backend configuration
        email_backend = getattr(settings, 'EMAIL_BACKEND', '')

        # If using SMTP backend, check that credentials are configured
        if 'smtp' in email_backend.lower():
            email_host_user = getattr(settings, 'EMAIL_HOST_USER', '')
            email_host_password = getattr(settings, 'EMAIL_HOST_PASSWORD', '')

            if not email_host_user:
                errors.append(
                    Error(
                        'EMAIL_HOST_USER is not configured.',
                        hint='Email verification is mandatory but SMTP email is not properly configured. '
                             'Set EMAIL_HOST_USER in your environment or settings.',
                        id='api.E001',
                    )
                )

            if not email_host_password:
                errors.append(
                    Error(
                        'EMAIL_HOST_PASSWORD is not configured.',
                        hint='Email verification is mandatory but SMTP email is not properly configured. '
                             'Set EMAIL_HOST_PASSWORD in your environment or settings.',
                        id='api.E002',
                    )
                )

        # If using console backend in production, warn
        if 'console' in email_backend.lower():
            debug = getattr(settings, 'DEBUG', True)
            if not debug:
                errors.append(
                    Warning(
                        'Console email backend is being used in production.',
                        hint='Email verification is mandatory but using console email backend. '
                             'Verification emails will not be sent. Configure SMTP for production.',
                        id='api.W001',
                    )
                )

    return errors


@register(Tags.security, deploy=True)
def check_cors_configuration(app_configs, **kwargs):
    """
    Check that CORS is properly configured in production.
    """
    errors = []
    debug = getattr(settings, 'DEBUG', True)

    if not debug:
        # Production mode - check CORS configuration
        cors_allow_all = getattr(settings, 'CORS_ALLOW_ALL_ORIGINS', False)
        cors_allowed_origins = getattr(settings, 'CORS_ALLOWED_ORIGINS', [])

        if cors_allow_all:
            errors.append(
                Error(
                    'CORS_ALLOW_ALL_ORIGINS is True in production.',
                    hint='This allows any website to make requests to your API. '
                         'Set CORS_ALLOW_ALL_ORIGINS = False and configure CORS_ALLOWED_ORIGINS.',
                    id='api.E003',
                )
            )

        # Check for empty CORS_ALLOWED_ORIGINS (when allow_all is False)
        if not cors_allow_all and not cors_allowed_origins:
            errors.append(
                Error(
                    'CORS_ALLOWED_ORIGINS is empty in production.',
                    hint='No origins are allowed to make cross-origin requests. '
                         'Set CORS_ALLOWED_ORIGINS to your frontend domain(s) or '
                         'ensure the CORS_ALLOWED_ORIGINS environment variable is set.',
                    id='api.E004',
                )
            )

        # Check for placeholder values
        if cors_allowed_origins:
            empty_values = [o for o in cors_allowed_origins if not o or o.strip() == '']
            if empty_values or cors_allowed_origins == ['']:
                errors.append(
                    Warning(
                        'CORS_ALLOWED_ORIGINS contains empty values.',
                        hint='Ensure CORS_ALLOWED_ORIGINS environment variable is properly set. '
                             f'Current value: {cors_allowed_origins}',
                        id='api.W002',
                    )
                )

    return errors


@register(Tags.security, deploy=True)
def check_secret_key(app_configs, **kwargs):
    """
    Check that SECRET_KEY is not using the default insecure value.
    """
    errors = []
    debug = getattr(settings, 'DEBUG', True)

    if not debug:
        secret_key = getattr(settings, 'SECRET_KEY', '')
        if 'insecure' in secret_key.lower() or 'change-me' in secret_key.lower():
            errors.append(
                Error(
                    'SECRET_KEY appears to be using an insecure default value.',
                    hint='Generate a secure SECRET_KEY for production using: '
                         'python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"',
                    id='api.E005',
                )
            )

    return errors
