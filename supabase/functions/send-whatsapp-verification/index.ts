import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request): Promise<Response> => {
  console.log(" Função send-whatsapp-verification chamada");
  console.log(" Método:", req.method);
  console.log(" Headers:", Object.fromEntries(req.headers.entries()));
  
  // Handle CORS
  if (req.method === "OPTIONS") {
    console.log(" Tratando requisição OPTIONS");
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log(" Body recebido:", body);
    
    const { phone, code } = body;

    if (!phone || !code) {
      console.log(" Erro: Telefone ou código ausente");
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

    // Criar cliente Supabase
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // SALVAR O CÓDIGO NA TABELA phone_verifications ANTES DE CHAMAR O N8N
    console.log(" Salvando código na tabela phone_verifications:", formattedPhone, "código:", code);
    
    const { data: insertData, error: insertError } = await supabase
      .from('phone_verifications')
      .upsert({ 
        phone_number: formattedPhone, 
        verification_code: code,
        expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString()
      }, { onConflict: 'phone_number' })
      .select();

    if (insertError) {
      console.error(" Erro ao salvar código no banco:", insertError);
      return new Response(
        JSON.stringify({ error: "Erro ao salvar código no banco", details: insertError }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(" Código salvo com sucesso:", insertData);

    console.log(" Enviando para n8n:", formattedPhone, "código:", code);

    // Webhook principal do n8n
    const webhookUrl = "http://72.60.159.183:5678/webhook/64d8e09c-03a0-4d2c-8ada-141e0e26aac3";
    
    console.log(" Tentando webhook principal:", webhookUrl);
    
    try {
      // Adicionando timeout de 10 segundos para evitar EarlyDrop
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const n8nResponse = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone: formattedPhone,
          code: code,
          action: 'send_verification'
        }),
        signal: controller.signal,
      });

      // Limpar timeout
      clearTimeout(timeoutId);

      console.log(" Status do webhook:", n8nResponse.status);
      console.log(" Headers do webhook:", Object.fromEntries(n8nResponse.headers.entries()));
      
      const n8nResult = await n8nResponse.text();
      console.log(" Resposta do webhook:", n8nResult);

      if (n8nResponse.ok) {
        console.log(" WhatsApp enviado com sucesso!");
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: "WhatsApp enviado com sucesso", 
            response: n8nResult,
            code_saved: true
          }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      } else {
        console.error(" Erro no webhook:", n8nResponse.status, n8nResult);
        throw new Error(`Webhook retornou status ${n8nResponse.status}`);
      }
      
    } catch (webhookError) {
      console.error(" Erro ao chamar webhook:", webhookError);
      console.error(" Detalhes do erro:", webhookError.message);
      
      // NÃO falhar completamente - retornar sucesso parcial
      return new Response(
        JSON.stringify({ 
          success: true, // Mudar para true para não bloquear o fluxo
          message: "Código salvo, mas WhatsApp pode ter falhado", 
          details: webhookError.message,
          webhook: webhookUrl,
          code_saved: true,
          webhook_failed: true
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

  } catch (error: any) {
    console.error(" Erro completo na função:", error);
    console.error(" Stack trace:", error.stack);
    return new Response(
      JSON.stringify({ error: error.message, stack: error.stack }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});