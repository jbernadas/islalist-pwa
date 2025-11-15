/**
 * Regression tests for Listings component
 *
 * This test suite addresses the race condition bug where fetchListings()
 * would run before the provinces array was loaded, causing it to send
 * the province slug instead of the province name to the API.
 *
 * The fix:
 * - fetchListings() now waits for provinces.length > 0 before executing
 * - This ensures the province name is always available when needed
 * - Prevents sending incorrect slug format to the API
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

describe('Listings Component - Race Condition Fix', () => {
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
          { id: 1, name: 'Davao del Norte', slug: 'davao-del-norte' },
          { id: 2, name: 'Siquijor', slug: 'siquijor' }
        ]
      }
    });

    mockGetMunicipalities.mockResolvedValue({
      data: [
        { id: 1, name: 'City of Tagum', slug: 'city-of-tagum' },
        { id: 2, name: 'Asuncion', slug: 'asuncion' }
      ]
    });

    mockListingsGetAll.mockResolvedValue({
      data: { results: [] }
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
            results: [{ id: 1, name: 'Davao del Norte', slug: 'davao-del-norte' }]
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

    // Verify it was called with the correct province NAME (not slug)
    expect(mockListingsGetAll).toHaveBeenCalledWith(
      expect.objectContaining({
        island: 'Davao del Norte',  // NAME, not 'davao-del-norte' slug
        province: 'davao-del-norte'  // slug format for municipality filtering
      })
    );
  });

  it('should use province name from loaded data, not slug', async () => {
    mockProvincesGetAll.mockResolvedValue({
      data: {
        results: [
          { id: 1, name: 'Davao del Norte', slug: 'davao-del-norte' },
          { id: 2, name: 'Davao de Oro', slug: 'davao-de-oro' }
        ]
      }
    });

    renderListings('davao-de-oro', 'all');

    await waitFor(() => {
      expect(mockListingsGetAll).toHaveBeenCalled();
    }, { timeout: 2000 });

    // Should use "Davao de Oro" (lowercase "de"), not "Davao De Oro"
    const callArgs = mockListingsGetAll.mock.calls[0][0];
    expect(callArgs.island).toBe('Davao de Oro');
  });

  it('should show loading state while provinces are loading', async () => {
    // Make provinces loading slow
    mockProvincesGetAll.mockImplementation(() =>
      new Promise(resolve =>
        setTimeout(() => resolve({
          data: { results: [{ id: 1, name: 'Davao del Norte', slug: 'davao-del-norte' }] }
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
    // Simulate cached data in localStorage
    const cachedProvinces = [
      { id: 1, name: 'Davao del Norte', slug: 'davao-del-norte' }
    ];
    localStorage.setItem('provinces', JSON.stringify(cachedProvinces));
    localStorage.setItem('provinces_cache_time', Date.now().toString());

    renderListings('davao-del-norte', 'all');

    // Should use cached data and call listingsAPI immediately
    await waitFor(() => {
      expect(mockListingsGetAll).toHaveBeenCalled();
    }, { timeout: 2000 });

    // Should use correct province name from cache
    expect(mockListingsGetAll).toHaveBeenCalledWith(
      expect.objectContaining({
        island: 'Davao del Norte'
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

  it('should filter by municipality when not "all"', async () => {
    mockProvincesGetAll.mockResolvedValue({
      data: {
        results: [{ id: 1, name: 'Davao del Norte', slug: 'davao-del-norte' }]
      }
    });

    renderListings('davao-del-norte', 'city-of-tagum');

    await waitFor(() => {
      expect(mockListingsGetAll).toHaveBeenCalled();
    }, { timeout: 2000 });

    // Should include municipality parameter
    expect(mockListingsGetAll).toHaveBeenCalledWith(
      expect.objectContaining({
        island: 'Davao del Norte',
        province: 'davao-del-norte',
        municipality: 'city-of-tagum'
      })
    );
  });

  it('should not include municipality parameter when "all"', async () => {
    mockProvincesGetAll.mockResolvedValue({
      data: {
        results: [{ id: 1, name: 'Davao del Norte', slug: 'davao-del-norte' }]
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

  it('should preserve lowercase particles in province names', async () => {
    const testCases = [
      { slug: 'davao-del-norte', name: 'Davao del Norte' },
      { slug: 'davao-de-oro', name: 'Davao de Oro' },
      { slug: 'agusan-del-sur', name: 'Agusan del Sur' },
    ];

    for (const testCase of testCases) {
      vi.clearAllMocks();
      localStorage.clear();

      mockProvincesGetAll.mockResolvedValue({
        data: {
          results: [{ id: 1, name: testCase.name, slug: testCase.slug }]
        }
      });

      renderListings(testCase.slug, 'all');

      await waitFor(() => {
        expect(mockListingsGetAll).toHaveBeenCalled();
      }, { timeout: 2000 });

      // Should use exact province name with correct case
      const callArgs = mockListingsGetAll.mock.calls[0][0];
      expect(callArgs.island).toBe(testCase.name);
    }
  });
});
