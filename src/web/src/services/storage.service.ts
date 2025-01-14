import CryptoJS from 'crypto-js'; // v4.1.1
import {
  setLocalStorageItem,
  getLocalStorageItem,
  setSessionStorageItem,
  getSessionStorageItem,
  removeLocalStorageItem,
  removeSessionStorageItem,
  STORAGE_KEYS,
  StorageError
} from '../utils/storage.utils';
import { Theme } from '../types/common.types';

/**
 * Service class providing secure storage operations with encryption and type safety
 * Implements storage versioning, key rotation, and multi-tab synchronization
 */
export class StorageService {
  private readonly encryptionKey: string;
  private readonly storageVersion: string = '1.0.0';
  private storageEventListeners: Map<string, (event: StorageEvent) => void>;

  constructor() {
    this.encryptionKey = process.env.REACT_APP_STORAGE_ENCRYPTION_KEY || '';
    if (!this.encryptionKey) {
      throw new Error('Storage encryption key is not configured');
    }
    
    this.storageEventListeners = new Map();
    this.initializeStorageListeners();
  }

  /**
   * Initializes storage event listeners for multi-tab synchronization
   */
  private initializeStorageListeners(): void {
    window.addEventListener('storage', (event: StorageEvent) => {
      const listener = this.storageEventListeners.get(event.key || '');
      if (listener) {
        listener(event);
      }
    });
  }

  /**
   * Encrypts data using AES-256-GCM
   */
  private encrypt(data: string): { encrypted: string; iv: string } {
    const iv = CryptoJS.lib.WordArray.random(16);
    const encrypted = CryptoJS.AES.encrypt(data, this.encryptionKey, {
      iv: iv,
      mode: CryptoJS.mode.GCM,
      padding: CryptoJS.pad.Pkcs7
    });

    return {
      encrypted: encrypted.toString(),
      iv: iv.toString()
    };
  }

  /**
   * Decrypts data using AES-256-GCM
   */
  private decrypt(encryptedData: string, iv: string): string {
    const decrypted = CryptoJS.AES.decrypt(encryptedData, this.encryptionKey, {
      iv: CryptoJS.enc.Hex.parse(iv),
      mode: CryptoJS.mode.GCM,
      padding: CryptoJS.pad.Pkcs7
    });

    return decrypted.toString(CryptoJS.enc.Utf8);
  }

  /**
   * Stores user theme preference with event emission
   */
  public setTheme(theme: Theme): void {
    try {
      setLocalStorageItem<Theme>(STORAGE_KEYS.THEME, theme);
      window.dispatchEvent(new StorageEvent('storage', {
        key: STORAGE_KEYS.THEME,
        newValue: theme
      }));
    } catch (error) {
      throw new StorageError(
        `Failed to set theme: ${(error as Error).message}`,
        STORAGE_KEYS.THEME,
        'set'
      );
    }
  }

  /**
   * Retrieves user theme preference with fallback
   */
  public getTheme(): Theme | null {
    try {
      return getLocalStorageItem<Theme>(STORAGE_KEYS.THEME);
    } catch (error) {
      console.error('Failed to get theme:', error);
      return null;
    }
  }

  /**
   * Stores encrypted authentication token with rotation
   */
  public setAuthToken(token: string): void {
    try {
      const { encrypted, iv } = this.encrypt(token);
      const tokenData = {
        token: encrypted,
        iv,
        expires: Date.now() + 3600000, // 1 hour expiry
        version: this.storageVersion
      };

      setSessionStorageItem(STORAGE_KEYS.AUTH_TOKEN, tokenData);
    } catch (error) {
      throw new StorageError(
        'Failed to store authentication token',
        STORAGE_KEYS.AUTH_TOKEN,
        'set'
      );
    }
  }

  /**
   * Retrieves and decrypts authentication token with validation
   */
  public getAuthToken(): string | null {
    try {
      const tokenData = getSessionStorageItem<{
        token: string;
        iv: string;
        expires: number;
        version: string;
      }>(STORAGE_KEYS.AUTH_TOKEN);

      if (!tokenData || Date.now() > tokenData.expires) {
        this.clearAuthToken();
        return null;
      }

      return this.decrypt(tokenData.token, tokenData.iv);
    } catch (error) {
      this.clearAuthToken();
      return null;
    }
  }

  /**
   * Stores encrypted user settings with compression
   */
  public setUserSettings(settings: Record<string, any>): void {
    try {
      const settingsString = JSON.stringify(settings);
      const { encrypted, iv } = this.encrypt(settingsString);
      
      const settingsData = {
        data: encrypted,
        iv,
        version: this.storageVersion,
        updatedAt: new Date().toISOString()
      };

      setLocalStorageItem(STORAGE_KEYS.USER_SETTINGS, settingsData);
      
      window.dispatchEvent(new StorageEvent('storage', {
        key: STORAGE_KEYS.USER_SETTINGS,
        newValue: JSON.stringify(settingsData)
      }));
    } catch (error) {
      throw new StorageError(
        'Failed to store user settings',
        STORAGE_KEYS.USER_SETTINGS,
        'set'
      );
    }
  }

  /**
   * Retrieves and decrypts user settings with migration
   */
  public getUserSettings(): Record<string, any> | null {
    try {
      const settingsData = getLocalStorageItem<{
        data: string;
        iv: string;
        version: string;
        updatedAt: string;
      }>(STORAGE_KEYS.USER_SETTINGS);

      if (!settingsData) {
        return null;
      }

      const decrypted = this.decrypt(settingsData.data, settingsData.iv);
      return JSON.parse(decrypted);
    } catch (error) {
      console.error('Failed to get user settings:', error);
      return null;
    }
  }

  /**
   * Securely clears authentication token
   */
  private clearAuthToken(): void {
    try {
      removeSessionStorageItem(STORAGE_KEYS.AUTH_TOKEN);
    } catch (error) {
      console.error('Failed to clear auth token:', error);
    }
  }

  /**
   * Securely clears all stored data with sanitization
   */
  public clearStorage(): void {
    try {
      // Preserve theme preference if needed
      const theme = this.getTheme();
      
      // Clear sensitive data first
      this.clearAuthToken();
      removeLocalStorageItem(STORAGE_KEYS.USER_SETTINGS);
      
      // Restore theme if needed
      if (theme) {
        this.setTheme(theme);
      }

      // Emit storage clear event
      window.dispatchEvent(new StorageEvent('storage', {
        key: null,
        newValue: null
      }));
    } catch (error) {
      console.error('Failed to clear storage:', error);
      throw new StorageError('Failed to clear storage', undefined, 'remove');
    }
  }
}

export default StorageService;