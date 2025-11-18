"""
Custom serializers for authentication
"""
from dj_rest_auth.serializers import PasswordResetSerializer
from dj_rest_auth.forms import AllAuthPasswordResetForm
from django.conf import settings


class CustomPasswordResetForm(AllAuthPasswordResetForm):
    """Custom password reset form that uses frontend URL"""

    def save(self, request, **kwargs):
        """Override to use custom URL generator"""
        from api.password_reset import password_reset_url_generator

        # Pass our custom URL generator to the save method
        kwargs['url_generator'] = password_reset_url_generator
        return super().save(request, **kwargs)


class CustomPasswordResetSerializer(PasswordResetSerializer):
    """Custom password reset serializer that uses our custom form"""

    @property
    def password_reset_form_class(self):
        return CustomPasswordResetForm
