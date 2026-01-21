// Simple hello-world function to satisfy Supabase edge runtime during local dev
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

serve(() => {
  return new Response(
    JSON.stringify({ message: "Hello from Supabase Functions" }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    },
  );
});
