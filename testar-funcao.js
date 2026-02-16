// Teste direto da função Supabase
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://rubvkpxvgffmnloaxbqa.supabase.co';
const supabaseKey = 'sua-chave-aqui'; // Substitua com sua chave real

const supabase = createClient(supabaseUrl, supabaseKey);

const testFunction = async () => {
  console.log('🔵 Testando função send-whatsapp-verification...');
  
  try {
    const { data, error } = await supabase.functions.invoke('send-whatsapp-verification', {
      body: { 
        phone: '5511915605439', 
        code: '123456' 
      }
    });

    console.log('🔵 Resultado:', { data, error });
    
    if (error) {
      console.error('🔴 Erro:', error);
    } else {
      console.log('✅ Sucesso:', data);
    }
  } catch (err) {
    console.error('🔴 Exceção:', err);
  }
};

// Para executar no navegador:
// 1. Abra o console do navegador (F12)
// 2. Cole este código
// 3. Substitua 'sua-chave-aqui' pela sua chave real
// 4. Execute testFunction()

console.log('Para testar, execute: testFunction()');
window.testFunction = testFunction;
