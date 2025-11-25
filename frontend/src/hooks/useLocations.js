/**
 * useLocations Hook
 * Custom React hook for managing location data (provinces, municipalities, barangays)
 * Handles fetching, caching, and providing location lookups
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { provincesAPI, municipalitiesAPI, barangaysAPI } from '../services/api';
import {
  getCachedProvinces,
  setCachedProvinces,
  saveLastLocation
} from '../utils/locationCache';
import {
  findProvinceBySlug,
  findMunicipalityBySlug,
  findBarangayById,
  findBarangayBySlug,
  buildAPIFilters,
  formatProvinceName,
  formatMunicipalityName,
  isCityOfManila,
  getSubMunicipalityTerm
} from '../utils/locationUtils';

/**
 * useLocations Hook
 * @param {string} provinceSlug - Province slug from URL params (optional)
 * @param {string} municipalitySlug - Municipality slug from URL params (optional)
 * @param {string|number} barangayId - Barangay ID or slug from URL params (optional)
 * @returns {Object} Location data and utilities
 */
export const useLocations = (provinceSlug = null, municipalitySlug = null, barangayId = null) => {
  // State
  const [provinces, setProvinces] = useState([]);
  const [municipalities, setMunicipalities] = useState([]);
  const [barangays, setBarangays] = useState([]);

  // Loading states
  const [loadingProvinces, setLoadingProvinces] = useState(true);
  const [loadingMunicipalities, setLoadingMunicipalities] = useState(false);
  const [loadingBarangays, setLoadingBarangays] = useState(false);

  // Error states
  const [error, setError] = useState(null);

  // Fetch provinces (with caching)
  useEffect(() => {
    const fetchProvinces = async () => {
      try {
        setLoadingProvinces(true);
        setError(null);

        // Try cache first
        const cachedData = getCachedProvinces();
        if (cachedData) {
          setProvinces(cachedData);
          setLoadingProvinces(false);
          return;
        }

        // Fetch from API
        const response = await provincesAPI.getAll();
        const provincesData = response.data.results || response.data;
        const provincesArray = Array.isArray(provincesData) ? provincesData : [];

        setProvinces(provincesArray);
        setCachedProvinces(provincesArray);
      } catch (err) {
        console.error('Error fetching provinces:', err);
        setError(err);
        setProvinces([]);
      } finally {
        setLoadingProvinces(false);
      }
    };

    fetchProvinces();
  }, []);

  // Fetch municipalities when province changes
  useEffect(() => {
    const fetchMunicipalities = async () => {
      if (!provinceSlug || provinces.length === 0) {
        setMunicipalities([]);
        return;
      }

      try {
        setLoadingMunicipalities(true);
        setError(null);

        const currentProvince = findProvinceBySlug(provinces, provinceSlug);
        if (!currentProvince) {
          console.warn('Province not found:', provinceSlug);
          setMunicipalities([]);
          return;
        }

        const response = await provincesAPI.getMunicipalities(currentProvince.slug);
        const municipalitiesData = response.data;
        setMunicipalities(Array.isArray(municipalitiesData) ? municipalitiesData : []);

        // Save to localStorage for "last visited" feature
        saveLastLocation(provinceSlug, municipalitySlug);
      } catch (err) {
        console.error('Error fetching municipalities:', err);
        setError(err);
        setMunicipalities([]);
      } finally {
        setLoadingMunicipalities(false);
      }
    };

    fetchMunicipalities();
  }, [provinceSlug, provinces, municipalitySlug]);

  // Fetch barangays when municipality changes
  useEffect(() => {
    const fetchBarangays = async () => {
      if (!provinceSlug || !municipalitySlug || municipalitySlug === 'all' || municipalities.length === 0) {
        setBarangays([]);
        return;
      }

      try {
        setLoadingBarangays(true);
        setError(null);

        const currentMunicipality = findMunicipalityBySlug(municipalities, municipalitySlug);
        if (!currentMunicipality) {
          console.warn('Municipality not found:', municipalitySlug);
          setBarangays([]);
          return;
        }

        // Use PSGC code for lookup (handles duplicate municipality names)
        const municipalityIdentifier = currentMunicipality.psgc_code || currentMunicipality.slug;
        const response = await municipalitiesAPI.getDistrictsOrBarangays(municipalityIdentifier);
        const barangaysData = response.data || [];
        setBarangays(Array.isArray(barangaysData) ? barangaysData : []);
      } catch (err) {
        console.error('Error fetching barangays:', err);
        setError(err);
        setBarangays([]);
      } finally {
        setLoadingBarangays(false);
      }
    };

    fetchBarangays();
  }, [provinceSlug, municipalitySlug, municipalities]);

  // Derived values - current location objects
  const currentProvince = useMemo(() => {
    if (!provinceSlug || provinces.length === 0) return null;
    return findProvinceBySlug(provinces, provinceSlug);
  }, [provinces, provinceSlug]);

  const currentMunicipality = useMemo(() => {
    if (!municipalitySlug || municipalitySlug === 'all' || municipalities.length === 0) return null;
    return findMunicipalityBySlug(municipalities, municipalitySlug);
  }, [municipalities, municipalitySlug]);

  const currentBarangay = useMemo(() => {
    if (!barangayId || barangays.length === 0) return null;
    // Try ID first, then slug
    return findBarangayById(barangays, barangayId) || findBarangayBySlug(barangays, barangayId);
  }, [barangays, barangayId]);

  // Display names
  const displayProvinceName = useMemo(() => {
    if (!currentProvince) {
      return provinceSlug
        ? provinceSlug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
        : '';
    }
    return formatProvinceName(currentProvince);
  }, [currentProvince, provinceSlug]);

  const displayMunicipalityName = useMemo(() => {
    if (municipalitySlug === 'all') {
      return 'All Cities/Municipalities';
    }
    if (!currentMunicipality) {
      return municipalitySlug
        ? municipalitySlug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
        : '';
    }
    return formatMunicipalityName(currentMunicipality);
  }, [currentMunicipality, municipalitySlug]);

  const displayBarangayName = useMemo(() => {
    return currentBarangay?.name || '';
  }, [currentBarangay]);

  // Check if current municipality is City of Manila
  const isManila = useMemo(() => {
    return isCityOfManila(currentMunicipality);
  }, [currentMunicipality]);

  // Get appropriate term for barangays/districts
  const subMunicipalityTerm = useMemo(() => {
    return getSubMunicipalityTerm(currentMunicipality);
  }, [currentMunicipality]);

  // Utility function: Build API filter parameters
  const buildAPIParams = useCallback(() => {
    return buildAPIFilters({
      province: currentProvince,
      municipality: currentMunicipality,
      barangay: currentBarangay
    });
  }, [currentProvince, currentMunicipality, currentBarangay]);

  // Utility function: Get province by slug
  const getProvinceBySlug = useCallback((slug) => {
    return findProvinceBySlug(provinces, slug);
  }, [provinces]);

  // Utility function: Get municipality by slug
  const getMunicipalityBySlug = useCallback((slug) => {
    return findMunicipalityBySlug(municipalities, slug);
  }, [municipalities]);

  // Utility function: Get barangay by ID
  const getBarangayById = useCallback((id) => {
    return findBarangayById(barangays, id);
  }, [barangays]);

  // Overall loading state
  const loading = loadingProvinces || loadingMunicipalities || loadingBarangays;

  return {
    // Data arrays
    provinces,
    municipalities,
    barangays,

    // Current location objects
    currentProvince,
    currentMunicipality,
    currentBarangay,

    // Loading states
    loading,
    loadingProvinces,
    loadingMunicipalities,
    loadingBarangays,

    // Error state
    error,

    // Display names
    displayProvinceName,
    displayMunicipalityName,
    displayBarangayName,

    // Special flags
    isManila,
    subMunicipalityTerm,

    // Utility functions
    buildAPIParams,
    getProvinceBySlug,
    getMunicipalityBySlug,
    getBarangayById,
  };
};

export default useLocations;
