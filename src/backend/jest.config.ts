import type { Config } from '@jest/types';
import { pathsToModuleNameMapper } from 'ts-jest';
// @ts-expect-error - tsconfig is a JSON file
import { compilerOptions } from './tsconfig.json';

/**
 * Root Jest configuration for backend microservices
 * Version compatibility:
 * - jest: ^29.x
 * - ts-jest: ^29.x
 * - @jest/types: ^29.x
 */
const jestConfig: Config.InitialOptions = {
  // Use ts-jest preset for TypeScript support
  preset: 'ts-jest',
  
  // Set Node.js as test environment
  testEnvironment: 'node',
  
  // Define test file locations
  roots: ['<rootDir>/src', '<rootDir>/test'],
  
  // Test file patterns
  testMatch: [
    '**/__tests__/**/*.ts',
    '**/?(*.)+(spec|test).ts'
  ],
  
  // TypeScript transformation configuration
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: 'tsconfig.json',
      diagnostics: true
    }]
  },
  
  // Module path mappings from tsconfig
  moduleNameMapper: pathsToModuleNameMapper(compilerOptions.paths, {
    prefix: '<rootDir>/src/'
  }),
  
  // Supported file extensions
  moduleFileExtensions: ['ts', 'js', 'json'],
  
  // Code coverage configuration
  collectCoverage: true,
  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: [
    'text',
    'lcov',
    'json-summary',
    'html'
  ],
  
  // Enhanced coverage thresholds (85%)
  coverageThreshold: {
    global: {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85
    }
  },
  
  // Test setup and teardown
  setupFilesAfterEnv: [
    '<rootDir>/test/setup.ts',
    '<rootDir>/test/globalTeardown.ts'
  ],
  
  // Mock behavior
  clearMocks: true,
  restoreMocks: true,
  
  // Test execution configuration
  verbose: true,
  testTimeout: 10000,
  maxWorkers: process.env.CI === 'true' ? '50%' : '25%',
  errorOnDeprecated: true,
  detectOpenHandles: true,
  forceExit: true,
  
  // Cache configuration
  cacheDirectory: '<rootDir>/.jest-cache',
  
  // TypeScript-specific settings
  globals: {
    'ts-jest': {
      isolatedModules: true,
      diagnostics: {
        warnOnly: true
      }
    }
  },
  
  // Test reporting
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: 'test-results/jest',
      outputName: 'results.xml'
    }]
  ]
};

export default jestConfig;