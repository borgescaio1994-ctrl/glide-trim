import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const N8N_WEBHOOK_URL = Deno.env.get("N8N_WEBHOOK_CONFIRMACAO");
const WEBHOOK_DEFAULT = "http://72.60.159.183:5678/webhook/confirmacao-agendamento";

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
    } = body;

    if (!client_phone) {
      return new Response(
        JSON.stringify({ error: "client_phone é obrigatório" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    let phone = String(client_phone).replace(/\D/g, "");
    if (phone && !phone.startsWith("55")) phone = "55" + phone;
    const payload = {
      client_name: client_name || "Cliente",
      client_phone: phone,
      barber_name: barber_name || "",
      service_name: service_name || "",
      appointment_date: appointment_date || "",
      appointment_time: appointment_time || "",
      service_price: service_price != null ? service_price : undefined,
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
