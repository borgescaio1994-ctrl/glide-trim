import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VerifyCodeRequest {
  phone: string;
  code: string;
  userId: string;
}

serve(async (req) => {
  // 1. Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { phone, code, userId } = await req.json();

    if (!phone || !code || !userId) {
      return new Response(
        JSON.stringify({ error: "Dados incompletos (phone, code ou userId faltando)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Formatação padrão
    let formattedPhone = phone.replace(/\D/g, "");
    if (!formattedPhone.startsWith("55")) {
      formattedPhone = "55" + formattedPhone;
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 2. Busca o código válido (sem timeout longo)
    const { data: verification, error: verifyError } = await supabase
      .from("phone_verifications")
      .select("id")
      .eq("phone_number", formattedPhone)
      .eq("verification_code", code)
      .is("verified_at", null)
      .gte("expires_at", new Date().toISOString())
      .maybeSingle();

    if (verifyError || !verification) {
      return new Response(
        JSON.stringify({ valid: false, error: "Código inválido ou expirado" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. EXECUÇÃO RELÂMPAGO: Atualiza as duas tabelas ao mesmo tempo
    // Isso evita que a função fique esperando um e depois o outro (causa do EarlyDrop)
    const [resLog, resProfile] = await Promise.all([
      supabase
        .from("phone_verifications")
        .update({ verified_at: new Date().toISOString() })
        .eq("id", verification.id),
      
      supabase
        .from("profiles")
        .update({ 
          is_verified: true, 
          phone: formattedPhone,
          updated_at: new Date().toISOString() 
        })
        .eq("id", userId)
    ]);

    if (resProfile.error) {
      console.error("Erro ao atualizar profile:", resProfile.error);
      throw new Error("Falha ao atualizar perfil do usuário");
    }

    // 4. RESPOSTA IMEDIATA
    // Retornamos valid: true para o Frontend limpar o 'pendingPhone' e redirecionar
    return new Response(
      JSON.stringify({ valid: true, message: "Verificado com sucesso" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Erro crítico na função:", error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});