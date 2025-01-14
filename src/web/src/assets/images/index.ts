// Image asset management following Material Design 3.0 principles
// Version: 1.0.0

// Type definitions for image options and formats
interface ImageOptions {
  format?: 'webp' | 'png' | 'svg';
  size?: number;
  quality?: number;
}

interface ImageBreakpoint {
  width: number;
  size: number;
}

// Global constants for image configuration
const IMAGE_BASE_PATH = '/assets/images/' as const;
const IMAGE_FORMATS = {
  webp: true,
  fallback: 'png'
} as const;
const IMAGE_BREAKPOINTS: ImageBreakpoint[] = [
  { width: 375, size: 1 },
  { width: 768, size: 1.5 },
  { width: 1024, size: 2 },
  { width: 1440, size: 3 }
];

// Memoization decorator for performance optimization
function memoize(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
  const originalMethod = descriptor.value;
  const cache = new Map();

  descriptor.value = function(...args: any[]) {
    const key = JSON.stringify(args);
    if (cache.has(key)) {
      return cache.get(key);
    }
    const result = originalMethod.apply(this, args);
    cache.set(key, result);
    return result;
  };

  return descriptor;
}

// Helper function to construct optimized image URLs
class ImageUrlBuilder {
  @memoize
  static getImageUrl(imageName: string, options: ImageOptions = {}): string {
    const {
      format = ImageUrlBuilder.supportsWebP() ? 'webp' : IMAGE_FORMATS.fallback,
      size = ImageUrlBuilder.getOptimalSize(),
      quality = 85
    } = options;

    const basePath = `${IMAGE_BASE_PATH}${imageName}`;
    
    if (format === 'svg') {
      return `${basePath}.svg`;
    }

    return `${basePath}-${size}x.${format}?q=${quality}`;
  }

  private static supportsWebP(): boolean {
    try {
      return document.createElement('canvas')
        .toDataURL('image/webp')
        .indexOf('data:image/webp') === 0;
    } catch (e) {
      return false;
    }
  }

  private static getOptimalSize(): number {
    const viewport = window.innerWidth;
    const breakpoint = IMAGE_BREAKPOINTS.find(bp => viewport <= bp.width) || IMAGE_BREAKPOINTS[IMAGE_BREAKPOINTS.length - 1];
    return breakpoint.size;
  }
}

// Preload critical images for performance
export async function preloadCriticalImages(imageNames: string[]): Promise<void> {
  const criticalImages = imageNames.filter(name => 
    ['logoLight', 'logoDark', 'loginBackground'].includes(name)
  );

  const preloadLinks = criticalImages.map(imageName => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = ImageUrlBuilder.getImageUrl(imageName);
    return link;
  });

  preloadLinks.forEach(link => {
    document.head.appendChild(link);
  });
}

// Export image assets with proper typing and documentation
export const logoLight = ImageUrlBuilder.getImageUrl('logo-light', { format: 'svg' });
export const logoDark = ImageUrlBuilder.getImageUrl('logo-dark', { format: 'svg' });
export const defaultAvatar = ImageUrlBuilder.getImageUrl('default-avatar', { 
  format: 'png',
  quality: 90
});
export const emptyStateTask = ImageUrlBuilder.getImageUrl('empty-state-task', { 
  format: 'svg'
});
export const emptyStateProject = ImageUrlBuilder.getImageUrl('empty-state-project', { 
  format: 'svg'
});
export const loginBackground = ImageUrlBuilder.getImageUrl('login-background', {
  format: 'svg'
});

// Export utility functions and types for external use
export { ImageUrlBuilder, type ImageOptions, type ImageBreakpoint };