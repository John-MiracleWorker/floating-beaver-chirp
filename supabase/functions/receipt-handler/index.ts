// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
    );

    const {
      data: { user },
    } = await userClient.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    // Read raw text
    const raw = await req.text();
    // Supabase may wrap your JSON in a { body: "..." } envelope
    let parsed: any;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new Error("Invalid JSON body");
    }
    let body = parsed;
    if (parsed?.body) {
      // body.body might be a JSON string or object
      if (typeof parsed.body === "string") {
        try {
          body = JSON.parse(parsed.body);
        } catch {
          throw new Error("Invalid JSON in wrapped body");
        }
      } else {
        body = parsed.body;
      }
    }

    if (req.method === "POST") {
      const { fileName } = body;
      if (!fileName) throw new Error("fileName is required.");
      const path = `${user.id}/${Date.now()}_${fileName}`;
      const { data, error } = await supabaseAdmin.storage
        .from("receipts")
        .createSignedUrl(path, 300, { upsert: true });
      if (error) throw error;
      return new Response(
        JSON.stringify({ signedUrl: data.signedUrl, path }),
        { headers: corsHeaders }
      );
    }

    if (req.method === "PUT") {
      const { path, fileName } = body;
      if (!path || !fileName) throw new Error("path and fileName are required.");
      const {
        data: { publicUrl },
      } = supabaseAdmin.storage.from("receipts").getPublicUrl(path);
      const { error } = await supabaseAdmin.from("receipts").insert({
        user_id: user.id,
        file_name: fileName,
        file_url: publicUrl,
      });
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), {
        headers: corsHeaders,
      });
    }

    return new Response(JSON.stringify({ error: "Method Not Allowed" }), {
      status: 405,
      headers: corsHeaders,
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: corsHeaders,
    });
  }
});