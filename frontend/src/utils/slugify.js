/**
 * Converts a string to a URL-friendly slug
 * Example: "Metro Manila (NCR)" -> "metro-manila-ncr"
 */
export const slugify = (text) => {
  if (!text) return '';

  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove special characters (keeps alphanumeric, spaces, hyphens)
    .replace(/\s+/g, '-')      // Replace spaces with hyphens
    .replace(/-+/g, '-')       // Replace multiple hyphens with single hyphen
    .trim();
};

/**
 * Converts a slug back to display name
 * Example: "metro-manila-ncr" -> "Metro Manila Ncr"
 */
export const unslugify = (slug) => {
  if (!slug) return '';

  return slug
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};
