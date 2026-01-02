import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Eye } from "lucide-react";

const VIEW_ID = "00000000-0000-0000-0000-000000000001";

const ViewCounter = () => {
  const [viewCount, setViewCount] = useState<number | null>(null);

  useEffect(() => {
    const incrementAndFetch = async () => {
      // First, get current count
      const { data: currentData } = await supabase
        .from("profile_views")
        .select("view_count")
        .eq("id", VIEW_ID)
        .single();

      if (currentData) {
        const newCount = currentData.view_count + 1;

        // Update the count
        await supabase
          .from("profile_views")
          .update({ view_count: newCount, updated_at: new Date().toISOString() })
          .eq("id", VIEW_ID);

        setViewCount(newCount);
      }
    };

    incrementAndFetch();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('profile-views-realtime')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profile_views',
          filter: `id=eq.${VIEW_ID}`
        },
        (payload) => {
          const newData = payload.new as { view_count: number };
          setViewCount(newData.view_count);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (viewCount === null) return null;

  return (
    <div className="fixed bottom-6 left-6 z-50 flex items-center gap-2 text-foreground/50 text-xs tracking-wider">
      <Eye size={14} className="animate-pulse-glow" />
      <span className="font-light">{viewCount.toLocaleString()} views</span>
    </div>
  );
};

export default ViewCounter;
