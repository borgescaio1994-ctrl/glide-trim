import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const N8N_WEBHOOK_VERIFICACAO = Deno.env.get("N8N_WEBHOOK_VERIFICACAO");
const WEBHOOK_DEFAULT = "http://72.60.159.183:5678/webhook/64d8e09c-03a0-4d2c-8ada-141e0e26aac3";

/** Tempo máximo de espera pelo n8n (workflow + Evolution). Padrão 30s — 10s costuma dar "signal has been aborted". */
const WEBHOOK_TIMEOUT_MS = Math.min(
  120_000,
  Math.max(5_000, Number(Deno.env.get("N8N_WEBHOOK_TIMEOUT_MS") || "30000") || 30_000),
);

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
  console.log("[send-whatsapp-verification] chamada");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { phone, code, route: routeRaw, establishment_id: estRaw, barber_id: barberRaw } = body as {
      phone: string;
      code: string;
      route?: string;
      establishment_id?: string;
      barber_id?: string;
    };

    if (!phone || !code) {
      return new Response(
        JSON.stringify({ error: "Telefone e código são obrigatórios" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } },
      );
    }

    let formattedPhone = String(phone).replace(/\D/g, "");
    if (!formattedPhone.startsWith("55")) {
      formattedPhone = "55" + formattedPhone;
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let masterSenderPhone: string | null = null;
    try {
      const { data: row } = await supabase
        .from("system_settings")
        .select("value")
        .eq("key", "master_sender_phone")
        .maybeSingle();
      masterSenderPhone = (row?.value as string) || null;
    } catch {
      masterSenderPhone = null;
    }

    const route = routeRaw === "MASTER_TO_OWNER" ? "MASTER_TO_OWNER" : "SHOP_TO_CLIENT";

    let evolution_instance = await getMasterEvolutionInstance(supabase);
    let shopSenderPhone: string | null = null;

    if (route === "SHOP_TO_CLIENT") {
      let estId = typeof estRaw === "string" && estRaw ? estRaw : undefined;
      if (!estId && typeof barberRaw === "string" && barberRaw) {
        const { data: prof } = await supabase
          .from("profiles")
          .select("establishment_id")
          .eq("id", barberRaw)
          .maybeSingle();
        estId = prof?.establishment_id ?? undefined;
      }
      if (estId) {
        const { data: est } = await supabase
          .from("establishments")
          .select("whatsapp_evolution_instance, whatsapp_sender_phone")
          .eq("id", estId)
          .maybeSingle();
        const inst = (est?.whatsapp_evolution_instance as string)?.trim();
        shopSenderPhone = (est?.whatsapp_sender_phone as string) || null;
        if (inst) {
          evolution_instance = sanitizeEvolutionInstance(inst);
        }
      }
    }

    const { data: insertData, error: insertError } = await supabase
      .from("phone_verifications")
      .upsert(
        {
          phone_number: formattedPhone,
          verification_code: code,
          expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        },
        { onConflict: "phone_number" },
      )
      .select();

    if (insertError) {
      console.error("[send-whatsapp-verification] erro upsert:", insertError);
      return new Response(
        JSON.stringify({ error: "Erro ao salvar código no banco", details: insertError }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } },
      );
    }

    console.log("[send-whatsapp-verification] salvo:", insertData, "route:", route, "instance:", evolution_instance);

    const webhookUrl = N8N_WEBHOOK_VERIFICACAO || WEBHOOK_DEFAULT;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT_MS);

      let n8nResponse: Response;
      try {
        n8nResponse = await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            phone: formattedPhone,
            code,
            sender_phone: route === "MASTER_TO_OWNER" ? masterSenderPhone : shopSenderPhone,
            action: "send_verification",
            route,
            evolution_instance,
          }),
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeoutId);
      }

      const n8nResult = await n8nResponse.text();
      console.log("[send-whatsapp-verification] n8n status:", n8nResponse.status, n8nResult);

      const looksLikeHtml =
        n8nResponse.ok && /<!doctype html>|<html[\s>]/i.test((n8nResult || "").slice(0, 200));

      if (looksLikeHtml) {
        throw new Error(
          "Webhook retornou HTML (provável front-end). Configure N8N_WEBHOOK_VERIFICACAO com a URL Production do n8n (/webhook/...) e não a URL do site.",
        );
      }

      if (n8nResponse.ok) {
        return new Response(
          JSON.stringify({
            success: true,
            message: "WhatsApp enviado com sucesso",
            response: n8nResult,
            code_saved: true,
            route,
            evolution_instance,
          }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } },
        );
      }
      throw new Error(`Webhook retornou status ${n8nResponse.status}`);
    } catch (webhookError: unknown) {
      const msg = webhookError instanceof Error ? webhookError.message : String(webhookError);
      const isAbort =
        msg.includes("aborted") ||
        (webhookError instanceof Error && "name" in webhookError && (webhookError as Error).name === "AbortError");
      const hint = isAbort
        ? `Timeout após ${WEBHOOK_TIMEOUT_MS}ms — n8n/Evolution demorou. Aumente Secret N8N_WEBHOOK_TIMEOUT_MS ou verifique URL do n8n e VPS.`
        : msg;
      console.error("[send-whatsapp-verification] webhook:", hint);
      return new Response(
        JSON.stringify({
          success: true,
          message: "Código salvo, mas WhatsApp pode ter falhado",
          details: hint,
          webhook: webhookUrl,
          code_saved: true,
          webhook_failed: true,
          route,
          evolution_instance,
          timeout_ms: WEBHOOK_TIMEOUT_MS,
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } },
      );
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[send-whatsapp-verification] erro:", message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } },
    );
  }
});
