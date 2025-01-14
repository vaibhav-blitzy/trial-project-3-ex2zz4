/// <reference types="vite/client" /> // Version: 4.3.0

// Environment variable type definitions
interface ImportMetaEnv {
  // Custom application environment variables
  readonly VITE_API_URL: string;
  readonly VITE_WS_URL: string;
  readonly VITE_ENV: 'development' | 'production' | 'test';

  // Default Vite environment variables
  readonly MODE: string;
  readonly BASE_URL: string;
  readonly PROD: boolean;
  readonly DEV: boolean;
  readonly SSR: boolean;
}

// Augment ImportMeta interface
interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Image asset declarations
declare module '*.svg' {
  const content: string;
  export default content;
}

declare module '*.png' {
  const content: string;
  export default content;
}

declare module '*.jpg' {
  const content: string;
  export default content;
}

declare module '*.jpeg' {
  const content: string;
  export default content;
}

declare module '*.gif' {
  const content: string;
  export default content;
}

declare module '*.webp' {
  const content: string;
  export default content;
}

// Style asset declarations
declare module '*.css' {
  const content: { [className: string]: string };
  export default content;
}

declare module '*.scss' {
  const content: { [className: string]: string };
  export default content;
}

declare module '*.sass' {
  const content: { [className: string]: string };
  export default content;
}

// Other asset declarations
declare module '*.md' {
  const content: string;
  export default content;
}

declare module '*.txt' {
  const content: string;
  export default content;
}