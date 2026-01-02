interface BackgroundProps {
  url: string | null;
  type: "video" | "image" | null;
}

const Background = ({ url, type }: BackgroundProps) => {
  if (!url) {
    return (
      <div className="fixed inset-0 -z-10 bg-background">
        {/* Subtle gradient overlay for visual interest */}
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-foreground/5" />
      </div>
    );
  }

  if (type === "video") {
    return (
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <video
          src={url}
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-background/60" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      <img
        src={url}
        alt="Background"
        className="absolute inset-0 w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-background/60" />
    </div>
  );
};

export default Background;
