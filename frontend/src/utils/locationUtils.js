/**
 * Location Utilities
 * Helper functions for working with location data (provinces, municipalities, barangays)
 * All functions handle slug → PSGC code conversions properly
 */

import { slugify } from './slugify';

/**
 * Find province by slug
 * @param {Array} provinces - Array of province objects
 * @param {string} slug - Province slug from URL
 * @returns {Object|null} Province object or null
 */
export const findProvinceBySlug = (provinces, slug) => {
  if (!provinces || !slug) return null;
  return provinces.find(p => p.slug === slug.toLowerCase()) || null;
};

/**
 * Find municipality by slug
 * Uses slugify to match against municipality names since municipalities
 * don't have their own slug field - the slug comes from the name
 * @param {Array} municipalities - Array of municipality objects
 * @param {string} slug - Municipality slug from URL
 * @returns {Object|null} Municipality object or null
 */
export const findMunicipalityBySlug = (municipalities, slug) => {
  if (!municipalities || !slug) return null;
  return municipalities.find(m => slugify(m.name) === slug.toLowerCase()) || null;
};

/**
 * Find barangay by ID
 * @param {Array} barangays - Array of barangay objects
 * @param {number|string} id - Barangay ID
 * @returns {Object|null} Barangay object or null
 */
export const findBarangayById = (barangays, id) => {
  if (!barangays || !id) return null;
  const numId = typeof id === 'string' ? parseInt(id) : id;
  return barangays.find(b => b.id === numId) || null;
};

/**
 * Find barangay by slug
 * @param {Array} barangays - Array of barangay objects
 * @param {string} slug - Barangay slug
 * @returns {Object|null} Barangay object or null
 */
export const findBarangayBySlug = (barangays, slug) => {
  if (!barangays || !slug) return null;
  return barangays.find(b => b.slug === slug.toLowerCase()) || null;
};

/**
 * Safely extract PSGC code from location object
 * @param {Object} locationObj - Province, municipality, or barangay object
 * @returns {string|null} PSGC code or null
 */
export const extractPSGCCode = (locationObj) => {
  return locationObj?.psgc_code || null;
};

/**
 * Build API filter parameters for location-based queries
 * @param {Object} options - Location objects
 * @param {Object} options.province - Province object
 * @param {Object} options.municipality - Municipality object
 * @param {Object} options.barangay - Barangay object
 * @returns {Object} API parameters with PSGC codes
 */
export const buildAPIFilters = ({ province = null, municipality = null, barangay = null }) => {
  const params = {};

  if (province?.psgc_code) {
    params.province = province.psgc_code;
  }

  if (municipality?.psgc_code) {
    params.municipality = municipality.psgc_code;
  }

  if (barangay?.psgc_code) {
    params.barangay = barangay.psgc_code;
  }

  return params;
};

/**
 * Build listing detail URL using listing's actual location
 * @param {Object} listing - Listing object with province_slug, municipality_slug
 * @returns {string} URL path
 */
export const buildListingURL = (listing) => {
  if (!listing?.province_slug || !listing?.municipality_slug || !listing?.id) {
    console.warn('Invalid listing object for URL building:', listing);
    return '/';
  }
  return `/${listing.province_slug}/${listing.municipality_slug}/listings/${listing.id}`;
};

/**
 * Build announcement detail URL using announcement's actual location
 * @param {Object} announcement - Announcement object with province_slug, municipality_slug
 * @returns {string} URL path
 */
export const buildAnnouncementURL = (announcement) => {
  if (!announcement?.province_slug || !announcement?.municipality_slug || !announcement?.id) {
    console.warn('Invalid announcement object for URL building:', announcement);
    return '/';
  }
  return `/${announcement.province_slug}/${announcement.municipality_slug}/announcements/${announcement.id}`;
};

/**
 * Build listing edit URL
 * @param {Object} listing - Listing object
 * @returns {string} URL path
 */
export const buildEditListingURL = (listing) => {
  if (!listing?.province_slug || !listing?.municipality_slug || !listing?.id) {
    console.warn('Invalid listing object for edit URL building:', listing);
    return '/';
  }
  return `/${listing.province_slug}/${listing.municipality_slug}/edit-listing/${listing.id}`;
};

/**
 * Build announcement edit URL
 * @param {Object} announcement - Announcement object
 * @returns {string} URL path
 */
export const buildEditAnnouncementURL = (announcement) => {
  if (!announcement?.province_slug || !announcement?.municipality_slug || !announcement?.id) {
    console.warn('Invalid announcement object for edit URL building:', announcement);
    return '/';
  }
  return `/${announcement.province_slug}/${announcement.municipality_slug}/announcements/${announcement.id}/edit`;
};

/**
 * Build municipality/city bulletin board URL
 * @param {string} provinceSlug - Province slug
 * @param {string} municipalitySlug - Municipality slug
 * @returns {string} URL path
 */
export const buildMunicipalityURL = (provinceSlug, municipalitySlug) => {
  if (!provinceSlug || !municipalitySlug) {
    console.warn('Invalid slugs for municipality URL building');
    return '/';
  }
  return `/${provinceSlug}/${municipalitySlug}`;
};

/**
 * Build barangay bulletin board URL
 * @param {string} provinceSlug - Province slug
 * @param {string} municipalitySlug - Municipality slug
 * @param {string} barangaySlug - Barangay slug
 * @returns {string} URL path
 */
export const buildBarangayURL = (provinceSlug, municipalitySlug, barangaySlug) => {
  if (!provinceSlug || !municipalitySlug || !barangaySlug) {
    console.warn('Invalid slugs for barangay URL building');
    return '/';
  }
  return `/${provinceSlug}/${municipalitySlug}/${barangaySlug}`;
};

/**
 * Build province bulletin board URL
 * @param {string} provinceSlug - Province slug
 * @returns {string} URL path
 */
export const buildProvinceURL = (provinceSlug) => {
  if (!provinceSlug) {
    console.warn('Invalid province slug for URL building');
    return '/';
  }
  return `/${provinceSlug}`;
};

/**
 * Format location display string
 * @param {Object} options - Location details
 * @param {string} options.barangay - Barangay name
 * @param {string} options.municipality - Municipality name
 * @param {string} options.province - Province name
 * @returns {string} Formatted location string
 */
export const formatLocationDisplay = ({ barangay = null, municipality, province }) => {
  const parts = [];

  if (barangay) {
    parts.push(barangay);
  }

  if (municipality) {
    parts.push(municipality);
  }

  if (province) {
    parts.push(province);
  }

  return parts.join(', ');
};

/**
 * Format display name for a province
 * Handles special cases like Metro Manila
 * @param {Object|string} province - Province object or name string
 * @returns {string} Formatted display name
 */
export const formatProvinceName = (province) => {
  if (!province) return '';

  const name = typeof province === 'string' ? province : province.name;

  if (name === 'Metro Manila (NCR)') {
    return 'Metro Manila (NCR)';
  }

  return name;
};

/**
 * Format display name for a municipality
 * @param {Object|string} municipality - Municipality object or name string
 * @returns {string} Formatted display name
 */
export const formatMunicipalityName = (municipality) => {
  if (!municipality) return '';

  const name = typeof municipality === 'string' ? municipality : municipality.name;

  if (name === 'all') {
    return 'All Cities/Municipalities';
  }

  return name;
};

/**
 * Check if municipality is City of Manila (has districts instead of barangays)
 * @param {Object} municipality - Municipality object
 * @returns {boolean} True if City of Manila
 */
export const isCityOfManila = (municipality) => {
  return municipality?.name === 'City of Manila';
};

/**
 * Get the appropriate term for sub-municipality units
 * @param {Object} municipality - Municipality object
 * @returns {string} 'Districts' or 'Barangays'
 */
export const getSubMunicipalityTerm = (municipality) => {
  return isCityOfManila(municipality) ? 'Districts' : 'Barangays';
};
