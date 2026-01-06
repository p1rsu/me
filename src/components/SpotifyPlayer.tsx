import { useState, useEffect, useCallback } from "react";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Music,
  Shuffle,
  Repeat,
  Repeat1,
  LogIn,
  LogOut,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSpotifyAuth } from "@/hooks/useSpotifyAuth";
import { useSpotifyPlayer } from "@/hooks/useSpotifyPlayer";
import { Slider } from "@/components/ui/slider";

interface SpotifyPlayerProps {
  clientId: string;
  redirectUri: string;
  defaultPlaylistUri?: string; // e.g., "spotify:playlist:37i9dQZF1DXcBWIGoYBM5M"
}

// Extract Spotify URI from URL
const getSpotifyUri = (url: string): string | null => {
  const patterns = [
    /open\.spotify\.com\/(track|album|playlist|artist)\/([a-zA-Z0-9]+)/,
    /spotify:(track|album|playlist|artist):([a-zA-Z0-9]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      const [, type, id] = match;
      return `spotify:${type}:${id}`;
    }
  }
  return null;
};

const formatTime = (ms: number): string => {
  const seconds = Math.floor(ms / 1000);
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

const SpotifyPlayer = ({ clientId, redirectUri, defaultPlaylistUri }: SpotifyPlayerProps) => {
  const { accessToken, isAuthenticated, isLoading: authLoading, error: authError, login, logout } = useSpotifyAuth({
    clientId,
    redirectUri,
  });

  const {
    isReady,
    isActive,
    playerState,
    error: playerError,
    play,
    togglePlay,
    nextTrack,
    previousTrack,
    seek,
    setVolume,
    toggleShuffle,
    toggleRepeat,
  } = useSpotifyPlayer({
    accessToken,
    deviceName: "https.pears Web Player",
  });

  const [volume, setVolumeState] = useState(50);
  const [isMuted, setIsMuted] = useState(false);
  const [previousVolume, setPreviousVolume] = useState(50);
  const [localPosition, setLocalPosition] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);

  // Sync position with player state
  useEffect(() => {
    if (playerState && !isSeeking) {
      setLocalPosition(playerState.position);
    }
  }, [playerState?.position, isSeeking]);

  // Auto-play default playlist when ready
  useEffect(() => {
    if (isReady && !isActive && defaultPlaylistUri) {
      const uri = getSpotifyUri(defaultPlaylistUri) || defaultPlaylistUri;
      if (uri.startsWith("spotify:playlist:") || uri.startsWith("spotify:album:")) {
        play(undefined, uri);
      } else if (uri.startsWith("spotify:track:")) {
        play(uri);
      }
    }
  }, [isReady, isActive, defaultPlaylistUri, play]);

  const handleVolumeChange = useCallback(
    (value: number[]) => {
      const newVolume = value[0];
      setVolumeState(newVolume);
      setVolume(newVolume / 100);
      if (newVolume > 0) {
        setIsMuted(false);
      }
    },
    [setVolume]
  );

  const toggleMute = useCallback(() => {
    if (isMuted) {
      setVolumeState(previousVolume);
      setVolume(previousVolume / 100);
      setIsMuted(false);
    } else {
      setPreviousVolume(volume);
      setVolumeState(0);
      setVolume(0);
      setIsMuted(true);
    }
  }, [isMuted, volume, previousVolume, setVolume]);

  const handleSeek = useCallback(
    (value: number[]) => {
      setIsSeeking(true);
      setLocalPosition(value[0]);
    },
    []
  );

  const handleSeekCommit = useCallback(
    (value: number[]) => {
      seek(value[0]);
      setTimeout(() => setIsSeeking(false), 100);
    },
    [seek]
  );

  const error = authError || playerError;

  // Not authenticated - show login button
  if (!isAuthenticated) {
    return (
      <div className="w-full max-w-sm">
        <div
          className={cn(
            "bg-foreground/5 backdrop-blur-sm rounded-lg border border-foreground/10",
            "hover:border-foreground/20 hover:bg-foreground/[0.07] transition-all duration-300",
            "p-4"
          )}
        >
          <div className="flex flex-col items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-[#1DB954]/20 flex items-center justify-center">
              <Music className="w-5 h-5 text-[#1DB954]" />
            </div>
            <div className="text-center">
              <p className="text-foreground/70 text-xs tracking-[0.15em] uppercase font-light mb-1">
                Spotify Player
              </p>
              <p className="text-foreground/40 text-[10px] tracking-wider">
                Premium required for full playback
              </p>
            </div>
            <button
              onClick={login}
              disabled={authLoading}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-full",
                "bg-[#1DB954] hover:bg-[#1ed760] text-black",
                "text-xs font-medium tracking-wider uppercase",
                "transition-all duration-300 hover:scale-105",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              {authLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <LogIn className="w-4 h-4" />
              )}
              Connect Spotify
            </button>
            {error && (
              <p className="text-red-400/80 text-[10px] text-center max-w-[200px]">{error}</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Authenticated but player not ready
  if (!isReady) {
    return (
      <div className="w-full max-w-sm">
        <div
          className={cn(
            "bg-foreground/5 backdrop-blur-sm rounded-lg border border-foreground/10",
            "p-4"
          )}
        >
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-6 h-6 text-[#1DB954] animate-spin" />
            <p className="text-foreground/50 text-xs tracking-wider">Initializing player...</p>
            {error && (
              <p className="text-red-400/80 text-[10px] text-center">{error}</p>
            )}
            <button
              onClick={logout}
              className="text-foreground/30 hover:text-foreground/50 text-[10px] tracking-wider transition-colors"
            >
              Disconnect
            </button>
          </div>
        </div>
      </div>
    );
  }

  const track = playerState?.track;
  const albumArt = track?.album.images[0]?.url;

  return (
    <div className="w-full max-w-sm">
      <div
        className={cn(
          "bg-foreground/5 backdrop-blur-sm rounded-lg border border-foreground/10",
          "hover:border-foreground/20 hover:bg-foreground/[0.07] transition-all duration-300",
          "p-4"
        )}
      >
        {/* Track Info */}
        <div className="flex items-center gap-3 mb-4">
          {/* Album Art */}
          <div className="relative flex-shrink-0">
            <div
              className={cn(
                "w-14 h-14 rounded-lg overflow-hidden bg-foreground/10",
                "shadow-[0_0_15px_rgba(30,215,96,0.2)]"
              )}
            >
              {albumArt ? (
                <img
                  src={albumArt}
                  alt={track?.album.name}
                  className={cn(
                    "w-full h-full object-cover",
                    !playerState?.paused && "music-thumbnail"
                  )}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Music className="w-6 h-6 text-foreground/30" />
                </div>
              )}
            </div>
          </div>

          {/* Track Details */}
          <div className="flex-1 min-w-0">
            <p className="text-foreground/90 text-sm font-light truncate">
              {track?.name || "No track playing"}
            </p>
            <p className="text-foreground/50 text-xs truncate">
              {track?.artists.map((a) => a.name).join(", ") || "Connect to play"}
            </p>
          </div>

          {/* Logout Button */}
          <button
            onClick={logout}
            className="text-foreground/30 hover:text-foreground/50 transition-colors p-1"
            title="Disconnect"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="mb-3">
          <Slider
            value={[localPosition]}
            max={playerState?.duration || 100}
            step={1000}
            onValueChange={handleSeek}
            onValueCommit={handleSeekCommit}
            className="w-full"
          />
          <div className="flex justify-between mt-1">
            <span className="text-foreground/40 text-[10px]">
              {formatTime(localPosition)}
            </span>
            <span className="text-foreground/40 text-[10px]">
              {formatTime(playerState?.duration || 0)}
            </span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between">
          {/* Shuffle */}
          <button
            onClick={toggleShuffle}
            className={cn(
              "p-1.5 rounded-full transition-all duration-200",
              playerState?.shuffle
                ? "text-[#1DB954] hover:text-[#1ed760]"
                : "text-foreground/40 hover:text-foreground/60"
            )}
            title="Shuffle"
          >
            <Shuffle className="w-4 h-4" />
          </button>

          {/* Main Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={previousTrack}
              className="p-2 text-foreground/60 hover:text-foreground transition-colors"
              title="Previous"
            >
              <SkipBack className="w-5 h-5" />
            </button>

            <button
              onClick={togglePlay}
              className={cn(
                "p-3 rounded-full transition-all duration-300",
                "bg-foreground/10 hover:bg-foreground/20",
                "text-foreground hover:scale-105",
                "shadow-[0_0_15px_rgba(255,255,255,0.1)]",
                "hover:shadow-[0_0_20px_rgba(255,255,255,0.2)]"
              )}
              title={playerState?.paused ? "Play" : "Pause"}
            >
              {playerState?.paused ? (
                <Play className="w-5 h-5 ml-0.5" />
              ) : (
                <Pause className="w-5 h-5" />
              )}
            </button>

            <button
              onClick={nextTrack}
              className="p-2 text-foreground/60 hover:text-foreground transition-colors"
              title="Next"
            >
              <SkipForward className="w-5 h-5" />
            </button>
          </div>

          {/* Repeat */}
          <button
            onClick={toggleRepeat}
            className={cn(
              "p-1.5 rounded-full transition-all duration-200",
              playerState?.repeatMode !== 0
                ? "text-[#1DB954] hover:text-[#1ed760]"
                : "text-foreground/40 hover:text-foreground/60"
            )}
            title={["Repeat Off", "Repeat All", "Repeat One"][playerState?.repeatMode ?? 0]}
          >
            {playerState?.repeatMode === 2 ? (
              <Repeat1 className="w-4 h-4" />
            ) : (
              <Repeat className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Volume */}
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-foreground/5">
          <button
            onClick={toggleMute}
            className="text-foreground/40 hover:text-foreground/60 transition-colors"
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="w-4 h-4" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
          </button>
          <Slider
            value={[volume]}
            max={100}
            step={1}
            onValueChange={handleVolumeChange}
            className="flex-1"
          />
        </div>

        {/* Error Display */}
        {error && (
          <p className="text-red-400/80 text-[10px] text-center mt-2">{error}</p>
        )}
      </div>
    </div>
  );
};

export default SpotifyPlayer;
