import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const STEAMGRIDDB_API_KEY = Deno.env.get('STEAMGRIDDB_API_KEY');

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { gameName } = await req.json();
    
    if (!gameName) {
      console.log('No game name provided');
      return new Response(
        JSON.stringify({ error: 'Game name is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!STEAMGRIDDB_API_KEY) {
      console.error('STEAMGRIDDB_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Searching SteamGridDB for: ${gameName}`);

    // Step 1: Search for the game by name
    const searchResponse = await fetch(
      `https://www.steamgriddb.com/api/v2/search/autocomplete/${encodeURIComponent(gameName)}`,
      {
        headers: {
          'Authorization': `Bearer ${STEAMGRIDDB_API_KEY}`,
        },
      }
    );

    if (!searchResponse.ok) {
      console.error(`SteamGridDB search failed: ${searchResponse.status}`);
      return new Response(
        JSON.stringify({ error: 'Game search failed', iconUrl: null }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const searchData = await searchResponse.json();
    
    if (!searchData.success || !searchData.data || searchData.data.length === 0) {
      console.log(`No games found for: ${gameName}`);
      return new Response(
        JSON.stringify({ iconUrl: null }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const gameId = searchData.data[0].id;
    console.log(`Found game ID: ${gameId} for ${gameName}`);

    // Step 2: Get icons for the game
    const iconsResponse = await fetch(
      `https://www.steamgriddb.com/api/v2/icons/game/${gameId}`,
      {
        headers: {
          'Authorization': `Bearer ${STEAMGRIDDB_API_KEY}`,
        },
      }
    );

    if (!iconsResponse.ok) {
      console.error(`SteamGridDB icons fetch failed: ${iconsResponse.status}`);
      return new Response(
        JSON.stringify({ iconUrl: null }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const iconsData = await iconsResponse.json();
    
    if (!iconsData.success || !iconsData.data || iconsData.data.length === 0) {
      console.log(`No icons found for game ID: ${gameId}`);
      return new Response(
        JSON.stringify({ iconUrl: null }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Return the first icon's thumbnail URL
    const iconUrl = iconsData.data[0].thumb;
    console.log(`Found icon URL: ${iconUrl}`);

    return new Response(
      JSON.stringify({ iconUrl }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error fetching game icon:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch game icon', iconUrl: null }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
