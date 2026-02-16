// Teste direto do webhook n8n
const testWebhook = async () => {
  const webhookUrl = "https://primary-jzx9-production.up.railway.app/webhook/64d8e09c-03a0-4d2c-8ada-141e0e26aac3";
  
  const payload = {
    phone: "5511915605439",
    code: "123456",
    action: "send_verification"
  };

  console.log("🔵 Testando webhook:", webhookUrl);
  console.log("🔵 Payload:", payload);

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    console.log("🔵 Status:", response.status);
    console.log("🔵 Headers:", Object.fromEntries(response.headers.entries()));
    
    const result = await response.text();
    console.log("🔵 Resposta:", result);

    if (response.ok) {
      console.log("✅ Webhook funcionou!");
    } else {
      console.error("❌ Erro no webhook:", response.status);
    }
  } catch (error) {
    console.error("❌ Erro ao chamar webhook:", error);
  }
};

// Para executar no console do navegador:
testWebhook();
