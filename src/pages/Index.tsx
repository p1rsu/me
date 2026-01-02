import Background from "@/components/Background";
import SocialIcons from "@/components/SocialIcons";
import ViewCounter from "@/components/ViewCounter";
import DiscordActivity from "@/components/DiscordActivity";
import { cn } from "@/lib/utils";
import { useDiscordPresence } from "@/hooks/useDiscordPresence";

// ===== CUSTOMIZE YOUR PROFILE HERE =====
const DISCORD_USER_ID = "595176626535268363";
const DISCORD_USERNAME = "https.pears"; // Fallback username if Lanyard is not available

// Background configuration - set url to "" for default black background
// For video: { url: "/your-video.mp4", type: "video" }
// For image: { url: "/your-image.jpg", type: "image" }
const BACKGROUND_CONFIG = {
  url: "",
  type: "image" as "video" | "image",
};
// ========================================

// Status colors and glows for the indicator
const statusStyles = {
  online: { bg: "bg-green-500", glow: "shadow-[0_0_12px_4px_rgba(34,197,94,0.6)]" },
  idle: { bg: "bg-yellow-500", glow: "shadow-[0_0_12px_4px_rgba(234,179,8,0.6)]" },
  dnd: { bg: "bg-red-500", glow: "shadow-[0_0_12px_4px_rgba(239,68,68,0.6)]" },
  offline: { bg: "bg-gray-500", glow: "shadow-[0_0_8px_2px_rgba(107,114,128,0.4)]" },
};

const Index = () => {
  const { avatarUrl, displayName, status, loading, isMonitored, activity, spotify, isListeningToSpotify } = useDiscordPresence(
    DISCORD_USER_ID,
    { username: DISCORD_USERNAME }
  );

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center">
      <Background url={BACKGROUND_CONFIG.url || null} type={BACKGROUND_CONFIG.url ? BACKGROUND_CONFIG.type : null} />
      <ViewCounter />

      {/* Main Content */}
      <main className="flex flex-col items-center justify-center gap-12 px-6 text-center">
        {/* Profile Section with Avatar */}
        <div className="animate-fade-in-up flex flex-col items-center gap-4" style={{ animationDelay: "0.1s" }}>
          {/* Discord Avatar with Glow */}
          <div className="relative group">
            <div className="absolute inset-0 rounded-full bg-foreground/20 blur-xl group-hover:bg-foreground/40 transition-all duration-500 animate-pulse-glow" />
            <img
              src={avatarUrl}
              alt="Discord Avatar"
              className="relative w-24 h-24 rounded-full border-2 border-foreground/30 object-cover shadow-[0_0_20px_rgba(255,255,255,0.3)] group-hover:shadow-[0_0_30px_rgba(255,255,255,0.5)] transition-all duration-300"
            />
            {/* Status indicator */}
            <div className="absolute -bottom-0.5 -right-0.5 bg-background rounded-full p-1.5 border-2 border-background">
              <div 
                className={cn(
                  "w-5 h-5 rounded-full transition-all duration-300",
                  statusStyles[status].bg,
                  statusStyles[status].glow,
                  status === "online" && "animate-pulse"
                )} 
              />
            </div>
          </div>
          
          {/* Username */}
          <h1 className="text-4xl md:text-6xl font-light tracking-[0.3em] uppercase text-foreground glow-text">
            {loading ? "Loading..." : displayName || DISCORD_USERNAME}
          </h1>
          
          {/* Lanyard notice */}
          {!isMonitored && !loading && (
            <p className="text-foreground/30 text-xs max-w-xs">
              Join the <a href="https://discord.gg/lanyard" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground/50 transition-colors">Lanyard Discord</a> for live status & activity
            </p>
          )}
          
          {/* Discord Activity */}
          {isMonitored && (activity || isListeningToSpotify) && (
            <DiscordActivity 
              activity={activity} 
              spotify={spotify} 
              isListeningToSpotify={isListeningToSpotify} 
            />
          )}
          
          <p className="text-foreground/40 text-sm tracking-[0.2em] uppercase font-light">
            yo, wassup?
          </p>
        </div>

        {/* Social Icons */}
        <div className="animate-fade-in-up" style={{ animationDelay: "0.3s" }}>
          <SocialIcons />
        </div>

      </main>
    </div>
  );
};

export default Index;
