import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request): Promise<Response> => {
  console.log("🔵 Função send-whatsapp-verification chamada");
  console.log("🔵 Método:", req.method);
  
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log("🔵 Body recebido:", body);
    
    const { phone, code } = body;

    if (!phone || !code) {
      console.log("🔴 Erro: Telefone ou código ausente");
      return new Response(
        JSON.stringify({ error: "Telefone e código são obrigatórios" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Formatação simples do telefone
    let formattedPhone = phone.replace(/\D/g, "");
    if (!formattedPhone.startsWith("55")) {
      formattedPhone = "55" + formattedPhone;
    }

    console.log("🔵 Simulando envio WhatsApp para:", formattedPhone, "código:", code);

    // SIMULAÇÃO - Em produção, aqui chamaria o n8n
    // Por enquanto, apenas logamos e retornamos sucesso
    console.log("📱 WHATSAPP SIMULADO:");
    console.log(`   Para: +${formattedPhone}`);
    console.log(`   Mensagem: Seu código de verificação BarberPro é: ${code}`);
    console.log("⚠️ Em produção, isso seria enviado via WhatsApp API");

    // Tentativa de webhook n8n (com fallback)
    try {
      const n8nWebhookUrl = "https://primary-jzx9-production.up.railway.app/webhook/64d8e09c-03a0-4d2c-8ada-141e0e26aac3";
      console.log("🔵 Tentando webhook n8n...");
      
      const n8nResponse = await fetch(n8nWebhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: formattedPhone,
          code: code,
        }),
      });

      if (n8nResponse.ok) {
        const n8nResult = await n8nResponse.text();
        console.log("✅ n8n funcionou! Resposta:", n8nResult);
      } else {
        console.log("⚠️ n8n não respondeu, mas continuando...");
      }
    } catch (webhookError) {
      console.log("⚠️ Erro no webhook n8n (esperado se offline):", webhookError);
    }

    console.log("✅ Processo concluído com sucesso!");
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Código processado com sucesso",
        simulated: true,
        phone: formattedPhone,
        code: code
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: any) {
    console.error("🔴 Erro na função:", error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
