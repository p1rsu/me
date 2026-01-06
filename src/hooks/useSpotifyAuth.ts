import { useState, useEffect, useCallback } from "react";

interface SpotifyAuthConfig {
  clientId: string;
  redirectUri: string;
  scopes?: string[];
}

interface SpotifyAuthState {
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: () => void;
  logout: () => void;
}

const DEFAULT_SCOPES = [
  "streaming",
  "user-read-email",
  "user-read-private",
  "user-read-playback-state",
  "user-modify-playback-state",
  "user-read-currently-playing",
];

// PKCE helpers
const generateRandomString = (length: number): string => {
  const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const values = crypto.getRandomValues(new Uint8Array(length));
  return values.reduce((acc, x) => acc + possible[x % possible.length], "");
};

const sha256 = async (plain: string): Promise<ArrayBuffer> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  return window.crypto.subtle.digest("SHA-256", data);
};

const base64encode = (input: ArrayBuffer): string => {
  return btoa(String.fromCharCode(...new Uint8Array(input)))
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
};

const STORAGE_KEYS = {
  accessToken: "spotify_access_token",
  refreshToken: "spotify_refresh_token",
  tokenExpiry: "spotify_token_expiry",
  codeVerifier: "spotify_code_verifier",
};

export const useSpotifyAuth = (config: SpotifyAuthConfig): SpotifyAuthState => {
  const { clientId, redirectUri, scopes = DEFAULT_SCOPES } = config;

  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check for existing token on mount
  useEffect(() => {
    const storedToken = localStorage.getItem(STORAGE_KEYS.accessToken);
    const tokenExpiry = localStorage.getItem(STORAGE_KEYS.tokenExpiry);

    if (storedToken && tokenExpiry) {
      const expiryTime = parseInt(tokenExpiry, 10);
      if (Date.now() < expiryTime) {
        setAccessToken(storedToken);
      } else {
        // Token expired, try to refresh
        const refreshToken = localStorage.getItem(STORAGE_KEYS.refreshToken);
        if (refreshToken) {
          refreshAccessToken(refreshToken);
          return;
        }
        clearTokens();
      }
    }
    setIsLoading(false);
  }, []);

  // Handle OAuth callback
  useEffect(() => {
    const handleCallback = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get("code");
      const errorParam = urlParams.get("error");

      if (errorParam) {
        setError(errorParam);
        setIsLoading(false);
        // Clean URL
        window.history.replaceState({}, document.title, window.location.pathname);
        return;
      }

      if (code) {
        setIsLoading(true);
        try {
          await exchangeCodeForToken(code);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Failed to exchange code");
        }
        // Clean URL
        window.history.replaceState({}, document.title, window.location.pathname);
        setIsLoading(false);
      }
    };

    handleCallback();
  }, []);

  const exchangeCodeForToken = async (code: string) => {
    const codeVerifier = localStorage.getItem(STORAGE_KEYS.codeVerifier);
    if (!codeVerifier) {
      throw new Error("Code verifier not found");
    }

    const response = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: clientId,
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
        code_verifier: codeVerifier,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error_description || "Token exchange failed");
    }

    const data = await response.json();
    saveTokens(data);
    localStorage.removeItem(STORAGE_KEYS.codeVerifier);
  };

  const refreshAccessToken = async (refreshToken: string) => {
    try {
      const response = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          client_id: clientId,
          grant_type: "refresh_token",
          refresh_token: refreshToken,
        }),
      });

      if (!response.ok) {
        throw new Error("Token refresh failed");
      }

      const data = await response.json();
      saveTokens(data);
    } catch {
      clearTokens();
    }
    setIsLoading(false);
  };

  const saveTokens = (data: { access_token: string; refresh_token?: string; expires_in: number }) => {
    const expiryTime = Date.now() + data.expires_in * 1000;

    localStorage.setItem(STORAGE_KEYS.accessToken, data.access_token);
    localStorage.setItem(STORAGE_KEYS.tokenExpiry, expiryTime.toString());

    if (data.refresh_token) {
      localStorage.setItem(STORAGE_KEYS.refreshToken, data.refresh_token);
    }

    setAccessToken(data.access_token);
    setError(null);
  };

  const clearTokens = () => {
    localStorage.removeItem(STORAGE_KEYS.accessToken);
    localStorage.removeItem(STORAGE_KEYS.refreshToken);
    localStorage.removeItem(STORAGE_KEYS.tokenExpiry);
    localStorage.removeItem(STORAGE_KEYS.codeVerifier);
    setAccessToken(null);
  };

  const login = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const codeVerifier = generateRandomString(64);
      localStorage.setItem(STORAGE_KEYS.codeVerifier, codeVerifier);

      const hashed = await sha256(codeVerifier);
      const codeChallenge = base64encode(hashed);

      const params = new URLSearchParams({
        response_type: "code",
        client_id: clientId,
        scope: scopes.join(" "),
        code_challenge_method: "S256",
        code_challenge: codeChallenge,
        redirect_uri: redirectUri,
      });

      window.location.href = `https://accounts.spotify.com/authorize?${params.toString()}`;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
      setIsLoading(false);
    }
  }, [clientId, redirectUri, scopes]);

  const logout = useCallback(() => {
    clearTokens();
  }, []);

  return {
    accessToken,
    isAuthenticated: !!accessToken,
    isLoading,
    error,
    login,
    logout,
  };
};
