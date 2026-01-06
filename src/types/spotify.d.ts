// Spotify Web Playback SDK Types
declare namespace Spotify {
  interface Player {
    connect(): Promise<boolean>;
    disconnect(): void;
    addListener(event: string, callback: (state: unknown) => void): void;
    removeListener(event: string, callback?: (state: unknown) => void): void;
    getCurrentState(): Promise<PlaybackState | null>;
    setName(name: string): Promise<void>;
    getVolume(): Promise<number>;
    setVolume(volume: number): Promise<void>;
    pause(): Promise<void>;
    resume(): Promise<void>;
    togglePlay(): Promise<void>;
    seek(positionMs: number): Promise<void>;
    previousTrack(): Promise<void>;
    nextTrack(): Promise<void>;
  }

  interface PlaybackState {
    context: {
      uri: string;
      metadata: Record<string, unknown>;
    };
    disallows: {
      pausing?: boolean;
      peeking_next?: boolean;
      peeking_prev?: boolean;
      resuming?: boolean;
      seeking?: boolean;
      skipping_next?: boolean;
      skipping_prev?: boolean;
    };
    duration: number;
    paused: boolean;
    position: number;
    repeat_mode: number;
    shuffle: boolean;
    track_window: {
      current_track: Track;
      previous_tracks: Track[];
      next_tracks: Track[];
    };
  }

  interface Track {
    uri: string;
    id: string | null;
    type: "track" | "episode" | "ad";
    media_type: "audio" | "video";
    name: string;
    is_playable: boolean;
    album: Album;
    artists: Artist[];
  }

  interface Album {
    uri: string;
    name: string;
    images: Image[];
  }

  interface Artist {
    uri: string;
    name: string;
  }

  interface Image {
    url: string;
    height: number;
    width: number;
  }

  interface PlayerInit {
    name: string;
    getOAuthToken: (callback: (token: string) => void) => void;
    volume?: number;
  }

  const Player: {
    new (options: PlayerInit): Player;
  };
}
