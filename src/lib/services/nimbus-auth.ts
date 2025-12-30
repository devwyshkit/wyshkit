/**
 * Nimbus API Authentication Service
 * Handles login, token storage, and token refresh
 * Following Nimbuspost Partners API documentation: https://documenter.getpostman.com/view/9692837/TW6wHnoz
 * 
 * NOTE: This service is prepared but not currently integrated.
 * Used by NimbusService for delivery partner integration (planned for future).
 */

import { env } from "@/lib/config/env";
import { logger } from "@/lib/utils/logger";

interface NimbusToken {
  token: string;
  expiresAt: number; // Unix timestamp
}

class NimbusAuthService {
  private token: NimbusToken | null = null;
  private loginPromise: Promise<string> | null = null;

  /**
   * Login to Nimbus API and get token
   */
  async login(email: string, password: string): Promise<string> {
    const apiUrl = env.NIMBUS_API_URL;
    
    if (!apiUrl) {
      throw new Error("NIMBUS_API_URL is not configured");
    }

    try {
      const response = await fetch(`${apiUrl}/users/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error(errorData.message || `Login failed: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Extract token from response (adjust based on actual API response structure)
      const token = data.token || data.data?.token || data.access_token;
      
      if (!token) {
        throw new Error("Token not found in login response");
      }

      // Store token with expiration (default to 1 hour if not provided)
      const expiresIn = data.expires_in || 3600; // seconds
      this.token = {
        token,
        expiresAt: Date.now() + expiresIn * 1000,
      };

      logger.info("[Nimbus Auth] Login successful");
      return token;
    } catch (error) {
      logger.error("[Nimbus Auth] Login failed", error);
      throw error;
    }
  }

  /**
   * Get valid token - login if needed
   */
  async getToken(): Promise<string> {
    // If we have a valid token, return it
    if (this.token && this.token.expiresAt > Date.now() + 60000) { // 1 minute buffer
      return this.token.token;
    }

    // If login is already in progress, wait for it
    if (this.loginPromise) {
      return this.loginPromise;
    }

    // Start new login
    const email = env.NIMBUS_EMAIL;
    const password = env.NIMBUS_PASSWORD;

    if (!email || !password) {
      throw new Error("NIMBUS_EMAIL and NIMBUS_PASSWORD must be configured");
    }

    this.loginPromise = this.login(email, password).finally(() => {
      this.loginPromise = null;
    });

    return this.loginPromise;
  }

  /**
   * Refresh token (re-login)
   */
  async refreshToken(): Promise<string> {
    this.token = null; // Clear existing token
    return this.getToken();
  }

  /**
   * Clear stored token
   */
  clearToken(): void {
    this.token = null;
  }
}

// Export singleton instance
export const nimbusAuth = new NimbusAuthService();




