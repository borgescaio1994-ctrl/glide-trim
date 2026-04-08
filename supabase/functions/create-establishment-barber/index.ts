import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");

const DEFAULT_BARBER_PASSWORD = "BARBEIRO2026";

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

    const { data: userData, error: userErr } = await supabaseAnon.auth.getUser();
    if (userErr || !userData?.user) {
      return jsonResponse({ error: "Unauthorized: invalid JWT" }, 401);
    }

    const callerId = userData.user.id;
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: callerProfile, error: callerProfileErr } = await supabaseAdmin
      .from("profiles")
      .select("profile_role, establishment_id")
      .eq("id", callerId)
      .maybeSingle();

    if (callerProfileErr || !callerProfile) {
      return jsonResponse({ error: "Forbidden: cannot resolve caller profile" }, 403);
    }

    const isAdmin = callerProfile.profile_role === "ADMIN_BARBER";
    const isSuper = callerProfile.profile_role === "SUPER_ADMIN";
    if (!isAdmin && !isSuper) {
      return jsonResponse({ error: "Forbidden: only ADMIN_BARBER/SUPER_ADMIN" }, 403);
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
      phone?: string | null;
      establishment_id?: string;
    };

    if (!email || !full_name) {
      return jsonResponse({ error: "Parâmetros obrigatórios: email, full_name" }, 400);
    }

    // Dono: usa establishment do perfil; se estiver null (dados antigos), aceita o id enviado pelo painel
    const bodyEstId =
      typeof establishment_id === "string" && establishment_id.trim()
        ? establishment_id.trim()
        : undefined;

    let targetEstablishmentId: string | undefined;
    if (isAdmin) {
      const fromProfile = callerProfile.establishment_id as string | null | undefined;
      if (fromProfile && bodyEstId && fromProfile !== bodyEstId) {
        return jsonResponse(
          { error: "establishment_id não confere com a unidade do seu cadastro" },
          403,
        );
      }
      targetEstablishmentId = fromProfile ?? bodyEstId;
    } else {
      targetEstablishmentId = bodyEstId;
    }

    if (!targetEstablishmentId) {
      return jsonResponse(
        {
          error:
            "establishment_id ausente: o dono precisa estar vinculado a uma loja (perfil establishment_id). Atualize o cadastro ou informe a unidade.",
        },
        400,
      );
    }

    const formattedPhone = phone
      ? phone.toString().replace(/\D/g, "")
      : null;

    const createPassword = password || DEFAULT_BARBER_PASSWORD;

    // 1) Cria usuário de profissional
    const { data: createdUserData, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email: email.toLowerCase().trim(),
      password: createPassword,
      email_confirm: true,
      user_metadata: {
        full_name,
        role: "barber",
      },
    });

    if (createErr) {
      let msg = createErr.message || "Erro ao criar usuário";
      const low = msg.toLowerCase();
      if (low.includes("already registered") || low.includes("already been registered")) {
        msg =
          "Este email já está cadastrado no sistema. Use outro email ou exclua o usuário em Authentication.";
      } else if (low.includes("password") && (low.includes("6") || low.includes("least"))) {
        msg = "Senha inválida: use pelo menos 6 caracteres.";
      }
      return jsonResponse({ error: msg }, 400);
    }

    const newUserId = createdUserData.user?.id;
    if (!newUserId) {
      return jsonResponse({ error: "Usuário criado, mas sem user id" }, 500);
    }

    // 2) Vincula establishment_id e marca como verificado (coluna legada `role` + profile_role)
    const { error: updateErr } = await supabaseAdmin
      .from("profiles")
      .update({
        establishment_id: targetEstablishmentId,
        profile_role: "BARBER",
        role: "barber",
        phone: formattedPhone,
        phone_number: formattedPhone,
        is_verified: true,
        visible_on_client_home: true,
      })
      .eq("id", newUserId);

    if (updateErr) {
      // Não desfaz a criação do auth user.
      return jsonResponse({ success: true, userId: newUserId, warning: updateErr.message }, 200);
    }

    // Lista legada: mantém compatível com fluxos que consultam registered_barbers
    const { error: rbErr } = await supabaseAdmin.from("registered_barbers").insert({
      email: email.toLowerCase().trim(),
      full_name,
      phone: formattedPhone,
      establishment_id: targetEstablishmentId,
    });
    if (rbErr) {
      console.warn("[create-establishment-barber] registered_barbers:", rbErr.message);
    }

    return jsonResponse({
      success: true,
      userId: newUserId,
      message: "Profissional criado com sucesso",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[create-establishment-barber] erro:", message);
    return jsonResponse({ error: message }, 500);
  }
});

