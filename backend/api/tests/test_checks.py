"""
Tests for Django system checks (email, CORS, secret key configuration).

These tests verify:
1. Email backend configuration checks
2. CORS configuration checks
3. Secret key security checks
"""
import pytest
from unittest.mock import patch
from django.core.checks import Error, Warning

from api.checks import (
    check_email_configuration,
    check_cors_configuration,
    check_secret_key
)


class TestEmailConfigurationCheck:
    """Tests for check_email_configuration system check"""

    @patch('api.checks.settings')
    def test_no_error_when_email_not_mandatory(self, mock_settings):
        """Test no errors when email verification is not mandatory"""
        mock_settings.ACCOUNT_EMAIL_VERIFICATION = 'optional'
        errors = check_email_configuration(None)
        assert len(errors) == 0

    @patch('api.checks.settings')
    def test_error_when_smtp_missing_user(self, mock_settings):
        """Test error when SMTP is used but EMAIL_HOST_USER is missing"""
        mock_settings.ACCOUNT_EMAIL_VERIFICATION = 'mandatory'
        mock_settings.EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
        mock_settings.EMAIL_HOST_USER = ''
        mock_settings.EMAIL_HOST_PASSWORD = 'password123'

        errors = check_email_configuration(None)
        error_ids = [e.id for e in errors]
        assert 'api.E001' in error_ids

    @patch('api.checks.settings')
    def test_error_when_smtp_missing_password(self, mock_settings):
        """Test error when SMTP is used but EMAIL_HOST_PASSWORD is missing"""
        mock_settings.ACCOUNT_EMAIL_VERIFICATION = 'mandatory'
        mock_settings.EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
        mock_settings.EMAIL_HOST_USER = 'user@example.com'
        mock_settings.EMAIL_HOST_PASSWORD = ''

        errors = check_email_configuration(None)
        error_ids = [e.id for e in errors]
        assert 'api.E002' in error_ids

    @patch('api.checks.settings')
    def test_warning_console_backend_in_production(self, mock_settings):
        """Test warning when using console backend in production"""
        mock_settings.ACCOUNT_EMAIL_VERIFICATION = 'mandatory'
        mock_settings.EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'
        mock_settings.DEBUG = False

        errors = check_email_configuration(None)
        warning_ids = [e.id for e in errors if isinstance(e, Warning)]
        assert 'api.W001' in warning_ids

    @patch('api.checks.settings')
    def test_no_warning_console_backend_in_debug(self, mock_settings):
        """Test no warning when using console backend in debug mode"""
        mock_settings.ACCOUNT_EMAIL_VERIFICATION = 'mandatory'
        mock_settings.EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'
        mock_settings.DEBUG = True

        errors = check_email_configuration(None)
        warning_ids = [e.id for e in errors if isinstance(e, Warning)]
        assert 'api.W001' not in warning_ids

    @patch('api.checks.settings')
    def test_no_error_when_properly_configured(self, mock_settings):
        """Test no errors when email is properly configured"""
        mock_settings.ACCOUNT_EMAIL_VERIFICATION = 'mandatory'
        mock_settings.EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
        mock_settings.EMAIL_HOST_USER = 'user@example.com'
        mock_settings.EMAIL_HOST_PASSWORD = 'secure_password'

        errors = check_email_configuration(None)
        assert len(errors) == 0


class TestCorsConfigurationCheck:
    """Tests for check_cors_configuration system check"""

    @patch('api.checks.settings')
    def test_no_error_in_debug_mode(self, mock_settings):
        """Test no errors when in debug mode"""
        mock_settings.DEBUG = True
        errors = check_cors_configuration(None)
        assert len(errors) == 0

    @patch('api.checks.settings')
    def test_error_allow_all_in_production(self, mock_settings):
        """Test error when CORS_ALLOW_ALL_ORIGINS is True in production"""
        mock_settings.DEBUG = False
        mock_settings.CORS_ALLOW_ALL_ORIGINS = True
        mock_settings.CORS_ALLOWED_ORIGINS = []

        errors = check_cors_configuration(None)
        error_ids = [e.id for e in errors if isinstance(e, Error)]
        assert 'api.E003' in error_ids

    @patch('api.checks.settings')
    def test_error_empty_origins_in_production(self, mock_settings):
        """Test error when CORS_ALLOWED_ORIGINS is empty in production"""
        mock_settings.DEBUG = False
        mock_settings.CORS_ALLOW_ALL_ORIGINS = False
        mock_settings.CORS_ALLOWED_ORIGINS = []

        errors = check_cors_configuration(None)
        error_ids = [e.id for e in errors if isinstance(e, Error)]
        assert 'api.E004' in error_ids

    @patch('api.checks.settings')
    def test_warning_empty_values_in_origins(self, mock_settings):
        """Test warning when CORS_ALLOWED_ORIGINS contains empty values"""
        mock_settings.DEBUG = False
        mock_settings.CORS_ALLOW_ALL_ORIGINS = False
        mock_settings.CORS_ALLOWED_ORIGINS = ['https://example.com', '']

        errors = check_cors_configuration(None)
        warning_ids = [e.id for e in errors if isinstance(e, Warning)]
        assert 'api.W002' in warning_ids

    @patch('api.checks.settings')
    def test_no_error_properly_configured(self, mock_settings):
        """Test no errors when CORS is properly configured"""
        mock_settings.DEBUG = False
        mock_settings.CORS_ALLOW_ALL_ORIGINS = False
        mock_settings.CORS_ALLOWED_ORIGINS = ['https://example.com', 'https://app.example.com']

        errors = check_cors_configuration(None)
        assert len(errors) == 0


class TestSecretKeyCheck:
    """Tests for check_secret_key system check"""

    @patch('api.checks.settings')
    def test_no_error_in_debug_mode(self, mock_settings):
        """Test no errors when in debug mode"""
        mock_settings.DEBUG = True
        mock_settings.SECRET_KEY = 'django-insecure-test-key'
        errors = check_secret_key(None)
        assert len(errors) == 0

    @patch('api.checks.settings')
    def test_error_insecure_key_in_production(self, mock_settings):
        """Test error when using insecure key in production"""
        mock_settings.DEBUG = False
        mock_settings.SECRET_KEY = 'django-insecure-change-me'

        errors = check_secret_key(None)
        error_ids = [e.id for e in errors if isinstance(e, Error)]
        assert 'api.E005' in error_ids

    @patch('api.checks.settings')
    def test_error_change_me_in_production(self, mock_settings):
        """Test error when key contains 'change-me' in production"""
        mock_settings.DEBUG = False
        mock_settings.SECRET_KEY = 'some-key-with-change-me-in-it'

        errors = check_secret_key(None)
        error_ids = [e.id for e in errors if isinstance(e, Error)]
        assert 'api.E005' in error_ids

    @patch('api.checks.settings')
    def test_no_error_secure_key_in_production(self, mock_settings):
        """Test no errors when using secure key in production"""
        mock_settings.DEBUG = False
        mock_settings.SECRET_KEY = 'a-very-long-and-secure-random-key-12345'

        errors = check_secret_key(None)
        assert len(errors) == 0
