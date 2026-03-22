import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const N8N_WEBHOOK_URL = Deno.env.get("N8N_WEBHOOK_CONFIRMACAO");
const WEBHOOK_DEFAULT = "http://72.60.159.183:5678/webhook/confirmacao-agendamento";

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

  const urlToCall = N8N_WEBHOOK_URL || WEBHOOK_DEFAULT;
  try {
    const body = await req.json();
    console.log("[send-whatsapp-confirmation] chamada recebida (confirmação)", "webhook:", urlToCall);

    const {
      client_name,
      client_phone,
      barber_name,
      service_name,
      appointment_date,
      appointment_time,
      service_price,
      establishment_id,
    } = body;

    if (!client_phone) {
      return new Response(
        JSON.stringify({ error: "client_phone é obrigatório" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    let phone = String(client_phone).replace(/\D/g, "");
    if (phone && !phone.startsWith("55")) phone = "55" + phone;

    // sender_phone (exibição/logs) + evolution_instance (igual verificação WhatsApp)
    let senderPhone: string | null = null;
    let evolution_instance = "caio_zap";
    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      evolution_instance = await getMasterEvolutionInstance(supabase);

      if (establishment_id) {
        const { data: est } = await supabase
          .from("establishments")
          .select("whatsapp_sender_phone, onboarding_status, whatsapp_evolution_instance")
          .eq("id", establishment_id)
          .maybeSingle();
        senderPhone = (est?.onboarding_status === "ACTIVE" ? (est?.whatsapp_sender_phone as string) : null) || null;
        const inst = (est?.whatsapp_evolution_instance as string)?.trim();
        if (inst) {
          evolution_instance = sanitizeEvolutionInstance(inst);
        }
      }

      if (!senderPhone) {
        const { data: row } = await supabase
          .from("system_settings")
          .select("value")
          .eq("key", "master_sender_phone")
          .maybeSingle();
        senderPhone = (row?.value as string) || null;
      }
    } catch {
      senderPhone = null;
    }

    const payload = {
      client_name: client_name || "Cliente",
      client_phone: phone,
      barber_name: barber_name || "",
      service_name: service_name || "",
      appointment_date: appointment_date || "",
      appointment_time: appointment_time || "",
      service_price: service_price != null ? service_price : undefined,
      sender_phone: senderPhone,
      evolution_instance,
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    const n8nResponse = await fetch(urlToCall, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const n8nResult = await n8nResponse.text();
    console.log("[send-whatsapp-confirmation] n8n status:", n8nResponse.status, "body:", n8nResult);

    if (n8nResponse.ok) {
      return new Response(
        JSON.stringify({ success: true, message_sent: true, message: "Confirmação enviada", response: n8nResult }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const errMsg = `Webhook ${n8nResponse.status}: ${n8nResult}`;
    console.error("[send-whatsapp-confirmation] n8n falhou:", errMsg);
    if (n8nResponse.status === 404) {
      console.error(
        "[send-whatsapp-confirmation] 404 = URL do webhook incorreta. Configure N8N_WEBHOOK_CONFIRMACAO com a Production URL do nó Webhook no n8n."
      );
    }
    return new Response(
      JSON.stringify({
        success: true,
        message_sent: false,
        error: errMsg,
        hint_404: n8nResponse.status === 404
          ? "Configure N8N_WEBHOOK_CONFIRMACAO com a Production URL do webhook de confirmação no n8n."
          : undefined,
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[send-whatsapp-confirmation] exceção:", message);
    return new Response(
      JSON.stringify({ success: true, message_sent: false, error: message }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
