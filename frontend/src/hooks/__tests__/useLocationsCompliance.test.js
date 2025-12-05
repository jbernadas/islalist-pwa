/**
 * useLocations Hook Compliance Test
 *
 * This test ensures all location-related components use the centralized
 * useLocations hook instead of direct API calls or duplicate caching logic.
 *
 * The useLocations hook is the single source of truth for:
 * - Fetching provinces, municipalities, and barangays
 * - Using PSGC codes for lookups (avoids slug collisions like 6 "san-juan" municipalities)
 * - Centralized caching via locationCache.js
 */

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Components that should use useLocations hook
const COMPONENTS_REQUIRING_HOOK = [
  'CityMunBulletinBoard.jsx',
  'BarangayBulletinBoard.jsx',
  'Province.jsx',
  'Listings.jsx',
  'Announcements.jsx',
  'CreateListing.jsx',
  'EditListing.jsx',
  'CreateAnnouncement.jsx',
  'EditAnnouncement.jsx',
];

// Patterns that indicate direct API usage instead of hook (violations)
const VIOLATION_PATTERNS = [
  {
    pattern: /const\s+\[provinces,\s*setProvinces\]\s*=\s*useState/,
    message: 'Direct provinces state management (should use useLocations)',
    allowedIn: [], // Not allowed in any component
  },
  {
    pattern: /localStorage\.getItem\(['"]provinces['"]\)/,
    message: 'Direct localStorage access for provinces (should use locationCache.js via hook)',
    allowedIn: [], // Not allowed in any component
  },
  {
    pattern: /localStorage\.setItem\(['"]provinces/,
    message: 'Direct localStorage write for provinces (should use locationCache.js via hook)',
    allowedIn: [],
  },
  {
    pattern: /CACHE_VERSION\s*=\s*['"]/,
    message: 'Inline CACHE_VERSION definition (should use centralized locationCache.js)',
    allowedIn: [],
  },
  {
    pattern: /provincesAPI\.getAll\(\)/,
    message: 'Direct provincesAPI.getAll() call (should use useLocations hook)',
    allowedIn: [],
  },
  {
    pattern: /provincesAPI\.getMunicipalities\(/,
    message: 'Direct provincesAPI.getMunicipalities() call',
    // Forms need this for dynamic province changes when user selects different province
    allowedIn: ['CreateListing.jsx', 'EditListing.jsx', 'CreateAnnouncement.jsx', 'EditAnnouncement.jsx'],
  },
  {
    pattern: /municipalitiesAPI\.getDistrictsOrBarangays\(/,
    message: 'Direct municipalitiesAPI.getDistrictsOrBarangays() call (should use useLocations hook)',
    allowedIn: [],
  },
];

// Patterns that indicate correct hook usage
const REQUIRED_PATTERNS = [
  {
    pattern: /import\s*{[^}]*useLocations[^}]*}\s*from\s*['"][^'"]*useLocations['"]/,
    message: 'Must import useLocations hook',
  },
  {
    pattern: /useLocations\s*\(/,
    message: 'Must call useLocations hook',
  },
];

const PAGES_DIR = path.join(__dirname, '..', '..', 'pages');
const HOOKS_DIR = path.join(__dirname, '..');
const UTILS_DIR = path.join(__dirname, '..', '..', 'utils');

describe('useLocations Hook Compliance', () => {
  describe('All location components use useLocations hook', () => {
    COMPONENTS_REQUIRING_HOOK.forEach((componentName) => {
      describe(componentName, () => {
        const filePath = path.join(PAGES_DIR, componentName);
        let fileContent;

        try {
          fileContent = fs.readFileSync(filePath, 'utf-8');
        } catch (e) {
          fileContent = null;
        }

        it('file should exist', () => {
          expect(fileContent).not.toBeNull();
        });

        if (fileContent) {
          // Check for required patterns
          REQUIRED_PATTERNS.forEach(({ pattern, message }) => {
            it(message, () => {
              expect(fileContent).toMatch(pattern);
            });
          });

          // Check for violation patterns
          VIOLATION_PATTERNS.forEach(({ pattern, message, allowedIn }) => {
            if (!allowedIn.includes(componentName)) {
              it(`should NOT have: ${message}`, () => {
                expect(fileContent).not.toMatch(pattern);
              });
            }
          });
        }
      });
    });
  });

  describe('locationCache.js is the single source for caching', () => {
    const cacheFilePath = path.join(UTILS_DIR, 'locationCache.js');
    let cacheContent;

    try {
      cacheContent = fs.readFileSync(cacheFilePath, 'utf-8');
    } catch (e) {
      cacheContent = null;
    }

    it('locationCache.js should exist', () => {
      expect(cacheContent).not.toBeNull();
    });

    it('should define CACHE_VERSION', () => {
      // CACHE_VERSION can be private (not exported) as long as it's centralized here
      expect(cacheContent).toMatch(/CACHE_VERSION\s*=\s*['"]/);
    });

    it('should export getCachedProvinces', () => {
      expect(cacheContent).toMatch(/export\s+(const|function|let|var)\s+getCachedProvinces/);
    });

    it('should export setCachedProvinces', () => {
      expect(cacheContent).toMatch(/export\s+(const|function|let|var)\s+setCachedProvinces/);
    });
  });

  describe('useLocations hook uses PSGC codes for lookups', () => {
    const hookFilePath = path.join(HOOKS_DIR, 'useLocations.js');
    let hookContent;

    try {
      hookContent = fs.readFileSync(hookFilePath, 'utf-8');
    } catch (e) {
      hookContent = null;
    }

    it('useLocations.js should exist', () => {
      expect(hookContent).not.toBeNull();
    });

    it('should reference psgc_code for lookups', () => {
      expect(hookContent).toMatch(/psgc_code/);
    });

    it('should use PSGC code for municipality identification to avoid slug collisions', () => {
      // The hook should prioritize psgc_code over slug for municipality lookups
      expect(hookContent).toMatch(/municipalityIdentifier\s*=.*psgc_code/);
    });
  });

  describe('No duplicate location fetching logic in display components', () => {
    const displayComponents = [
      'CityMunBulletinBoard.jsx',
      'BarangayBulletinBoard.jsx',
      'Province.jsx',
      'Listings.jsx',
      'Announcements.jsx',
    ];

    displayComponents.forEach((componentName) => {
      it(`${componentName} should not have fetchLocations function`, () => {
        const filePath = path.join(PAGES_DIR, componentName);
        let content;
        try {
          content = fs.readFileSync(filePath, 'utf-8');
        } catch (e) {
          content = null;
        }

        if (content) {
          expect(content).not.toMatch(/const\s+fetchLocations\s*=/);
          expect(content).not.toMatch(/function\s+fetchLocations\s*\(/);
        }
      });
    });
  });

  describe('Form components use formMunicipalities/formBarangays for dynamic changes', () => {
    const formComponents = [
      'CreateListing.jsx',
      'EditListing.jsx',
      'CreateAnnouncement.jsx',
      'EditAnnouncement.jsx',
    ];

    formComponents.forEach((componentName) => {
      it(`${componentName} should have form-specific state for user-driven changes`, () => {
        const filePath = path.join(PAGES_DIR, componentName);
        let content;
        try {
          content = fs.readFileSync(filePath, 'utf-8');
        } catch (e) {
          content = null;
        }

        if (content) {
          // Form components should have form-specific state for user-driven changes
          expect(content).toMatch(/formMunicipalities|formBarangays/);
        }
      });
    });
  });
});

describe('Slug collision prevention', () => {
  it('useLocations hook comment documents PSGC usage for avoiding collisions', () => {
    const hookFilePath = path.join(HOOKS_DIR, 'useLocations.js');
    let hookContent;
    try {
      hookContent = fs.readFileSync(hookFilePath, 'utf-8');
    } catch (e) {
      hookContent = '';
    }

    // The hook should document that it handles duplicate municipality names
    expect(hookContent).toMatch(/duplicate|collision|PSGC/i);
  });

  it('components using hook should have comment about PSGC/collision avoidance', () => {
    const components = [
      'CityMunBulletinBoard.jsx',
      'BarangayBulletinBoard.jsx',
      'Listings.jsx',
    ];

    components.forEach((componentName) => {
      const filePath = path.join(PAGES_DIR, componentName);
      let content;
      try {
        content = fs.readFileSync(filePath, 'utf-8');
      } catch (e) {
        content = '';
      }

      // Components should document why they use the hook
      expect(content).toMatch(/PSGC|slug collision|avoiding.*collision/i);
    });
  });
});

describe('Import consistency', () => {
  it('all components should import useLocations from the same path', () => {
    const expectedImportPattern = /from\s*['"]\.\.\/hooks\/useLocations['"]/;

    COMPONENTS_REQUIRING_HOOK.forEach((componentName) => {
      const filePath = path.join(PAGES_DIR, componentName);
      let content;
      try {
        content = fs.readFileSync(filePath, 'utf-8');
      } catch (e) {
        content = '';
      }

      if (content) {
        expect(content).toMatch(expectedImportPattern);
      }
    });
  });
});
