import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { phone } = await req.json();

    if (!phone) {
      return new Response(
        JSON.stringify({ error: "Número de telefone é obrigatório" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Formatar telefone (adiciona 55 se necessário)
    let formattedPhone = phone.replace(/\D/g, "");
    if (!formattedPhone.startsWith("55")) {
      formattedPhone = "55" + formattedPhone;
    }

    console.log("Gerando código para:", formattedPhone);

    // Gerar token de 6 dígitos
    const token = Math.floor(100000 + Math.random() * 900000).toString();

    // Salvar no banco
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Deletar tokens antigos deste telefone
    await supabase.from("phone_verifications").delete().eq("phone_number", formattedPhone);

    // Inserir novo token (expira em 10 minutos)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    
    const { error: insertError } = await supabase.from("phone_verifications").insert({
      phone_number: formattedPhone,
      token: token,
      expires_at: expiresAt,
    });

    if (insertError) {
      console.error("Erro ao inserir token:", insertError);
      return new Response(
        JSON.stringify({ error: "Erro ao gerar código" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Enviar para n8n webhook
    const n8nWebhookUrl = Deno.env.get("N8N_WEBHOOK_URL");

    if (!n8nWebhookUrl) {
      console.log("N8N_WEBHOOK_URL não configurado - modo desenvolvimento");
      return new Response(
        JSON.stringify({ success: true, message: "Código gerado (dev)", token }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("Enviando para n8n:", n8nWebhookUrl);

    const n8nResponse = await fetch(n8nWebhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: formattedPhone, code: token }),
    });

    if (!n8nResponse.ok) {
      console.error("Erro n8n:", await n8nResponse.text());
      return new Response(
        JSON.stringify({ error: "Erro ao enviar WhatsApp" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("WhatsApp enviado com sucesso");

    return new Response(
      JSON.stringify({ success: true, message: "Código enviado" }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error) {
    console.error("Erro:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
