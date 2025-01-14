import type { Config } from '@jest/globals'; // @version ^29.5.0

/**
 * Comprehensive Jest configuration for React frontend application with TypeScript support
 * Configured for:
 * - TypeScript testing with ts-jest
 * - React component testing with jsdom environment
 * - Path aliasing aligned with tsconfig.json
 * - Comprehensive code coverage requirements
 * - Asset and style mocking
 * - Watch mode plugins for better DX
 */
const config: Config = {
  // Use ts-jest preset for TypeScript support
  preset: 'ts-jest',

  // Use jsdom environment for React component testing
  testEnvironment: 'jsdom',

  // Define test file locations
  roots: [
    '<rootDir>/src',
    '<rootDir>/tests'
  ],

  // Configure module path aliases to match tsconfig.json
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@components/(.*)$': '<rootDir>/src/components/$1',
    '^@pages/(.*)$': '<rootDir>/src/pages/$1',
    '^@hooks/(.*)$': '<rootDir>/src/hooks/$1',
    '^@services/(.*)$': '<rootDir>/src/services/$1',
    '^@store/(.*)$': '<rootDir>/src/store/$1',
    '^@utils/(.*)$': '<rootDir>/src/utils/$1',
    '^@interfaces/(.*)$': '<rootDir>/src/interfaces/$1',
    '^@constants/(.*)$': '<rootDir>/src/constants/$1',
    '^@validators/(.*)$': '<rootDir>/src/validators/$1',
    '^@assets/(.*)$': '<rootDir>/src/assets/$1',
    '^@styles/(.*)$': '<rootDir>/src/styles/$1',
    '^@types/(.*)$': '<rootDir>/src/types/$1',
    // Mock style and asset imports
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(jpg|jpeg|png|gif|webp|svg)$': '<rootDir>/tests/__mocks__/fileMock.js'
  },

  // Setup files to run before tests
  setupFilesAfterEnv: [
    '@testing-library/jest-dom',
    '<rootDir>/tests/setupTests.ts'
  ],

  // Test file patterns
  testMatch: [
    '**/__tests__/**/*.[jt]s?(x)',
    '**/?(*.)+(spec|test).[jt]s?(x)'
  ],

  // Supported file extensions
  moduleFileExtensions: [
    'ts',
    'tsx',
    'js',
    'jsx',
    'json',
    'node'
  ],

  // Coverage collection configuration
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/vite-env.d.ts',
    '!src/main.tsx',
    '!src/App.tsx',
    '!src/**/index.{ts,tsx}',
    '!src/types/**/*',
    '!src/interfaces/**/*'
  ],

  // Coverage thresholds enforcement
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },

  // TypeScript transformation configuration
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.json'
      }
    ]
  },

  // Transform ignore patterns
  transformIgnorePatterns: [
    '/node_modules/',
    '\\.pnp\\.[^\\/]+$'
  ],

  // Test path ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/coverage/'
  ],

  // Watch mode plugins for better developer experience
  watchPlugins: [
    'jest-watch-typeahead/filename',
    'jest-watch-typeahead/testname'
  ],

  // Global configuration for ts-jest
  globals: {
    'ts-jest': {
      tsconfig: '<rootDir>/tsconfig.json',
      diagnostics: true
    }
  }
};

export default config;