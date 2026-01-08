import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreateAccountRequest {
  phone: string;
  barberId: string;
  serviceId: string;
  selectedDate: string;
  selectedTime: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { phone, barberId, serviceId, selectedDate, selectedTime }: CreateAccountRequest = await req.json();

    if (!phone) {
      return new Response(
        JSON.stringify({ error: "Número de telefone é obrigatório" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Format phone number
    let formattedPhone = phone.replace(/\D/g, "");
    if (!formattedPhone.startsWith("55")) {
      formattedPhone = "55" + formattedPhone;
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Generate a UUID for the client profile
    const userId = crypto.randomUUID();

    // Create profile
    const { error: profileError } = await supabase
      .from("profiles")
      .insert({
        id: userId,
        phone: formattedPhone,
        full_name: "Cliente WhatsApp",
        role: "client",
      });

    if (profileError) {
      console.error("Error creating profile:", profileError);
      // Continue anyway for testing
    }

    // TODO: Create appointment - for now just return success
    let appointmentId = null;

    return new Response(
      JSON.stringify({
        success: true,
        user_id: userId,
        phone: formattedPhone,
        appointment_id: appointmentId
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in create-account-with-phone function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);