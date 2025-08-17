// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, fileName, fileData } = await req.json();
    if (!userId || !fileName || !fileData) {
      return new Response(JSON.stringify({ error: "Invalid payload" }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    const binary = Uint8Array.from(atob(fileData), (c) => c.charCodeAt(0));
    const path = `${userId}/${Date.now()}_${fileName}`;

    const { error: uploadErr } = await supabase.storage
      .from("receipts")
      .upload(path, binary, { contentType: "application/octet-stream" });
    if (uploadErr) throw uploadErr;

    const {
      data: { publicUrl },
    } = supabase.storage.from("receipts").getPublicUrl(path);

    const { error: insertErr } = await supabase
      .from("receipts")
      .insert({ user_id: userId, file_name: fileName, file_url: publicUrl });
    if (insertErr) throw insertErr;

    return new Response(JSON.stringify({ fileUrl: publicUrl }), {
      headers: corsHeaders,
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});