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

    // Send WhatsApp message using Twilio - SIMPLE TEXT MESSAGE (no templates)
    const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    const twilioFrom = Deno.env.get("TWILIO_WHATSAPP_FROM");

    if (!accountSid || !authToken || !twilioFrom) {
      console.error("Twilio credentials not configured");
      return new Response(
        JSON.stringify({ error: "Serviço de SMS não configurado", token: token }), // Return token for development
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    
    // Using simple Body message instead of ContentSid/Templates
    const messageBody = `Seu código de verificação BarberPro é: ${token}. Válido por 10 minutos.`;
    
    const formData = new URLSearchParams();
    formData.append("To", `whatsapp:+${formattedPhone}`);
    formData.append("From", twilioFrom);
    formData.append("Body", messageBody);

    console.log("Sending WhatsApp to:", `whatsapp:+${formattedPhone}`);
    console.log("From:", twilioFrom);

    const twilioResponse = await fetch(twilioUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": "Basic " + btoa(`${accountSid}:${authToken}`),
      },
      body: formData.toString(),
    });

    const twilioResult = await twilioResponse.json();
    console.log("Twilio response:", JSON.stringify(twilioResult));

    if (!twilioResponse.ok) {
      console.error("Twilio error:", twilioResult);
      
      // Check for specific error codes
      if (twilioResult.code === 63007) {
        return new Response(
          JSON.stringify({ 
            error: "Para receber o código, primeiro envie uma mensagem para o número +14155238886 no WhatsApp com a palavra 'join'. Após isso, tente novamente.",
            requiresOptIn: true 
          }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: "Erro ao enviar mensagem. Verifique o número.", twilioError: twilioResult }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("WhatsApp message sent successfully:", twilioResult.sid);

    return new Response(
      JSON.stringify({ success: true, message: "Código enviado com sucesso" }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in send-whatsapp-verification function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
