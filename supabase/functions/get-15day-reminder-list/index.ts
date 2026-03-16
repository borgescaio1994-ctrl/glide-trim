import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({ error: "Configuração do Supabase ausente" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const now = new Date();
    const from = new Date(now);
    from.setDate(from.getDate() - 16);
    const to = new Date(now);
    to.setDate(to.getDate() - 14);
    const fromStr = from.toISOString().slice(0, 19);
    const toStr = to.toISOString().slice(0, 19);

    const { data: appointments, error } = await supabase
      .from("appointments")
      .select("client_id, profiles!appointments_client_id_fkey(phone, phone_number, full_name)")
      .eq("status", "completed")
      .gte("completed_at", fromStr)
      .lte("completed_at", toStr);

    if (error) {
      console.error("[get-15day-reminder-list]", error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const seen = new Set<string>();
    const clients: { phone: string; full_name: string }[] = [];
    for (const row of appointments || []) {
      const profile = (row as { profiles?: { phone?: string; phone_number?: string; full_name?: string } | null }).profiles;
      const clientId = (row as { client_id?: string }).client_id;
      if (!clientId || !profile || seen.has(clientId)) continue;
      const phone = (profile.phone || profile.phone_number || "").replace(/\D/g, "");
      if (!phone || phone.length < 10) continue;
      seen.add(clientId);
      clients.push({
        phone: phone.startsWith("55") ? phone : "55" + phone,
        full_name: profile.full_name || "Cliente",
      });
    }

    return new Response(JSON.stringify({ clients }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[get-15day-reminder-list]", message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
