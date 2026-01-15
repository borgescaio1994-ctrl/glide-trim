import { create, getNumericDate } from "https://deno.land/x/djwt@v2.8/mod.ts"
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

serve(async (req) => {
  try {
    const { token, title, body, data } = await req.json()

    const serviceAccountJson = Deno.env.get('SERVICE_ACCOUNT_JSON')

    if (!serviceAccountJson) {
      return new Response(JSON.stringify({ error: 'SERVICE_ACCOUNT_JSON not set' }), { status: 500 })
    }

    const serviceAccount = JSON.parse(serviceAccountJson)
    const privateKey = serviceAccount.private_key
    const clientEmail = serviceAccount.client_email
    const projectId = serviceAccount.project_id

    // Generate JWT
    const header = { alg: "RS256" as const, typ: "JWT" }
    const payload = {
      iss: clientEmail,
      scope: "https://www.googleapis.com/auth/firebase.messaging",
      aud: "https://oauth2.googleapis.com/token",
      exp: getNumericDate(3600),
      iat: getNumericDate(0)
    }
    const jwt = await create(header, payload, privateKey)

    // Get access token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`
    })
    const tokenData = await tokenResponse.json()
    if (!tokenData.access_token) {
      return new Response(JSON.stringify({ error: 'Failed to get access token' }), { status: 500 })
    }
    const accessToken = tokenData.access_token

    // Send FCM
    const fcmResponse = await fetch(`https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        message: {
          token,
          notification: {
            title,
            body,
          },
          data: data || {},
        },
      }),
    })
    const result = await fcmResponse.json()
    return new Response(JSON.stringify(result), { headers: { 'Content-Type': 'application/json' } })
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), { status: 500 })
  }
})