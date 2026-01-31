import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Eye } from "lucide-react";

const ViewCounter = () => {
  const [viewCount, setViewCount] = useState<number | null>(null);
  const hasIncrementedRef = useRef(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const fetchViewCount = useCallback(async () => {
    const { count } = await supabase
      .from("profile_views")
      .select("*", { count: "exact", head: true });

    if (count !== null) {
      setViewCount(count);
    }
  }, []);

  const setupRealtimeChannel = useCallback(() => {
    // Clean up existing channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase
      .channel('profile-views-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'profile_views'
        },
        () => {
          // New view inserted, increment the count
          setViewCount((prev) => (prev !== null ? prev + 1 : null));
        }
      )
      .subscribe();

    channelRef.current = channel;
  }, []);

  useEffect(() => {
    const recordViewAndFetch = async () => {
      // Prevent duplicate increments
      if (hasIncrementedRef.current) {
        return;
      }
      hasIncrementedRef.current = true;

      // Insert a new view record
      await supabase.from("profile_views").insert({});

      // Fetch the total count
      await fetchViewCount();
    };

    recordViewAndFetch();
    setupRealtimeChannel();

    // Handle visibility change
    const handleVisibilityChange = () => {
      if (document.hidden) {
        return;
      }

      // Tab became visible - refresh view count and re-subscribe
      fetchViewCount();
      setupRealtimeChannel();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [fetchViewCount, setupRealtimeChannel]);

  if (viewCount === null) return null;

  return (
    <div className="fixed bottom-6 left-6 z-50 flex items-center gap-2 text-foreground/50 text-xs tracking-wider">
      <Eye size={14} className="animate-pulse-glow" />
      <span className="font-light">{viewCount.toLocaleString()} views</span>
    </div>
  );
};

export default ViewCounter;
