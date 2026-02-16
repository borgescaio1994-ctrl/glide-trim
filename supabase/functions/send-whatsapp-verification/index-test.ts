// Função simplificada para teste
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request): Promise<Response> => {
  console.log("🔵 FUNÇÃO CHAMADA!");
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log("🔵 BODY:", body);
    
    const { phone, code } = body;
    console.log(`🔵 PROCESSANDO: ${phone} - ${code}`);

    // Simplesmente retorna sucesso
    const response = {
      success: true,
      message: "Código processado",
      phone: phone,
      code: code,
      timestamp: new Date().toISOString()
    };

    console.log("✅ SUCESSO!");
    
    return new Response(
      JSON.stringify(response),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error) {
    console.error("🔴 ERRO:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
