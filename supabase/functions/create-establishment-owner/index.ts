import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");

const DEFAULT_ADMIN_PASSWORD = "ADMIN_OWNER2026";

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !SUPABASE_ANON_KEY) {
      return jsonResponse({ error: "Configuração do Supabase ausente" }, 500);
    }

    const authHeader =
      req.headers.get("Authorization") ?? req.headers.get("authorization");
    if (!authHeader) {
      return jsonResponse({ error: "Unauthorized: missing Authorization header" }, 401);
    }

    const supabaseAnon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: authHeader } },
    });

    // Descobre quem está chamando (valida o JWT via Supabase)
    const { data: userData, error: userErr } = await supabaseAnon.auth.getUser();
    if (userErr || !userData?.user) {
      return jsonResponse({ error: "Unauthorized: invalid JWT" }, 401);
    }

    const callerId = userData.user.id;

    // Autorização: somente SUPER_ADMIN
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: callerProfile, error: callerProfileErr } = await supabaseAdmin
      .from("profiles")
      .select("profile_role")
      .eq("id", callerId)
      .maybeSingle();

    if (callerProfileErr || !callerProfile || callerProfile.profile_role !== "SUPER_ADMIN") {
      return jsonResponse({ error: "Forbidden: only SUPER_ADMIN" }, 403);
    }

    const body = await req.json();
    const {
      email,
      password,
      full_name,
      phone,
      establishment_id,
    } = body as {
      email: string;
      password?: string;
      full_name: string;
      phone?: string;
      establishment_id: string;
    };

    if (!email || !full_name || !establishment_id) {
      return jsonResponse(
        { error: "Parâmetros obrigatórios: email, full_name, establishment_id" },
        400,
      );
    }

    const formattedPhone = phone
      ? phone.toString().replace(/\D/g, "").replace(/^/, (s) => s) // noop: mantém compat
      : null;

    // Ajusta para o formato WhatsApp (opcional; o seu sistema já trata disso em outros fluxos)
    const finalPhone = formattedPhone
      ? (formattedPhone.startsWith("55") ? formattedPhone : `55${formattedPhone}`)
      : null;

    const createPassword = password || DEFAULT_ADMIN_PASSWORD;

    const { data: createdUserData, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email: email.toLowerCase().trim(),
      password: createPassword,
      email_confirm: true,
      user_metadata: {
        full_name,
        role: "barber", // trigger/handle_new_user vai criar profiles.role = 'barber'
      },
    });

    if (createErr) {
      return jsonResponse({ error: createErr.message || "Erro ao criar usuário" }, 400);
    }

    const newUserId = createdUserData.user?.id;
    if (!newUserId) {
      return jsonResponse({ error: "Usuário criado, mas não foi possível obter user id" }, 500);
    }

    // Atualiza profile_role e vínculo com a loja do dono
    const { error: updateErr } = await supabaseAdmin
      .from("profiles")
      .update({
        profile_role: "ADMIN_BARBER",
        establishment_id,
        phone: finalPhone,
        phone_number: finalPhone,
        is_verified: true,
        visible_on_client_home: true,
      })
      .eq("id", newUserId);

    if (updateErr) {
      // Não quebra a criação do usuário, mas sinaliza erro
      return jsonResponse({ success: true, userId: newUserId, warning: updateErr.message }, 200);
    }

    return jsonResponse({
      success: true,
      userId: newUserId,
      message: "Dono da loja criado com sucesso",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[create-establishment-owner] erro:", message);
    return jsonResponse({ error: message }, 500);
  }
});

