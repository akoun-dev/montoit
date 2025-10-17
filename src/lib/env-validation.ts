/**
 * Environment Variables Validation & Security
 * Centralized validation for all environment variables
 */

interface EnvVarConfig {
  name: string;
  required: boolean;
  pattern?: RegExp;
  description: string;
  isSecret?: boolean;
}

const ENV_VARS: EnvVarConfig[] = [
  {
    name: 'VITE_SUPABASE_URL',
    required: true,
    pattern: /^https:\/\/[a-zA-Z0-9.-]*\.supabase\.(co|in)$/,
    description: 'Supabase project URL',
    isSecret: false
  },
  {
    name: 'VITE_SUPABASE_PUBLISHABLE_KEY',
    required: true,
    pattern: /^eyJ[a-zA-Z0-9._-]*\.eyJ[a-zA-Z0-9._-]*$/,
    description: 'Supabase publishable key',
    isSecret: true
  },
  {
    name: 'VITE_MAPBOX_TOKEN',
    required: false,
    pattern: /^pk\.[a-zA-Z0-9.-_]+$/,
    description: 'Mapbox public token',
    isSecret: true
  },
  {
    name: 'VITE_MAPBOX_PUBLIC_TOKEN',
    required: false,
    pattern: /^pk\.[a-zA-Z0-9.-_]+$/,
    description: 'Mapbox public token (alternative)',
    isSecret: true
  },
  {
    name: 'VITE_SENTRY_DSN',
    required: false,
    pattern: /^https:\/\/[a-f0-9]{32}@[a-zA-Z0-9.-]+\/[0-9]+$/,
    description: 'Sentry DSN for error tracking',
    isSecret: true
  },
  {
    name: 'VITE_APP_URL',
    required: false,
    pattern: /^https?:\/\/[a-zA-Z0-9.-]+$/,
    description: 'Application base URL',
    isSecret: false
  }
];

class EnvValidator {
  private validatedVars: Map<string, string> = new Map();
  private validationErrors: string[] = [];

  /**
   * Validate all environment variables
   */
  validate(): { success: boolean; errors: string[] } {
    this.validationErrors = [];
    this.validatedVars.clear();

    for (const envVar of ENV_VARS) {
      this.validateSingleVar(envVar);
    }

    // Log warnings for missing optional vars
    const missingOptional = ENV_VARS.filter(
      v => !v.required && !import.meta.env[v.name]
    );

    if (missingOptional.length > 0) {
      console.warn('Optional environment variables not set:',
        missingOptional.map(v => v.name).join(', ')
      );
    }

    if (this.validationErrors.length > 0) {
      console.error('Environment validation failed:', this.validationErrors);
    }

    return {
      success: this.validationErrors.length === 0,
      errors: [...this.validationErrors]
    };
  }

  private validateSingleVar(config: EnvVarConfig): void {
    const value = import.meta.env[config.name];

    if (!value) {
      if (config.required) {
        this.validationErrors.push(
          `Required environment variable ${config.name} is missing. ${config.description}`
        );
      }
      return;
    }

    // Validate pattern if specified
    if (config.pattern && !config.pattern.test(value)) {
      this.validationErrors.push(
        `Environment variable ${config.name} has invalid format. ${config.description}`
      );
      return;
    }

    // Store validated value
    this.validatedVars.set(config.name, value);

    // Security warnings for secrets in development
    if (config.isSecret && import.meta.env.DEV) {
      console.warn(`⚠️ Secret environment variable ${config.name} is loaded in development`);
    }
  }

  /**
   * Get a validated environment variable
   */
  get(name: string): string | undefined {
    return this.validatedVars.get(name);
  }

  /**
   * Get a required environment variable or throw
   */
  getRequired(name: string): string {
    const value = this.get(name);
    if (!value) {
      throw new Error(`Required environment variable ${name} is not available`);
    }
    return value;
  }

  /**
   * Check if all required variables are present
   */
  hasRequiredVars(): boolean {
    return ENV_VARS
      .filter(v => v.required)
      .every(v => this.validatedVars.has(v.name));
  }

  /**
   * Get masked values for logging (hides secrets)
   */
  getMaskedEnv(): Record<string, string> {
    const masked: Record<string, string> = {};

    for (const config of ENV_VARS) {
      const value = this.get(config.name);
      if (value) {
        masked[config.name] = config.isSecret ? this.maskSecret(value) : value;
      }
    }

    return masked;
  }

  private maskSecret(secret: string): string {
    if (secret.length <= 8) {
      return '*'.repeat(secret.length);
    }
    return secret.substring(0, 4) + '*'.repeat(secret.length - 8) + secret.substring(secret.length - 4);
  }

  /**
   * Validate runtime environment
   */
  validateRuntime(): { isSecure: boolean; warnings: string[] } {
    const warnings: string[] = [];
    let isSecure = true;

    // Check for HTTPS in production
    if (import.meta.env.PROD && location.protocol !== 'https:') {
      warnings.push('Application is running in production without HTTPS');
      isSecure = false;
    }

    // Check for console access in production
    if (import.meta.env.PROD && window.console) {
      warnings.push('Console access is available in production');
    }

    // Check for insecure localStorage usage
    try {
      localStorage.setItem('test', 'test');
      localStorage.removeItem('test');
      if (import.meta.env.PROD) {
        warnings.push('localStorage is accessible in production - sensitive data should be encrypted');
      }
    } catch (e) {
      // localStorage blocked - this is actually good for security
    }

    return { isSecure, warnings };
  }
}

// Create and export singleton instance
export const envValidator = new EnvValidator();

// Validate environment on import
const validation = envValidator.validate();
if (!validation.success) {
  throw new Error(`Environment validation failed: ${validation.errors.join(', ')}`);
}

// Export convenience functions
export const getEnvVar = (name: string): string | undefined => envValidator.get(name);
export const getRequiredEnvVar = (name: string): string => envValidator.getRequired(name);

// Export type for environment variables
export type EnvVars = {
  VITE_SUPABASE_URL: string;
  VITE_SUPABASE_PUBLISHABLE_KEY: string;
  VITE_MAPBOX_TOKEN?: string;
  VITE_MAPBOX_PUBLIC_TOKEN?: string;
  VITE_SENTRY_DSN?: string;
  VITE_APP_URL?: string;
};