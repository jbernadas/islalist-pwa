from django.contrib import admin
from .models import Category, Listing, ListingImage, UserProfile


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
