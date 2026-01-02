import { cn } from "@/lib/utils";

interface DiscordStatusProps {
  status: "online" | "idle" | "dnd" | "offline";
  className?: string;
}

const statusColors = {
  online: "bg-green-500",
  idle: "bg-yellow-500",
  dnd: "bg-red-500",
  offline: "bg-gray-500",
};

const statusLabels = {
  online: "Online",
  idle: "Idle",
  dnd: "Do Not Disturb",
  offline: "Offline",
};

const DiscordStatus = ({ status, className }: DiscordStatusProps) => {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="relative">
        <div
          className={cn(
            "w-3 h-3 rounded-full",
            statusColors[status],
            status === "online" && "animate-pulse"
          )}
        />
        {status === "online" && (
          <div
            className={cn(
              "absolute inset-0 w-3 h-3 rounded-full animate-ping opacity-75",
              statusColors[status]
            )}
          />
        )}
      </div>
      <span className="text-foreground/60 text-xs tracking-[0.15em] uppercase">
        {statusLabels[status]}
      </span>
    </div>
  );
};

export default DiscordStatus;
