from django.contrib import admin
from .models import Province, Municipality, Barangay, Category, Listing, ListingImage, UserProfile, Announcement


@admin.register(Province)
class ProvinceAdmin(admin.ModelAdmin):
    list_display = ['name', 'slug', 'active', 'featured', 'municipality_count']
    list_filter = ['active', 'featured']
    search_fields = ['name', 'description']
    prepopulated_fields = {'slug': ('name',)}

    def municipality_count(self, obj):
        return obj.municipalities.filter(active=True).count()
    municipality_count.short_description = 'Cities/Municipalities'


@admin.register(Municipality)
class MunicipalityAdmin(admin.ModelAdmin):
    list_display = ['name', 'province', 'slug', 'active']
    list_filter = ['active', 'province']
    search_fields = ['name', 'province__name']
    prepopulated_fields = {'slug': ('name',)}


@admin.register(Barangay)
class BarangayAdmin(admin.ModelAdmin):
    list_display = ['name', 'municipality', 'psgc_code', 'slug', 'active']
    list_filter = ['active', 'municipality__province']
    search_fields = ['name', 'municipality__name', 'psgc_code']
    prepopulated_fields = {'slug': ('name',)}
    list_select_related = ['municipality', 'municipality__province']


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'parent', 'active', 'order']
    list_filter = ['active', 'parent']
    search_fields = ['name', 'description']
    prepopulated_fields = {'slug': ('name',)}


class ListingImageInline(admin.TabularInline):
    model = ListingImage
    extra = 1
    fields = ['image', 'order']


@admin.register(Listing)
class ListingAdmin(admin.ModelAdmin):
    list_display = ['title', 'seller', 'property_type', 'price', 'location', 'status', 'created_at']
    list_filter = ['status', 'property_type', 'category', 'island', 'created_at']
    search_fields = ['title', 'description', 'location']
    readonly_fields = ['views_count', 'created_at', 'updated_at']
    inlines = [ListingImageInline]
    date_hierarchy = 'created_at'

    fieldsets = (
        ('Basic Information', {
            'fields': ('title', 'description', 'category', 'price')
        }),
        ('Property Details', {
            'fields': ('property_type', 'area_sqm', 'bedrooms', 'bathrooms', 'condition')
        }),
        ('Location', {
            'fields': ('island', 'location')
        }),
        ('Management', {
            'fields': ('seller', 'status', 'featured', 'expires_at')
        }),
        ('Statistics', {
            'fields': ('views_count', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


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
            'fields': ('province', 'municipality', 'barangay')
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
