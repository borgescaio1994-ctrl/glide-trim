import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendVerificationRequest {
  phone: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { phone }: SendVerificationRequest = await req.json();

    if (!phone) {
      return new Response(
        JSON.stringify({ error: "Número de telefone é obrigatório" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Format phone number for WhatsApp (ensure it has country code)
    let formattedPhone = phone.replace(/\D/g, "");
    if (!formattedPhone.startsWith("55")) {
      formattedPhone = "55" + formattedPhone;
    }

    console.log("Processing verification for phone:", formattedPhone);

    // Generate 6-digit token
    const token = Math.floor(100000 + Math.random() * 900000).toString();

    // Save token to database
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Delete any existing tokens for this phone
    await supabase
      .from("phone_verifications")
      .delete()
      .eq("phone_number", formattedPhone);

    // Insert new token (expires in 10 minutes)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    
    const { error: insertError } = await supabase
      .from("phone_verifications")
      .insert({
        phone_number: formattedPhone,
        token: token,
        expires_at: expiresAt,
      });

    if (insertError) {
      console.error("Error inserting token:", insertError);
      return new Response(
        JSON.stringify({ error: "Erro ao gerar código de verificação" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("Token saved to database, sending to n8n webhook...");

    // Send WhatsApp message via n8n webhook
    const n8nWebhookUrl = Deno.env.get("N8N_WEBHOOK_URL");

    if (!n8nWebhookUrl) {
      console.error("N8N_WEBHOOK_URL not configured - returning token for development");
      return new Response(
        JSON.stringify({ success: true, message: "Código gerado (desenvolvimento)", token: token }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("Calling n8n webhook:", n8nWebhookUrl);

    const n8nResponse = await fetch(n8nWebhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        phone: formattedPhone,
        code: token,
      }),
    });

    const n8nResult = await n8nResponse.text();
    console.log("n8n response status:", n8nResponse.status);
    console.log("n8n response body:", n8nResult);

    if (!n8nResponse.ok) {
      console.error("n8n webhook error:", n8nResult);
      return new Response(
        JSON.stringify({ error: "Erro ao enviar mensagem via WhatsApp" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("WhatsApp verification message sent successfully via n8n");

    return new Response(
      JSON.stringify({ success: true, message: "Código enviado com sucesso" }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: unknown) {
    console.error("Error in send-whatsapp-verification function:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
