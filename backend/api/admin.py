from django.contrib import admin
from django.contrib import messages
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.models import User
from .models import Province, Municipality, Barangay, Category, Listing, ListingImage, UserProfile, Announcement, ProvinceModerator


# Unregister the default User admin and re-register with search_fields for autocomplete
admin.site.unregister(User)


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    """Custom User admin with search_fields for autocomplete support"""
    search_fields = ['username', 'email', 'first_name', 'last_name']


@admin.register(Province)
class ProvinceAdmin(admin.ModelAdmin):
    """
    Province admin - read-only since provinces come from PSGC data (provinces_data.json).
    Only 'active', 'featured', and 'hero_image' can be modified.
    """
    list_display = ['name', 'slug', 'psgc_code', 'active', 'featured', 'has_hero_image', 'municipality_count']
    list_filter = ['active', 'featured']
    search_fields = ['name', 'psgc_code']
    readonly_fields = ['name', 'slug', 'psgc_code', 'description', 'created_at', 'updated_at', 'hero_image_preview']

    fieldsets = (
        (None, {
            'fields': ('name', 'slug', 'psgc_code', 'description')
        }),
        ('Status', {
            'fields': ('active', 'featured')
        }),
        ('Hero Image', {
            'fields': ('hero_image', 'hero_image_preview'),
            'description': 'Upload a hero background image for the province page. Recommended size: 1920x600 or wider.'
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    def municipality_count(self, obj):
        return obj.municipalities.filter(active=True).count()
    municipality_count.short_description = 'Cities/Municipalities'

    def has_hero_image(self, obj):
        return bool(obj.hero_image)
    has_hero_image.boolean = True
    has_hero_image.short_description = 'Hero'

    def hero_image_preview(self, obj):
        if obj.hero_image:
            from django.utils.html import format_html
            return format_html('<img src="{}" style="max-width: 400px; max-height: 150px; border-radius: 8px;" />', obj.hero_image.url)
        return "No image uploaded"
    hero_image_preview.short_description = 'Preview'

    def has_add_permission(self, request):
        """Provinces cannot be added - they come from PSGC data"""
        return False

    def has_delete_permission(self, request, obj=None):
        """Provinces cannot be deleted - they come from PSGC data"""
        return False


@admin.register(Municipality)
class MunicipalityAdmin(admin.ModelAdmin):
    """
    Municipality admin - read-only since municipalities come from PSGC data.
    Only 'active', 'is_featured', and 'hero_image' can be modified.
    """
    list_display = ['name', 'province', 'slug', 'psgc_code', 'type', 'active', 'is_featured', 'has_hero_image']
    list_filter = ['active', 'is_featured', 'type', 'province']
    list_editable = ['is_featured']
    search_fields = ['name', 'province__name', 'psgc_code']
    readonly_fields = ['name', 'slug', 'psgc_code', 'province', 'type', 'created_at', 'updated_at', 'hero_image_preview']

    fieldsets = (
        (None, {
            'fields': ('name', 'slug', 'psgc_code', 'province', 'type')
        }),
        ('Status', {
            'fields': ('active', 'is_featured'),
            'description': 'Featured municipalities appear in "Popular Destinations" on the homepage.'
        }),
        ('Hero Image', {
            'fields': ('hero_image', 'hero_image_preview'),
            'description': 'Upload a hero background image for the municipality page. Recommended size: 1920x600 or wider.'
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    def has_hero_image(self, obj):
        return bool(obj.hero_image)
    has_hero_image.boolean = True
    has_hero_image.short_description = 'Hero'

    def hero_image_preview(self, obj):
        if obj.hero_image:
            from django.utils.html import format_html
            return format_html('<img src="{}" style="max-width: 400px; max-height: 150px; border-radius: 8px;" />', obj.hero_image.url)
        return "No image uploaded"
    hero_image_preview.short_description = 'Preview'

    def has_add_permission(self, request):
        """Municipalities cannot be added - they come from PSGC data"""
        return False

    def has_delete_permission(self, request, obj=None):
        """Municipalities cannot be deleted - they come from PSGC data"""
        return False


@admin.register(Barangay)
class BarangayAdmin(admin.ModelAdmin):
    """
    Barangay admin - read-only since barangays come from PSGC data.
    Only 'active' flag can be modified.
    """
    list_display = ['name', 'municipality', 'psgc_code', 'slug', 'active']
    list_filter = ['active', 'municipality__province']
    search_fields = ['name', 'municipality__name', 'psgc_code']
    readonly_fields = ['name', 'slug', 'psgc_code', 'municipality', 'created_at', 'updated_at']
    list_select_related = ['municipality', 'municipality__province']

    def has_add_permission(self, request):
        """Barangays cannot be added - they come from PSGC data"""
        return False

    def has_delete_permission(self, request, obj=None):
        """Barangays cannot be deleted - they come from PSGC data"""
        return False


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'parent', 'active', 'order']
    list_filter = ['active', 'parent']
    search_fields = ['name', 'description']
    prepopulated_fields = {'slug': ('name',)}


class ListingImageInline(admin.TabularInline):
    model = ListingImage
    extra = 1
    fields = ['image_medium', 'order']
    readonly_fields = ['image_medium']


@admin.register(Listing)
class ListingAdmin(admin.ModelAdmin):
    list_display = ['title', 'seller', 'property_type', 'price', 'get_location_display', 'status', 'created_at']
    list_filter = ['status', 'property_type', 'category', 'province', 'created_at']
    search_fields = ['title', 'description']
    readonly_fields = ['views_count', 'created_at', 'updated_at', 'location_display']
    inlines = [ListingImageInline]
    date_hierarchy = 'created_at'

    # Disable add/change/delete/view buttons for location ForeignKeys
    def get_form(self, request, obj=None, **kwargs):
        form = super().get_form(request, obj, **kwargs)
        # Remove the add/edit/delete/view links for province, municipality, barangay
        form.base_fields['province'].widget.can_add_related = False
        form.base_fields['province'].widget.can_change_related = False
        form.base_fields['province'].widget.can_delete_related = False
        form.base_fields['province'].widget.can_view_related = False

        form.base_fields['municipality'].widget.can_add_related = False
        form.base_fields['municipality'].widget.can_change_related = False
        form.base_fields['municipality'].widget.can_delete_related = False
        form.base_fields['municipality'].widget.can_view_related = False

        form.base_fields['barangay'].widget.can_add_related = False
        form.base_fields['barangay'].widget.can_change_related = False
        form.base_fields['barangay'].widget.can_delete_related = False
        form.base_fields['barangay'].widget.can_view_related = False

        return form

    fieldsets = (
        ('Basic Information', {
            'fields': ('title', 'description', 'category', 'price')
        }),
        ('Property Details', {
            'fields': ('property_type', 'area_sqm', 'bedrooms', 'bathrooms', 'condition')
        }),
        ('Location', {
            'fields': ('province', 'municipality', 'barangay', 'location_display'),
            'description': 'Select location using Province → City/Municipality → Barangay hierarchy.'
        }),
        ('Management', {
            'fields': ('seller', 'status', 'featured', 'expires_at')
        }),
        ('Statistics', {
            'fields': ('views_count', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    def get_location_display(self, obj):
        """Display formatted location in list view"""
        return obj.location_display
    get_location_display.short_description = 'Location'

    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        """Filter municipality and barangay based on selected province/municipality"""
        if db_field.name == "municipality":
            # Customize label to show "City/District/Muni"
            kwargs["label"] = "City/District/Muni"
            # Get province from request if editing existing listing
            if request.resolver_match.kwargs.get('object_id'):
                from .models import Listing
                try:
                    listing = Listing.objects.get(pk=request.resolver_match.kwargs['object_id'])
                    if listing.province:
                        kwargs["queryset"] = listing.province.municipalities.filter(active=True)
                except Listing.DoesNotExist:
                    pass
        elif db_field.name == "barangay":
            # Get municipality from request if editing existing listing
            if request.resolver_match.kwargs.get('object_id'):
                from .models import Listing
                try:
                    listing = Listing.objects.get(pk=request.resolver_match.kwargs['object_id'])
                    if listing.municipality:
                        kwargs["queryset"] = listing.municipality.barangays.filter(active=True)
                except Listing.DoesNotExist:
                    pass
        return super().formfield_for_foreignkey(db_field, request, **kwargs)

    class Media:
        js = ('admin/js/listing_location_cascade.js',)


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ['user', 'location', 'verified']
    list_filter = ['verified']
    search_fields = ['user__username', 'user__email', 'location']


@admin.register(Announcement)
class AnnouncementAdmin(admin.ModelAdmin):
    list_display = ['title', 'announcement_type', 'priority', 'province', 'municipality', 'author', 'is_active', 'expiry_date', 'created_at']
    list_filter = ['is_active', 'priority', 'announcement_type', 'province', 'municipality', 'created_at']
    search_fields = ['title', 'description', 'barangay', 'author__username']
    readonly_fields = ['created_at', 'updated_at']
    date_hierarchy = 'created_at'

    fieldsets = (
        ('Basic Information', {
            'fields': ('title', 'description', 'announcement_type', 'priority')
        }),
        ('Location', {
            'fields': ('province', 'municipality', 'barangay'),
            'description': 'Select location using Province → City/Municipality → Barangay hierarchy.'
        }),
        ('Scope', {
            'fields': ('is_province_wide', 'is_municipality_wide'),
            'description': 'Set scope to broadcast announcement to wider areas.'
        }),
        ('Author & Contact', {
            'fields': ('author', 'contact_info')
        }),
        ('Status & Expiry', {
            'fields': ('is_active', 'expiry_date', 'created_at', 'updated_at')
        }),
    )

    def get_queryset(self, request):
        """Optimize queryset with related fields"""
        queryset = super().get_queryset(request)
        return queryset.select_related('province', 'municipality', 'author')

    def get_form(self, request, obj=None, **kwargs):
        """Disable add/change/delete/view buttons for location ForeignKeys"""
        form = super().get_form(request, obj, **kwargs)
        # Remove the add/edit/delete/view links for province, municipality, barangay
        form.base_fields['province'].widget.can_add_related = False
        form.base_fields['province'].widget.can_change_related = False
        form.base_fields['province'].widget.can_delete_related = False
        form.base_fields['province'].widget.can_view_related = False

        form.base_fields['municipality'].widget.can_add_related = False
        form.base_fields['municipality'].widget.can_change_related = False
        form.base_fields['municipality'].widget.can_delete_related = False
        form.base_fields['municipality'].widget.can_view_related = False

        form.base_fields['barangay'].widget.can_add_related = False
        form.base_fields['barangay'].widget.can_change_related = False
        form.base_fields['barangay'].widget.can_delete_related = False
        form.base_fields['barangay'].widget.can_view_related = False

        return form

    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        """Filter municipality and barangay based on selected province/municipality"""
        if db_field.name == "municipality":
            # Customize label to show "City/District/Muni"
            kwargs["label"] = "City/District/Muni"
            # Get province from request if editing existing announcement
            if request.resolver_match.kwargs.get('object_id'):
                try:
                    announcement = Announcement.objects.get(pk=request.resolver_match.kwargs['object_id'])
                    if announcement.province:
                        kwargs["queryset"] = announcement.province.municipalities.filter(active=True)
                except Announcement.DoesNotExist:
                    pass
        elif db_field.name == "barangay":
            # Get municipality from request if editing existing announcement
            if request.resolver_match.kwargs.get('object_id'):
                try:
                    announcement = Announcement.objects.get(pk=request.resolver_match.kwargs['object_id'])
                    if announcement.municipality:
                        kwargs["queryset"] = announcement.municipality.barangays.filter(active=True)
                except Announcement.DoesNotExist:
                    pass
        return super().formfield_for_foreignkey(db_field, request, **kwargs)

    class Media:
        js = ('admin/js/listing_location_cascade.js',)


@admin.register(ProvinceModerator)
class ProvinceModeratorAdmin(admin.ModelAdmin):
    """
    Admin interface for managing Province Moderators.
    Only superusers can access this admin.
    """
    list_display = ['user', 'province', 'is_active', 'assigned_by', 'assigned_at']
    list_filter = ['is_active', 'province', 'assigned_at']
    search_fields = ['user__username', 'user__email', 'province__name']
    readonly_fields = ['assigned_by', 'assigned_at']
    autocomplete_fields = ['province']  # Only province uses autocomplete
    ordering = ['province__name']

    fieldsets = (
        ('Assignment', {
            'fields': ('user', 'province')
        }),
        ('Status', {
            'fields': ('is_active', 'notes')
        }),
        ('Audit', {
            'fields': ('assigned_by', 'assigned_at'),
            'classes': ('collapse',)
        }),
    )

    def has_module_permission(self, request):
        """Only superusers can see this in admin index"""
        return request.user.is_superuser

    def has_view_permission(self, request, obj=None):
        """Only superusers can view"""
        return request.user.is_superuser

    def has_add_permission(self, request):
        """Only superusers can add"""
        return request.user.is_superuser

    def has_change_permission(self, request, obj=None):
        """Only superusers can change"""
        return request.user.is_superuser

    def has_delete_permission(self, request, obj=None):
        """Only superusers can delete"""
        return request.user.is_superuser

    def get_form(self, request, obj=None, **kwargs):
        """Remove add/change/delete/view buttons from user and province fields"""
        form = super().get_form(request, obj, **kwargs)
        # Remove buttons from user dropdown
        form.base_fields['user'].widget.can_add_related = False
        form.base_fields['user'].widget.can_change_related = False
        form.base_fields['user'].widget.can_delete_related = False
        form.base_fields['user'].widget.can_view_related = False
        # Remove buttons from province autocomplete
        form.base_fields['province'].widget.can_add_related = False
        form.base_fields['province'].widget.can_change_related = False
        form.base_fields['province'].widget.can_delete_related = False
        form.base_fields['province'].widget.can_view_related = False
        return form

    def save_model(self, request, obj, form, change):
        """Automatically set assigned_by to the current superuser"""
        if not change:  # Only on create
            obj.assigned_by = request.user
        super().save_model(request, obj, form, change)

        action = "updated" if change else "assigned"
        messages.success(
            request,
            f"Successfully {action} {obj.user.username} as moderator for {obj.province.name}"
        )
