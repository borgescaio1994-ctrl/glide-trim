// Teste direto da função Supabase
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://rubvkpxvgffmnloaxbqa.supabase.co';
const supabaseKey = 'sua-chave-anon-aqui'; // Substitua com sua chave anon

const supabase = createClient(supabaseUrl, supabaseKey);

const testFunction = async () => {
  console.log('🔵 Testando função send-whatsapp-verification...');
  
  try {
    console.log('🔵 Chamando supabase.functions.invoke...');
    const { data, error } = await supabase.functions.invoke('send-whatsapp-verification', {
      body: { 
        phone: '5511915605439', 
        code: '123456' 
      }
    });

    console.log('🔵 Resultado:', { data, error });
    console.log('🔵 Data type:', typeof data);
    console.log('🔵 Error type:', typeof error);
    
    if (error) {
      console.error('🔴 Erro na função:', error);
    } else {
      console.log('✅ Função executada com sucesso!');
    }
  } catch (err) {
    console.error('🔴 Exceção:', err);
  }
};

// Para executar no console do navegador:
// 1. Substitua 'sua-chave-anon-aqui' pela sua chave real
// 2. Cole este código no console
// 3. Execute: testFunction()

console.log('Para testar, execute: testFunction()');
window.testFunction = testFunction;
