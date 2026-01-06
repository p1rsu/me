import { useState, useRef, useEffect, useCallback } from "react";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Slider } from "@/components/ui/slider";

declare global {
  interface Window {
    YT: typeof YT;
    onYouTubeIframeAPIReady: () => void;
  }
}

declare namespace YT {
  class Player {
    constructor(elementId: string, options: PlayerOptions);
    playVideo(): void;
    pauseVideo(): void;
    stopVideo(): void;
    seekTo(seconds: number, allowSeekAhead: boolean): void;
    setVolume(volume: number): void;
    getVolume(): number;
    mute(): void;
    unMute(): void;
    isMuted(): boolean;
    getDuration(): number;
    getCurrentTime(): number;
    getPlayerState(): number;
    getVideoData(): { title: string; video_id: string; author: string };
    getPlaylist(): string[];
    getPlaylistIndex(): number;
    nextVideo(): void;
    previousVideo(): void;
    playVideoAt(index: number): void;
    setShuffle(shuffle: boolean): void;
    setLoop(loop: boolean): void;
    destroy(): void;
  }

  interface PlayerOptions {
    height?: string | number;
    width?: string | number;
    videoId?: string;
    playerVars?: PlayerVars;
    events?: {
      onReady?: (event: { target: Player }) => void;
      onStateChange?: (event: { data: number; target: Player }) => void;
      onError?: (event: { data: number }) => void;
    };
  }

  interface PlayerVars {
    autoplay?: 0 | 1;
    controls?: 0 | 1;
    disablekb?: 0 | 1;
    enablejsapi?: 0 | 1;
    fs?: 0 | 1;
    iv_load_policy?: 1 | 3;
    list?: string;
    listType?: "playlist" | "user_uploads";
    loop?: 0 | 1;
    modestbranding?: 0 | 1;
    origin?: string;
    playsinline?: 0 | 1;
    rel?: 0 | 1;
    showinfo?: 0 | 1;
    start?: number;
  }
}

interface YouTubeMusicPlayerProps {
  url: string;
}

const parseYouTubeUrl = (url: string): { type: "video" | "playlist"; id: string } | null => {
  const playlistPatterns = [
    /[?&]list=([a-zA-Z0-9_-]+)/,
    /youtube\.com\/playlist\?list=([a-zA-Z0-9_-]+)/,
  ];

  for (const pattern of playlistPatterns) {
    const match = url.match(pattern);
    if (match) {
      return { type: "playlist", id: match[1] };
    }
  }

  const videoPatterns = [
    /youtube\.com\/watch\?v=([a-zA-Z0-9_-]+)/,
    /youtu\.be\/([a-zA-Z0-9_-]+)/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]+)/,
    /youtube\.com\/v\/([a-zA-Z0-9_-]+)/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];

  for (const pattern of videoPatterns) {
    const match = url.match(pattern);
    if (match) {
      return { type: "video", id: match[1] };
    }
  }

  return null;
};

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

const loadYouTubeAPI = (): Promise<void> => {
  return new Promise((resolve) => {
    if (window.YT && window.YT.Player) {
      resolve();
      return;
    }

    const existingScript = document.querySelector('script[src*="youtube.com/iframe_api"]');
    if (existingScript) {
      const checkReady = setInterval(() => {
        if (window.YT && window.YT.Player) {
          clearInterval(checkReady);
          resolve();
        }
      }, 100);
      return;
    }

    window.onYouTubeIframeAPIReady = () => {
      resolve();
    };

    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    script.async = true;
    document.body.appendChild(script);
  });
};

// Clean up song title - remove common suffixes
const cleanTitle = (title: string): string => {
  // Patterns to remove (case insensitive)
  const patternsToRemove = [
    /\s*\(?\s*official\s*(music\s*)?(video|audio|lyric(s)?|mv|visualizer)\s*\)?/gi,
    /\s*\(?\s*lyric(s)?\s*(video)?\s*\)?/gi,
    /\s*\(?\s*audio\s*(only)?\s*\)?/gi,
    /\s*\(?\s*visualizer\s*\)?/gi,
    /\s*\(?\s*hd\s*\)?/gi,
    /\s*\(?\s*hq\s*\)?/gi,
    /\s*\(?\s*4k\s*\)?/gi,
    /\s*\(?\s*remaster(ed)?\s*\)?/gi,
    /\s*\[\s*official\s*(music\s*)?(video|audio|lyric(s)?|mv)?\s*\]/gi,
    /\s*\[\s*lyric(s)?\s*(video)?\s*\]/gi,
    /\s*\|\s*official\s*.*/gi,
    /\s*\/\/\s*official\s*.*/gi,
  ];

  let cleaned = title;
  for (const pattern of patternsToRemove) {
    cleaned = cleaned.replace(pattern, "");
  }

  // Clean up extra whitespace and trailing punctuation
  cleaned = cleaned.replace(/\s+/g, " ").trim();
  cleaned = cleaned.replace(/[-–—|:]\s*$/, "").trim();

  return cleaned;
};

const YouTubeMusicPlayer = ({ url }: YouTubeMusicPlayerProps) => {
  const playerRef = useRef<YT.Player | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(50);
  const [isMuted, setIsMuted] = useState(false);
  const [trackTitle, setTrackTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [playlistLength, setPlaylistLength] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);

  const parsed = parseYouTubeUrl(url);
  const isPlaylist = parsed?.type === "playlist" && playlistLength > 1;

  // Reset state when URL changes
  useEffect(() => {
    setPlaylistLength(0);
    setTrackTitle("");
    setCurrentTime(0);
    setDuration(0);
    setIsPlaying(false);
    setError(null);
  }, [url]);

  useEffect(() => {
    if (!parsed) {
      setError("Invalid YouTube URL");
      setIsLoading(false);
      return;
    }

    let mounted = true;
    const playerId = `yt-player-${Date.now()}`;

    const initPlayer = async () => {
      try {
        await loadYouTubeAPI();

        if (!mounted || !containerRef.current) return;

        const playerDiv = document.createElement("div");
        playerDiv.id = playerId;
        playerDiv.style.display = "none";
        containerRef.current.appendChild(playerDiv);

        const playerOptions: YT.PlayerOptions = {
          height: "0",
          width: "0",
          playerVars: {
            autoplay: 0,
            controls: 0,
            disablekb: 1,
            enablejsapi: 1,
            fs: 0,
            iv_load_policy: 3,
            modestbranding: 1,
            playsinline: 1,
            rel: 0,
            origin: window.location.origin,
          },
          events: {
            onReady: (event) => {
              if (!mounted) return;
              setIsReady(true);
              setIsLoading(false);
              event.target.setVolume(50);

              const videoData = event.target.getVideoData();
              if (videoData.title) setTrackTitle(cleanTitle(videoData.title));

              const playlist = event.target.getPlaylist();
              if (playlist && playlist.length > 0) {
                setPlaylistLength(playlist.length);
              }
            },
            onStateChange: (event) => {
              if (!mounted) return;

              const state = event.data;
              setIsPlaying(state === 1);

              if (state === 1) {
                setDuration(event.target.getDuration());
                const videoData = event.target.getVideoData();
                if (videoData.title) setTrackTitle(cleanTitle(videoData.title));

                const playlist = event.target.getPlaylist();
                if (playlist && playlist.length > 0) {
                  setPlaylistLength(playlist.length);
                }
              }
            },
            onError: (event) => {
              if (!mounted) return;
              const errorMessages: Record<number, string> = {
                2: "Invalid video ID",
                5: "HTML5 player error",
                100: "Video not found",
                101: "Embedding not allowed",
                150: "Embedding not allowed",
              };
              setError(errorMessages[event.data] || "Playback error");
              setIsLoading(false);
            },
          },
        };

        if (parsed.type === "playlist") {
          playerOptions.playerVars!.list = parsed.id;
          playerOptions.playerVars!.listType = "playlist";
        } else {
          playerOptions.videoId = parsed.id;
        }

        playerRef.current = new window.YT.Player(playerId, playerOptions);
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : "Failed to load player");
          setIsLoading(false);
        }
      }
    };

    initPlayer();

    return () => {
      mounted = false;
      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      }
    };
  }, [url, parsed?.type, parsed?.id]);

  useEffect(() => {
    if (!isReady || !isPlaying || isSeeking) return;

    const interval = setInterval(() => {
      if (playerRef.current) {
        setCurrentTime(playerRef.current.getCurrentTime());
      }
    }, 500);

    return () => clearInterval(interval);
  }, [isReady, isPlaying, isSeeking]);

  const togglePlay = useCallback(() => {
    if (!playerRef.current) return;
    if (isPlaying) {
      playerRef.current.pauseVideo();
    } else {
      playerRef.current.playVideo();
    }
  }, [isPlaying]);

  const handleSeek = useCallback((value: number[]) => {
    setIsSeeking(true);
    setCurrentTime(value[0]);
  }, []);

  const handleSeekCommit = useCallback((value: number[]) => {
    const seekTime = value[0];
    setCurrentTime(seekTime);
    if (playerRef.current) {
      playerRef.current.seekTo(seekTime, true);
    }
    setTimeout(() => setIsSeeking(false), 50);
  }, []);

  const handleVolumeChange = useCallback((value: number[]) => {
    const newVolume = value[0];
    setVolumeState(newVolume);
    if (playerRef.current) {
      playerRef.current.setVolume(newVolume);
      if (newVolume > 0 && isMuted) {
        playerRef.current.unMute();
        setIsMuted(false);
      }
    }
  }, [isMuted]);

  const toggleMute = useCallback(() => {
    if (!playerRef.current) return;
    if (isMuted) {
      playerRef.current.unMute();
      playerRef.current.setVolume(volume || 50);
      setIsMuted(false);
    } else {
      playerRef.current.mute();
      setIsMuted(true);
    }
  }, [isMuted, volume]);

  const nextTrack = useCallback(() => {
    if (playerRef.current && playlistLength > 0) {
      playerRef.current.nextVideo();
    }
  }, [playlistLength]);

  const previousTrack = useCallback(() => {
    if (playerRef.current && playlistLength > 0) {
      playerRef.current.previousVideo();
    }
  }, [playlistLength]);

  if (!parsed) {
    return (
      <p className="text-foreground/30 text-xs">Invalid YouTube URL</p>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2" ref={containerRef}>
        <Loader2 className="w-4 h-4 text-foreground/40 animate-spin" />
        <span className="text-foreground/40 text-xs">Loading...</span>
      </div>
    );
  }

  if (error) {
    return (
      <p className="text-red-400/60 text-xs">{error}</p>
    );
  }

  const shouldScroll = trackTitle.length > 30;

  return (
    <div className="flex flex-col items-center gap-3" ref={containerRef}>
      {/* Track Title & Duration */}
      <div className="flex items-center gap-4 w-[320px]">
        {/* Scrolling title container */}
        <div className="flex-1 overflow-hidden marquee-container text-left">
          {shouldScroll ? (
            <div className="marquee-content text-foreground/70 text-xs font-light whitespace-nowrap">
              <span>{trackTitle}</span>
              <span>{trackTitle}</span>
            </div>
          ) : (
            <p className="text-foreground/70 text-xs font-light whitespace-nowrap text-left">
              {trackTitle || "Ready to play"}
            </p>
          )}
        </div>
        {/* Fixed width timer */}
        <span className="text-foreground/40 text-xs tracking-wider w-[90px] text-right flex-shrink-0">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>
      </div>

      {/* Progress Bar */}
      <div className="w-[320px] h-4 flex items-center">
        <Slider
          value={[currentTime]}
          max={duration || 100}
          step={1}
          onValueChange={handleSeek}
          onValueCommit={handleSeekCommit}
          className="w-full"
        />
      </div>

      {/* Controls Row - fixed layout */}
      <div className="flex items-center justify-between w-[320px]">
        {/* Play Controls */}
        <div className={cn("flex items-center gap-1", isPlaylist ? "w-[100px]" : "w-auto")}>
          {isPlaylist && (
            <button
              onClick={previousTrack}
              className="p-1.5 text-foreground/50 hover:text-foreground hover:scale-110 active:scale-95 transition-all duration-200"
              title="Previous"
            >
              <SkipBack className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={togglePlay}
            className={cn(
              "p-2 rounded-full transition-all duration-200",
              "text-foreground/80 hover:text-foreground",
              "hover:bg-foreground/10 hover:scale-110",
              "active:scale-95 active:bg-foreground/20"
            )}
            title={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? (
              <Pause className="w-4 h-4 transition-transform duration-200" />
            ) : (
              <Play className="w-4 h-4 ml-0.5 transition-transform duration-200" />
            )}
          </button>

          {isPlaylist && (
            <button
              onClick={nextTrack}
              className="p-1.5 text-foreground/50 hover:text-foreground hover:scale-110 active:scale-95 transition-all duration-200"
              title="Next"
            >
              <SkipForward className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Volume - fixed width */}
        <div className="flex items-center gap-2 w-[120px]">
          <button
            onClick={toggleMute}
            className="text-foreground/40 hover:text-foreground/70 hover:scale-110 active:scale-95 transition-all duration-200 flex-shrink-0"
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="w-3.5 h-3.5" />
            ) : (
              <Volume2 className="w-3.5 h-3.5" />
            )}
          </button>
          <Slider
            value={[isMuted ? 0 : volume]}
            max={100}
            step={1}
            onValueChange={handleVolumeChange}
            className="flex-1"
          />
        </div>
      </div>
    </div>
  );
};

export default YouTubeMusicPlayer;
