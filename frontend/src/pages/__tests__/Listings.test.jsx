/**
 * Tests for Listings component
 *
 * This test suite verifies that the Listings component correctly uses
 * PSGC (Philippine Standard Geographic Code) for location filtering.
 *
 * The component:
 * - Waits for provinces to load before fetching listings
 * - Uses PSGC codes for province, municipality, and barangay filtering
 * - Handles cached provinces data correctly
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import Listings from '../Listings';

// Mock the API modules
const mockListingsGetAll = vi.fn();
const mockCategoriesGetAll = vi.fn();
const mockProvincesGetAll = vi.fn();
const mockGetMunicipalities = vi.fn();
const mockToggleFavorite = vi.fn();
const mockBarangaysGetAll = vi.fn();

const mockMunicipalitiesGetDistrictsOrBarangays = vi.fn();

vi.mock('../../services/api', () => ({
  listingsAPI: {
    getAll: (...args) => mockListingsGetAll(...args),
    toggleFavorite: (...args) => mockToggleFavorite(...args)
  },
  categoriesAPI: {
    getAll: (...args) => mockCategoriesGetAll(...args)
  },
  provincesAPI: {
    getAll: (...args) => mockProvincesGetAll(...args),
    getMunicipalities: (...args) => mockGetMunicipalities(...args)
  },
  municipalitiesAPI: {
    getDistrictsOrBarangays: (...args) => mockMunicipalitiesGetDistrictsOrBarangays(...args)
  },
  barangaysAPI: {
    getAll: (...args) => mockBarangaysGetAll(...args)
  }
}));

// Mock the AuthContext
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    isAuthenticated: false,
    user: null
  })
}));

// Helper to render Listings with router
const renderListings = (province = 'davao-del-norte', municipality = 'all') => {
  const initialRoute = `/${province}/${municipality}/listings`;

  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <Routes>
        <Route path="/:province/:municipality/listings" element={<Listings />} />
      </Routes>
    </MemoryRouter>
  );
};

describe('Listings Component - PSGC Filtering', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();

    // Clear localStorage
    localStorage.clear();

    // Setup default mock responses
    mockCategoriesGetAll.mockResolvedValue({
      data: { results: [] }
    });

    mockProvincesGetAll.mockResolvedValue({
      data: {
        results: [
          { id: 1, name: 'Davao del Norte', slug: 'davao-del-norte', psgc_code: '112300000' },
          { id: 2, name: 'Siquijor', slug: 'siquijor', psgc_code: '076100000' }
        ]
      }
    });

    mockGetMunicipalities.mockResolvedValue({
      data: [
        { id: 1, name: 'City of Tagum', slug: 'city-of-tagum', psgc_code: '112314000' },
        { id: 2, name: 'Asuncion', slug: 'asuncion', psgc_code: '112302000' }
      ]
    });

    mockListingsGetAll.mockResolvedValue({
      data: { results: [] }
    });

    mockBarangaysGetAll.mockResolvedValue({
      data: []
    });

    mockMunicipalitiesGetDistrictsOrBarangays.mockResolvedValue({
      data: []
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should wait for provinces to load before fetching listings', async () => {
    // Slow down provinces API to simulate loading delay
    mockProvincesGetAll.mockImplementation(() =>
      new Promise(resolve =>
        setTimeout(() => resolve({
          data: {
            results: [{ id: 1, name: 'Davao del Norte', slug: 'davao-del-norte', psgc_code: '112300000' }]
          }
        }), 100)
      )
    );

    renderListings('davao-del-norte', 'all');

    // Initially, listingsAPI.getAll should NOT have been called yet
    // because provinces haven't loaded
    expect(mockListingsGetAll).not.toHaveBeenCalled();

    // Wait for provinces to load
    await waitFor(() => {
      expect(mockProvincesGetAll).toHaveBeenCalled();
    }, { timeout: 2000 });

    // Now listingsAPI.getAll should have been called
    await waitFor(() => {
      expect(mockListingsGetAll).toHaveBeenCalled();
    }, { timeout: 2000 });

    // Verify it was called with the province PSGC code
    expect(mockListingsGetAll).toHaveBeenCalledWith(
      expect.objectContaining({
        province: '112300000'  // PSGC code, not slug or name
      })
    );
  });

  it('should use province PSGC code for filtering', async () => {
    mockProvincesGetAll.mockResolvedValue({
      data: {
        results: [
          { id: 1, name: 'Davao del Norte', slug: 'davao-del-norte', psgc_code: '112300000' },
          { id: 2, name: 'Davao de Oro', slug: 'davao-de-oro', psgc_code: '118200000' }
        ]
      }
    });

    renderListings('davao-de-oro', 'all');

    await waitFor(() => {
      expect(mockListingsGetAll).toHaveBeenCalled();
    }, { timeout: 2000 });

    // Should use PSGC code for Davao de Oro
    const callArgs = mockListingsGetAll.mock.calls[0][0];
    expect(callArgs.province).toBe('118200000');
  });

  it('should show loading state while provinces are loading', async () => {
    // Make provinces loading slow
    mockProvincesGetAll.mockImplementation(() =>
      new Promise(resolve =>
        setTimeout(() => resolve({
          data: { results: [{ id: 1, name: 'Davao del Norte', slug: 'davao-del-norte', psgc_code: '112300000' }] }
        }), 200)
      )
    );

    renderListings('davao-del-norte', 'all');

    // Should show loading state
    expect(screen.getByText(/Loading location data/i)).toBeInTheDocument();

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText(/Loading location data/i)).not.toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('should handle cached provinces data correctly', async () => {
    // Simulate cached data in localStorage with PSGC codes
    const cachedProvinces = [
      { id: 1, name: 'Davao del Norte', slug: 'davao-del-norte', psgc_code: '112300000' }
    ];
    localStorage.setItem('provinces', JSON.stringify(cachedProvinces));
    localStorage.setItem('provinces_cache_time', Date.now().toString());

    renderListings('davao-del-norte', 'all');

    // Should use cached data and call listingsAPI
    await waitFor(() => {
      expect(mockListingsGetAll).toHaveBeenCalled();
    }, { timeout: 2000 });

    // Should use PSGC code from cached data
    expect(mockListingsGetAll).toHaveBeenCalledWith(
      expect.objectContaining({
        province: '112300000'
      })
    );
  });

  it('should not call listingsAPI if provinces is empty array', async () => {
    // Make provincesAPI return empty array
    mockProvincesGetAll.mockResolvedValue({
      data: { results: [] }
    });

    renderListings('davao-del-norte', 'all');

    // Wait a bit to ensure no premature calls
    await new Promise(resolve => setTimeout(resolve, 200));

    // listingsAPI should not have been called with empty provinces
    expect(mockListingsGetAll).not.toHaveBeenCalled();
  });

  it('should filter by municipality PSGC code when not "all"', async () => {
    mockProvincesGetAll.mockResolvedValue({
      data: {
        results: [{ id: 1, name: 'Davao del Norte', slug: 'davao-del-norte', psgc_code: '112300000' }]
      }
    });

    mockGetMunicipalities.mockResolvedValue({
      data: [
        { id: 1, name: 'City of Tagum', slug: 'city-of-tagum', psgc_code: '112314000' }
      ]
    });

    renderListings('davao-del-norte', 'city-of-tagum');

    await waitFor(() => {
      expect(mockListingsGetAll).toHaveBeenCalled();
    }, { timeout: 2000 });

    // Should include both province and municipality PSGC codes
    expect(mockListingsGetAll).toHaveBeenCalledWith(
      expect.objectContaining({
        province: '112300000',
        municipality: '112314000'
      })
    );
  });

  it('should not include municipality parameter when "all"', async () => {
    mockProvincesGetAll.mockResolvedValue({
      data: {
        results: [{ id: 1, name: 'Davao del Norte', slug: 'davao-del-norte', psgc_code: '112300000' }]
      }
    });

    renderListings('davao-del-norte', 'all');

    await waitFor(() => {
      expect(mockListingsGetAll).toHaveBeenCalled();
    }, { timeout: 2000 });

    // Should NOT include municipality parameter
    const callArgs = mockListingsGetAll.mock.calls[0][0];
    expect(callArgs.municipality).toBeUndefined();
  });

  it('should use correct PSGC codes for different provinces', async () => {
    const testCases = [
      { slug: 'davao-del-norte', psgc_code: '112300000' },
      { slug: 'davao-de-oro', psgc_code: '118200000' },
      { slug: 'agusan-del-sur', psgc_code: '160200000' },
    ];

    for (const testCase of testCases) {
      vi.clearAllMocks();
      localStorage.clear();

      mockProvincesGetAll.mockResolvedValue({
        data: {
          results: [{ id: 1, name: 'Test Province', slug: testCase.slug, psgc_code: testCase.psgc_code }]
        }
      });

      renderListings(testCase.slug, 'all');

      await waitFor(() => {
        expect(mockListingsGetAll).toHaveBeenCalled();
      }, { timeout: 2000 });

      // Should use correct PSGC code for each province
      const callArgs = mockListingsGetAll.mock.calls[0][0];
      expect(callArgs.province).toBe(testCase.psgc_code);
    }
  });
});
