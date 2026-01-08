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
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { phone, code }: VerifyCodeRequest = await req.json();

    if (!phone || !code) {
      return new Response(
        JSON.stringify({ error: "Telefone e código são obrigatórios" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Formatação do telefone para bater com o que o n8n salva (ex: 5511...)
    let formattedPhone = phone.replace(/\D/g, "");
    if (!formattedPhone.startsWith("55")) {
      formattedPhone = "55" + formattedPhone;
    }
    // Adiciona o sufixo do WhatsApp caso não tenha, pois o n8n salva com @c.us
    const phoneWithSuffix = formattedPhone.includes("@c.us") ? formattedPhone : `${formattedPhone}@c.us`;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. BUSCA O CÓDIGO NA TABELA APPOINTMENTS (Onde o n8n salvou)
    const { data: appointment, error: fetchError } = await supabase
      .from("appointments")
      .select("*")
      .eq("phone_number", phoneWithSuffix) // Campo do n8n
      .eq("verification_code", code)      // Campo do n8n
      .eq("is_verified", false)           // Apenas códigos ainda não usados
      .single();

    if (fetchError || !appointment) {
      console.log("Verificação não encontrada ou código incorreto:", fetchError);
      return new Response(
        JSON.stringify({ error: "Código inválido ou já utilizado" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // 2. MARCA COMO VERIFICADO NA TABELA APPOINTMENTS
    const { error: updateError } = await supabase
      .from("appointments")
      .update({ is_verified: true }) // Atualiza o campo que o n8n criou
      .eq("id", appointment.id);

    if (updateError) {
      console.error("Erro ao atualizar status de verificação:", updateError);
      return new Response(
        JSON.stringify({ error: "Erro ao validar no banco de dados" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // 3. LÓGICA DE USUÁRIO (Sua lógica original mantida)
    const { data: existingUser } = await supabase.auth.admin.listUsers();
    const user = existingUser.users.find(u => u.phone === formattedPhone);

    let userId: string;

    if (user) {
      userId = user.id;
      console.log("Usuário já existe:", userId);
    } else {
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        phone: formattedPhone,
        phone_confirm: true,
      });

      if (createError) {
        console.error("Erro ao criar usuário:", createError);
        return new Response(
          JSON.stringify({ error: "Erro ao criar conta de usuário" }),
          { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      userId = newUser.user.id;
      
      // Criação do Perfil
      await supabase.from("profiles").insert({
        id: userId,
        phone: formattedPhone,
        full_name: "Cliente WhatsApp",
        role: "client",
      });
    }

    return new Response(
      JSON.stringify({ success: true, verified: true, phone: formattedPhone, user_id: userId }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: any) {
    console.error("Erro na Edge Function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);