import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VerifyCodeRequest {
  phone: string;
  code: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { phone, code }: VerifyCodeRequest = await req.json();

    if (!phone || !code) {
      return new Response(
        JSON.stringify({ error: "Número de telefone e código são obrigatórios" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Format phone number
    let formattedPhone = phone.replace(/\D/g, "");
    if (!formattedPhone.startsWith("55")) {
      formattedPhone = "55" + formattedPhone;
    }

    console.log("Verifying code for phone:", formattedPhone, "code:", code);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // First, check all records for this phone
    const { data: allRecords, error: allError } = await supabase
      .from("phone_verifications")
      .select("*")
      .eq("phone_number", formattedPhone);

    console.log("All records for phone:", allRecords, "error:", allError);

    // Query the verification record
    const { data, error } = await supabase
      .from("phone_verifications")
      .select("*")
      .eq("phone_number", formattedPhone)
      .eq("token", code)
      .is("verified_at", null)
      .single();

    console.log("Query result - data:", data, "error:", error);

    if (error || !data) {
      console.log("Verification failed:", error);
      return new Response(
        JSON.stringify({ valid: false, error: "Código inválido ou expirado" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Mark as verified
    const { error: updateError } = await supabase
      .from("phone_verifications")
      .update({ verified_at: new Date().toISOString() })
      .eq("id", data.id);

    if (updateError) {
      console.error("Error updating verification:", updateError);
      return new Response(
        JSON.stringify({ error: "Erro ao atualizar verificação" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("Code verified successfully");

    return new Response(
      JSON.stringify({ valid: true, message: "Código verificado com sucesso" }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: unknown) {
    console.error("Error in verify-phone-code function:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
