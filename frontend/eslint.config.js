import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

const features = [
  'admin',
  'auth',
  'catalog',
  'competitions',
  'courses',
  'dashboard',
  'events',
  'home',
  'profile',
  'scholarships',
  'videohosting',
]

/**
 * These exact imports predate P0.7 and are retained until the owning shared
 * abstractions can be extracted. Keep this list path-specific: never replace
 * an entry with a feature-wide wildcard.
 */
const preExistingCrossFeatureImports = {
  admin: {
    auth: ['@/features/auth/types'],
  },
  catalog: {
    courses: ['@/features/courses/data/courseFetchers'],
    scholarships: ['@/features/scholarships/data/scholarshipFetchers'],
  },
  courses: {
    catalog: ['@/features/catalog/components/cards/CatalogCard'],
    dashboard: [
      '@/features/dashboard/data/dashboardFetchers',
      '@/features/dashboard/types',
    ],
  },
  dashboard: {
    auth: ['@/features/auth/types'],
    courses: ['@/features/courses/data/courseFetchers'],
    profile: ['@/features/profile/components/layout/ProfileView'],
    scholarships: ['@/features/scholarships/data/scholarshipFetchers'],
  },
  profile: {
    auth: [
      '@/features/auth/data/authFetchers',
      '@/features/auth/types',
    ],
  },
  scholarships: {
    dashboard: [
      '@/features/dashboard/data/dashboardFetchers',
      '@/features/dashboard/types',
    ],
  },
}

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')

function restrictedFeaturePattern(sourceFeature, targetFeature) {
  const allowedPaths = preExistingCrossFeatureImports[sourceFeature]?.[targetFeature] ?? []
  const allowedSuffixes = allowedPaths.map((path) => {
    const prefix = `@/features/${targetFeature}/`
    return `${escapeRegExp(path.slice(prefix.length))}$`
  })

  // auth/context is the identity service boundary; videohosting is the player service boundary.
  if (targetFeature === 'auth') {
    allowedSuffixes.unshift('context/.*')
  }

  const allowClause = allowedSuffixes.length > 0 ? `(?!${allowedSuffixes.join('|')})` : ''
  return {
    regex: `^@/features/${targetFeature}/${allowClause}.*`,
    message: `Feature "${sourceFeature}" must not import feature "${targetFeature}". Move shared code to @/shared, or use the documented service-feature exceptions.`,
  }
}

function featureBoundaryConfig(sourceFeature) {
  return {
    files: [`src/features/${sourceFeature}/**/*.{ts,tsx}`],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: features
            .filter((targetFeature) => targetFeature !== sourceFeature)
            .map((targetFeature) =>
              targetFeature === 'videohosting'
                ? {
                    // videohosting/* is the second documented service-feature exception.
                    regex: '^@/features/videohosting$',
                    message: 'Import the videohosting service through @/features/videohosting/*, not its bare feature path.',
                  }
                : restrictedFeaturePattern(sourceFeature, targetFeature),
            ),
        },
      ],
    },
  }
}

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
  },
  ...features.map(featureBoundaryConfig),
])
