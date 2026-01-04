import { useState, useEffect, useRef, useCallback } from "react";

interface DiscordUser {
  id: string;
  username: string;
  avatar: string;
  discriminator: string;
  display_name: string | null;
  global_name: string | null;
}

interface Activity {
  name: string;
  type: number;
  state?: string;
  details?: string;
  application_id?: string;
  timestamps?: {
    start?: number;
    end?: number;
  };
  assets?: {
    large_image?: string;
    large_text?: string;
    small_image?: string;
    small_text?: string;
  };
}

interface SpotifyData {
  song: string;
  artist: string;
  album: string;
  album_art_url: string;
  timestamps: {
    start: number;
    end: number;
  };
}

interface LanyardData {
  discord_user: DiscordUser;
  discord_status: "online" | "idle" | "dnd" | "offline";
  activities: Activity[];
  listening_to_spotify: boolean;
  spotify: SpotifyData | null;
}

interface LanyardResponse {
  success: boolean;
  data: LanyardData;
  error?: {
    code: string;
    message: string;
  };
}

interface FallbackConfig {
  username: string;
  avatarUrl?: string;
}

export const useDiscordPresence = (userId: string, fallback?: FallbackConfig) => {
  const [data, setData] = useState<LanyardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMonitored, setIsMonitored] = useState(true);

  const wsRef = useRef<WebSocket | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 10;
  const maxReconnectDelay = 30000;

  const fetchPresence = useCallback(async () => {
    try {
      const response = await fetch(`https://api.lanyard.rest/v1/users/${userId}`);
      const result: LanyardResponse = await response.json();

      if (result.success) {
        setData(result.data);
        setIsMonitored(true);
        setError(null);
      } else {
        setIsMonitored(false);
        setError(result.error?.message || "Failed to fetch Discord presence");
      }
    } catch (err) {
      setIsMonitored(false);
      setError("Error fetching Discord data");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const clearHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
  }, []);

  const closeWebSocket = useCallback(() => {
    clearHeartbeat();
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, [clearHeartbeat]);

  const connectWebSocket = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    closeWebSocket();

    const ws = new WebSocket("wss://api.lanyard.rest/socket");
    wsRef.current = ws;

    ws.onopen = () => {
      reconnectAttemptsRef.current = 0;
      ws.send(JSON.stringify({
        op: 2,
        d: { subscribe_to_id: userId }
      }));
    };

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.op === 1) {
        // Clear any existing heartbeat before setting a new one
        clearHeartbeat();
        heartbeatIntervalRef.current = setInterval(() => {
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ op: 3 }));
          }
        }, message.d.heartbeat_interval);
      }
      if (message.op === 0) {
        if (message.t === "INIT_STATE" || message.t === "PRESENCE_UPDATE") {
          setData(message.d);
          setIsMonitored(true);
          setError(null);
        }
      }
    };

    ws.onerror = () => {
      setIsMonitored(false);
    };

    ws.onclose = () => {
      clearHeartbeat();

      // Attempt reconnection with exponential backoff
      if (reconnectAttemptsRef.current < maxReconnectAttempts && !document.hidden) {
        const delay = Math.min(
          1000 * Math.pow(2, reconnectAttemptsRef.current),
          maxReconnectDelay
        );
        reconnectAttemptsRef.current++;

        reconnectTimeoutRef.current = setTimeout(() => {
          connectWebSocket();
        }, delay);
      }
    };
  }, [userId, clearHeartbeat, closeWebSocket]);

  useEffect(() => {
    fetchPresence();

    // Connect WebSocket after initial fetch
    const timer = setTimeout(() => {
      connectWebSocket();
    }, 1000);

    // Handle visibility change
    const handleVisibilityChange = () => {
      if (document.hidden) {
        return;
      }

      // Tab became visible - fetch fresh data
      fetchPresence();

      // Reconnect WebSocket if disconnected
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        reconnectAttemptsRef.current = 0;
        connectWebSocket();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearTimeout(timer);
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      closeWebSocket();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [userId, fetchPresence, connectWebSocket, closeWebSocket]);

  const getAvatarUrl = () => {
    if (!data?.discord_user) {
      return fallback?.avatarUrl || `https://cdn.discordapp.com/embed/avatars/${parseInt(userId) % 5}.png`;
    }
    const { id, avatar } = data.discord_user;
    if (!avatar) {
      const defaultAvatarIndex = parseInt(data.discord_user.discriminator || "0") % 5;
      return `https://cdn.discordapp.com/embed/avatars/${defaultAvatarIndex}.png`;
    }
    const extension = avatar.startsWith("a_") ? "gif" : "png";
    return `https://cdn.discordapp.com/avatars/${id}/${avatar}.${extension}?size=256`;
  };

  const getDisplayName = () => {
    if (!data?.discord_user) {
      return fallback?.username || null;
    }
    return data.discord_user.global_name || data.discord_user.display_name || data.discord_user.username;
  };

  const getActivity = (): Activity | null => {
    if (!data?.activities || data.activities.length === 0) return null;
    // Filter out custom status (type 4)
    const activity = data.activities.find(a => a.type !== 4);
    return activity || null;
  };

  return {
    data,
    loading,
    error,
    isMonitored,
    avatarUrl: getAvatarUrl(),
    displayName: getDisplayName(),
    status: data?.discord_status || "offline",
    activity: getActivity(),
    spotify: data?.spotify || null,
    isListeningToSpotify: data?.listening_to_spotify || false,
  };
};
