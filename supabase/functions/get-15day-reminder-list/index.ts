import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function sanitizeEvolutionInstance(name: string): string {
  const s = name.trim().replace(/[^a-zA-Z0-9_-]/g, "");
  return s || "caio_zap";
}

async function getMasterEvolutionInstance(
  supabase: ReturnType<typeof createClient>,
): Promise<string> {
  try {
    const { data } = await supabase
      .from("system_settings")
      .select("value")
      .eq("key", "master_evolution_instance")
      .maybeSingle();
    const v = (data?.value as string)?.trim();
    if (v) return sanitizeEvolutionInstance(v);
  } catch {
    /* ignore */
  }
  const env = Deno.env.get("MASTER_EVOLUTION_INSTANCE")?.trim();
  if (env) return sanitizeEvolutionInstance(env);
  return "caio_zap";
}

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

    const masterEvolutionInstance = await getMasterEvolutionInstance(supabase);

    const { data: appointments, error } = await supabase
      .from("appointments")
      .select(
        "client_id, establishment_id, profiles!appointments_client_id_fkey(phone, phone_number, full_name), establishments!appointments_establishment_id_fkey(whatsapp_sender_phone, onboarding_status, whatsapp_evolution_instance)",
      )
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
    const clients: {
      phone: string;
      full_name: string;
      establishment_id: string;
      sender_phone: string | null;
      evolution_instance: string;
    }[] = [];
    for (const row of appointments || []) {
      const profile = (row as { profiles?: { phone?: string; phone_number?: string; full_name?: string } | null }).profiles;
      const clientId = (row as { client_id?: string }).client_id;
      const establishmentId = (row as { establishment_id?: string }).establishment_id;
      const est = (row as any).establishments as {
        whatsapp_sender_phone?: string | null;
        onboarding_status?: string | null;
        whatsapp_evolution_instance?: string | null;
      } | null;
      if (!clientId || !profile || seen.has(clientId)) continue;
      if (!establishmentId) continue;
      const phone = (profile.phone || profile.phone_number || "").replace(/\D/g, "");
      if (!phone || phone.length < 10) continue;
      seen.add(clientId);
      const instRaw = (est?.whatsapp_evolution_instance as string)?.trim();
      const evolution_instance = instRaw ? sanitizeEvolutionInstance(instRaw) : masterEvolutionInstance;
      clients.push({
        phone: phone.startsWith("55") ? phone : "55" + phone,
        full_name: profile.full_name || "Cliente",
        establishment_id: establishmentId,
        sender_phone: est?.onboarding_status === "ACTIVE" ? (est?.whatsapp_sender_phone ?? null) : null,
        evolution_instance,
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
