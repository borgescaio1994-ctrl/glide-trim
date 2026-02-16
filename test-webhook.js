// Teste manual do webhook n8n
const testWebhook = async () => {
  const webhookUrl = "https://primary-jzx9-production.up.railway.app/webhook/64d8e09c-03a0-4d2c-8ada-141e0e26aac3";
  
  const payload = {
    phone: "5511915605439",
    code: "123456"
  };

  console.log('🔵 Testando webhook:', webhookUrl);
  console.log('🔵 Payload:', payload);

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    console.log('🔵 Status:', response.status);
    console.log('🔵 Status Text:', response.statusText);
    
    const text = await response.text();
    console.log('🔵 Response:', text);
    
    if (response.ok) {
      console.log('✅ Webhook funcionando!');
    } else {
      console.log('❌ Webhook com erro');
    }
  } catch (error) {
    console.error('🔴 Erro ao testar webhook:', error);
  }
};

// Executar teste
testWebhook();
