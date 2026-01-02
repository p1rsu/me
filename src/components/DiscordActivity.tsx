import { cn } from "@/lib/utils";
import { Gamepad2, Music, Monitor } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface ActivityAssets {
  large_image?: string;
  large_text?: string;
  small_image?: string;
  small_text?: string;
}

interface Activity {
  name: string;
  type: number;
  state?: string;
  details?: string;
  application_id?: string;
  assets?: ActivityAssets;
}

interface SpotifyData {
  song: string;
  artist: string;
  album: string;
  album_art_url: string;
}

interface DiscordActivityProps {
  activity: Activity | null;
  spotify: SpotifyData | null;
  isListeningToSpotify: boolean;
  className?: string;
}

const activityTypes: Record<number, { label: string; icon: typeof Gamepad2 }> = {
  0: { label: "Playing", icon: Gamepad2 },
  1: { label: "Streaming", icon: Monitor },
  2: { label: "Listening to", icon: Music },
  3: { label: "Watching", icon: Monitor },
  5: { label: "Competing in", icon: Gamepad2 },
};

// Get the activity image URL from Discord CDN
const getActivityImageUrl = (activity: Activity): string | null => {
  if (!activity.assets?.large_image) return null;
  
  const largeImage = activity.assets.large_image;
  
  // External URL (starts with mp:external/)
  if (largeImage.startsWith("mp:external/")) {
    const externalUrl = largeImage.replace("mp:external/", "");
    return `https://media.discordapp.net/external/${externalUrl}`;
  }
  
  // Spotify image
  if (largeImage.startsWith("spotify:")) {
    return `https://i.scdn.co/image/${largeImage.replace("spotify:", "")}`;
  }
  
  // Discord application asset
  if (activity.application_id) {
    return `https://cdn.discordapp.com/app-assets/${activity.application_id}/${largeImage}.png`;
  }
  
  return null;
};

// Hook to fetch game icon from SteamGridDB
const useSteamGridDBIcon = (gameName: string | null, hasDiscordIcon: boolean) => {
  const [iconUrl, setIconUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!gameName || hasDiscordIcon) {
      setIconUrl(null);
      return;
    }

    const fetchIcon = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('steamgriddb-icon', {
          body: { gameName }
        });

        if (!error && data?.iconUrl) {
          setIconUrl(data.iconUrl);
        }
      } catch (err) {
        console.error('Failed to fetch SteamGridDB icon:', err);
      }
    };

    fetchIcon();
  }, [gameName, hasDiscordIcon]);

  return iconUrl;
};

const DiscordActivity = ({ activity, spotify, isListeningToSpotify, className }: DiscordActivityProps) => {
  const discordImageUrl = activity ? getActivityImageUrl(activity) : null;
  const steamGridDBIcon = useSteamGridDBIcon(
    activity?.type === 0 ? activity.name : null,
    !!discordImageUrl
  );
  
  const activityImageUrl = discordImageUrl || steamGridDBIcon;

  if (isListeningToSpotify && spotify) {
    return (
      <div className={cn("flex items-center gap-3 bg-foreground/5 backdrop-blur-sm rounded-lg px-4 py-3 border border-foreground/10", className)}>
        <img
          src={spotify.album_art_url}
          alt={spotify.album}
          className="w-12 h-12 rounded-md object-cover"
        />
        <div className="flex flex-col items-start">
          <span className="text-foreground/50 text-xs tracking-wider uppercase flex items-center gap-1.5">
            <Music className="w-3 h-3 text-green-500" />
            Listening to Spotify
          </span>
          <span className="text-foreground text-sm font-medium">{spotify.song}</span>
          <span className="text-foreground/60 text-xs">by {spotify.artist}</span>
        </div>
      </div>
    );
  }

  if (!activity) return null;

  const activityType = activityTypes[activity.type] || { label: "Playing", icon: Gamepad2 };
  const Icon = activityType.icon;

  return (
    <div className={cn("flex items-center gap-3 bg-foreground/5 backdrop-blur-sm rounded-lg px-4 py-3 border border-foreground/10", className)}>
      {activityImageUrl ? (
        <img
          src={activityImageUrl}
          alt={activity.name}
          className="w-12 h-12 rounded-md object-cover"
        />
      ) : (
        <div className="w-12 h-12 rounded-md bg-foreground/10 flex items-center justify-center">
          <Icon className="w-6 h-6 text-foreground/60" />
        </div>
      )}
      <div className="flex flex-col items-start">
        <span className="text-foreground/50 text-xs tracking-wider uppercase flex items-center gap-1.5">
          <Icon className="w-3 h-3" />
          {activityType.label}
        </span>
        <span className="text-foreground text-sm font-medium">{activity.name}</span>
        {activity.details && (
          <span className="text-foreground/60 text-xs">{activity.details}</span>
        )}
        {activity.state && (
          <span className="text-foreground/50 text-xs">{activity.state}</span>
        )}
      </div>
    </div>
  );
};

export default DiscordActivity;
