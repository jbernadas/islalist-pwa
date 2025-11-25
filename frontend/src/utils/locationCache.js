/**
 * Location Cache Utility
 * Manages caching of province/municipality/barangay data in localStorage
 * with version control and expiry
 */

const CACHE_VERSION = '3'; // Increment when cache structure changes
const CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

const CACHE_KEYS = {
  PROVINCES: 'provinces',
  PROVINCES_TIME: 'provinces_cache_time',
  PROVINCES_VERSION: 'provinces_cache_version',
};

/**
 * Check if cached data is valid
 */
export const isCacheValid = () => {
  const cachedData = localStorage.getItem(CACHE_KEYS.PROVINCES);
  const cacheTime = localStorage.getItem(CACHE_KEYS.PROVINCES_TIME);
  const cachedVersion = localStorage.getItem(CACHE_KEYS.PROVINCES_VERSION);

  if (!cachedData || !cacheTime || !cachedVersion) {
    return false;
  }

  // Check version
  if (cachedVersion !== CACHE_VERSION) {
    return false;
  }

  // Check expiry
  const now = Date.now();
  const age = now - parseInt(cacheTime);
  if (age >= CACHE_EXPIRY) {
    return false;
  }

  return true;
};

/**
 * Get cached provinces
 */
export const getCachedProvinces = () => {
  if (!isCacheValid()) {
    return null;
  }

  try {
    const cachedData = localStorage.getItem(CACHE_KEYS.PROVINCES);
    return JSON.parse(cachedData);
  } catch (error) {
    console.error('Error parsing cached provinces:', error);
    return null;
  }
};

/**
 * Set cached provinces
 */
export const setCachedProvinces = (provinces) => {
  try {
    const now = Date.now();
    localStorage.setItem(CACHE_KEYS.PROVINCES, JSON.stringify(provinces));
    localStorage.setItem(CACHE_KEYS.PROVINCES_TIME, now.toString());
    localStorage.setItem(CACHE_KEYS.PROVINCES_VERSION, CACHE_VERSION);
    return true;
  } catch (error) {
    console.error('Error caching provinces:', error);
    return false;
  }
};

/**
 * Clear location cache
 */
export const clearLocationCache = () => {
  localStorage.removeItem(CACHE_KEYS.PROVINCES);
  localStorage.removeItem(CACHE_KEYS.PROVINCES_TIME);
  localStorage.removeItem(CACHE_KEYS.PROVINCES_VERSION);
};

/**
 * Get last visited location
 */
export const getLastLocation = () => {
  return {
    province: localStorage.getItem('lastProvince'),
    municipality: localStorage.getItem('lastMunicipality'),
  };
};

/**
 * Save last visited location
 */
export const saveLastLocation = (province, municipality = null) => {
  if (province) {
    localStorage.setItem('lastProvince', province);
  }
  if (municipality) {
    localStorage.setItem('lastMunicipality', municipality);
  }
};

/**
 * Clear last visited location
 */
export const clearLastLocation = () => {
  localStorage.removeItem('lastProvince');
  localStorage.removeItem('lastMunicipality');
};
