import { useState, useEffect, useCallback, useRef } from "react";

// Extend Window to include Spotify SDK types
declare global {
  interface Window {
    Spotify: typeof Spotify;
    onSpotifyWebPlaybackSDKReady: () => void;
  }
}

interface SpotifyTrack {
  name: string;
  artists: Array<{ name: string }>;
  album: {
    name: string;
    images: Array<{ url: string; height: number; width: number }>;
  };
  duration_ms: number;
  uri: string;
}

interface SpotifyPlayerState {
  paused: boolean;
  position: number;
  duration: number;
  track: SpotifyTrack | null;
  shuffle: boolean;
  repeatMode: number; // 0 = off, 1 = context, 2 = track
}

interface UseSpotifyPlayerConfig {
  accessToken: string | null;
  deviceName?: string;
  volume?: number;
}

interface UseSpotifyPlayerReturn {
  isReady: boolean;
  isActive: boolean;
  playerState: SpotifyPlayerState | null;
  deviceId: string | null;
  error: string | null;
  play: (uri?: string, contextUri?: string, offset?: number) => Promise<void>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  togglePlay: () => Promise<void>;
  nextTrack: () => Promise<void>;
  previousTrack: () => Promise<void>;
  seek: (positionMs: number) => Promise<void>;
  setVolume: (volume: number) => Promise<void>;
  toggleShuffle: () => Promise<void>;
  toggleRepeat: () => Promise<void>;
}

const loadSpotifySDK = (): Promise<void> => {
  return new Promise((resolve) => {
    if (window.Spotify) {
      resolve();
      return;
    }

    const script = document.createElement("script");
    script.src = "https://sdk.scdn.co/spotify-player.js";
    script.async = true;

    window.onSpotifyWebPlaybackSDKReady = () => {
      resolve();
    };

    document.body.appendChild(script);
  });
};

export const useSpotifyPlayer = ({
  accessToken,
  deviceName = "Web Player",
  volume = 0.5,
}: UseSpotifyPlayerConfig): UseSpotifyPlayerReturn => {
  const playerRef = useRef<Spotify.Player | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [playerState, setPlayerState] = useState<SpotifyPlayerState | null>(null);

  // Initialize player
  useEffect(() => {
    if (!accessToken) {
      // Clean up if token is removed
      if (playerRef.current) {
        playerRef.current.disconnect();
        playerRef.current = null;
      }
      setIsReady(false);
      setIsActive(false);
      setDeviceId(null);
      return;
    }

    let mounted = true;

    const initPlayer = async () => {
      try {
        await loadSpotifySDK();

        if (!mounted) return;

        const player = new window.Spotify.Player({
          name: deviceName,
          getOAuthToken: (cb) => cb(accessToken),
          volume,
        });

        // Error handling
        player.addListener("initialization_error", ({ message }) => {
          setError(`Initialization error: ${message}`);
        });

        player.addListener("authentication_error", ({ message }) => {
          setError(`Authentication error: ${message}`);
        });

        player.addListener("account_error", ({ message }) => {
          setError(`Account error: ${message}. Premium required.`);
        });

        player.addListener("playback_error", ({ message }) => {
          setError(`Playback error: ${message}`);
        });

        // Ready
        player.addListener("ready", ({ device_id }) => {
          if (mounted) {
            setDeviceId(device_id);
            setIsReady(true);
            setError(null);
          }
        });

        // Not ready
        player.addListener("not_ready", () => {
          if (mounted) {
            setIsReady(false);
          }
        });

        // Player state changed
        player.addListener("player_state_changed", (state) => {
          if (!mounted || !state) {
            setIsActive(false);
            return;
          }

          setIsActive(true);
          setPlayerState({
            paused: state.paused,
            position: state.position,
            duration: state.duration,
            shuffle: state.shuffle,
            repeatMode: state.repeat_mode,
            track: state.track_window.current_track
              ? {
                  name: state.track_window.current_track.name,
                  artists: state.track_window.current_track.artists,
                  album: state.track_window.current_track.album,
                  duration_ms: state.duration,
                  uri: state.track_window.current_track.uri,
                }
              : null,
          });
        });

        await player.connect();
        playerRef.current = player;
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : "Failed to initialize player");
        }
      }
    };

    initPlayer();

    return () => {
      mounted = false;
      if (playerRef.current) {
        playerRef.current.disconnect();
        playerRef.current = null;
      }
    };
  }, [accessToken, deviceName, volume]);

  // Playback position update interval
  useEffect(() => {
    if (!playerRef.current || !isActive || playerState?.paused) return;

    const interval = setInterval(async () => {
      const state = await playerRef.current?.getCurrentState();
      if (state) {
        setPlayerState((prev) =>
          prev
            ? {
                ...prev,
                position: state.position,
              }
            : null
        );
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive, playerState?.paused]);

  const play = useCallback(
    async (trackUri?: string, contextUri?: string, offset?: number) => {
      if (!accessToken || !deviceId) return;

      const body: Record<string, unknown> = {};

      if (contextUri) {
        body.context_uri = contextUri;
        if (offset !== undefined) {
          body.offset = { position: offset };
        }
      } else if (trackUri) {
        body.uris = [trackUri];
      }

      await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
    },
    [accessToken, deviceId]
  );

  const pause = useCallback(async () => {
    await playerRef.current?.pause();
  }, []);

  const resume = useCallback(async () => {
    await playerRef.current?.resume();
  }, []);

  const togglePlay = useCallback(async () => {
    await playerRef.current?.togglePlay();
  }, []);

  const nextTrack = useCallback(async () => {
    await playerRef.current?.nextTrack();
  }, []);

  const previousTrack = useCallback(async () => {
    await playerRef.current?.previousTrack();
  }, []);

  const seek = useCallback(async (positionMs: number) => {
    await playerRef.current?.seek(positionMs);
  }, []);

  const setVolumeCallback = useCallback(async (newVolume: number) => {
    await playerRef.current?.setVolume(newVolume);
  }, []);

  const toggleShuffle = useCallback(async () => {
    if (!accessToken) return;
    const newState = !playerState?.shuffle;
    await fetch(`https://api.spotify.com/v1/me/player/shuffle?state=${newState}`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  }, [accessToken, playerState?.shuffle]);

  const toggleRepeat = useCallback(async () => {
    if (!accessToken) return;
    const modes = ["off", "context", "track"];
    const currentMode = playerState?.repeatMode ?? 0;
    const nextMode = modes[(currentMode + 1) % 3];
    await fetch(`https://api.spotify.com/v1/me/player/repeat?state=${nextMode}`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  }, [accessToken, playerState?.repeatMode]);

  return {
    isReady,
    isActive,
    playerState,
    deviceId,
    error,
    play,
    pause,
    resume,
    togglePlay,
    nextTrack,
    previousTrack,
    seek,
    setVolume: setVolumeCallback,
    toggleShuffle,
    toggleRepeat,
  };
};
