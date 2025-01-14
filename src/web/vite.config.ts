// vite v4.3.0
import { defineConfig } from 'vite';
// @vitejs/plugin-react v4.0.0
import react from '@vitejs/plugin-react';
// node:path
import { resolve } from 'path';

export default defineConfig({
  // React plugin configuration with Fast Refresh and production optimizations
  plugins: [
    react({
      // Enable Fast Refresh for development productivity
      fastRefresh: true,
      // Babel configuration for optimal React compilation
      babel: {
        plugins: ['@babel/plugin-transform-react-jsx'],
        targets: {
          node: 'current'
        }
      }
    })
  ],

  // Path resolution configuration for project organization
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@components': resolve(__dirname, 'src/components'),
      '@pages': resolve(__dirname, 'src/pages'),
      '@hooks': resolve(__dirname, 'src/hooks'),
      '@services': resolve(__dirname, 'src/services'),
      '@store': resolve(__dirname, 'src/store'),
      '@utils': resolve(__dirname, 'src/utils'),
      '@interfaces': resolve(__dirname, 'src/interfaces'),
      '@constants': resolve(__dirname, 'src/constants'),
      '@validators': resolve(__dirname, 'src/validators'),
      '@assets': resolve(__dirname, 'src/assets'),
      '@styles': resolve(__dirname, 'src/styles'),
      '@types': resolve(__dirname, 'src/types')
    }
  },

  // Development server configuration
  server: {
    port: 3000,
    strictPort: true,
    // Enable host for container support
    host: true,
    // CORS configuration for API integration
    cors: true,
    // Hot Module Replacement configuration
    hmr: {
      overlay: true
    },
    // File watching configuration for containers
    watch: {
      usePolling: true
    }
  },

  // Production build configuration
  build: {
    // Output directory for production builds
    outDir: 'dist',
    // Generate source maps for debugging
    sourcemap: true,
    // Use Terser for optimal minification
    minify: 'terser',
    // Target modern browsers for better performance
    target: 'esnext',
    // Increase chunk size warning limit
    chunkSizeWarningLimit: 1000,
    // Rollup-specific configuration
    rollupOptions: {
      output: {
        // Manual chunk splitting for optimal loading
        manualChunks: {
          // Vendor chunk for third-party dependencies
          vendor: ['react', 'react-dom'],
          // Feature-based code splitting
          components: ['@components/**'],
          store: ['@store/**']
        }
      }
    },
    // Terser optimization options
    terserOptions: {
      compress: {
        // Remove console and debugger statements in production
        drop_console: true,
        drop_debugger: true
      }
    }
  },

  // Preview server configuration for production testing
  preview: {
    port: 3000,
    strictPort: true,
    host: true
  },

  // Dependency optimization configuration
  optimizeDeps: {
    // Include common dependencies for optimization
    include: ['react', 'react-dom'],
    // Exclude type definitions from optimization
    exclude: ['@types/*']
  },

  // Environment variable handling
  envPrefix: 'VITE_',
  
  // Performance optimizations
  esbuild: {
    // Enable JSX optimization
    jsxInject: `import React from 'react'`,
    // Target modern browsers
    target: 'esnext',
    // Enable minification
    minify: true
  }
});