// Teste direto da conexão com o banco Supabase
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://rubvkpxvgffmnloaxbqa.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ1YnZrcHh2Z2ZmbW5sb2F4YnFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY5MzI0MjEsImV4cCI6MjA1MjUwODQyMX0.W15sI9qU1wZcQp2R2xLpBqZJlXJ4QKqLdYhNw1X2Y7Z8';

const supabase = createClient(supabaseUrl, supabaseKey);

const testConnection = async () => {
  console.log('🔵 Testando conexão com o banco...');
  
  try {
    // Teste 1: Verificar se tabela existe
    console.log('🔵 Teste 1: Verificando se tabela phone_verifications existe...');
    const { data: tableCheck, error: tableError } = await supabase
      .from('phone_verifications')
      .select('id')
      .limit(1);
    
    console.log('🔵 Resultado verificação tabela:', { tableCheck, tableError });
    
    if (tableError) {
      console.error('🔴 Erro ao verificar tabela:', tableError);
      console.error('🔴 Detalhes:', tableError.message);
      return;
    }
    
    // Teste 2: Buscar um código específico
    console.log('🔵 Teste 2: Buscando código específico...');
    const { data: codeData, error: codeError } = await supabase
      .from('phone_verifications')
      .select('*')
      .eq('phone_number', '5511915605439')
      .eq('verification_code', '123456')
      .single();
    
    console.log('🔵 Resultado busca código:', { codeData, codeError });
    
    if (codeError) {
      console.error('🔴 Erro ao buscar código:', codeError);
      console.error('🔴 Detalhes:', codeError.message);
      console.error('🔴 Código:', codeError.code);
    } else {
      console.log('✅ Código encontrado:', codeData);
    }
    
    // Teste 3: Listar todos os códigos
    console.log('🔵 Teste 3: Listando todos os códigos...');
    const { data: allCodes, error: allError } = await supabase
      .from('phone_verifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);
    
    console.log('🔵 Resultado todos os códigos:', { allCodes, allError });
    
    if (allError) {
      console.error('🔴 Erro ao listar códigos:', allError);
    } else {
      console.log('✅ Códigos encontrados:', allCodes?.length || 0);
    }
    
  } catch (error) {
    console.error('🔴 Erro geral na conexão:', error);
  }
};

// Para executar no console do navegador:
// 1. Cole este código no console (F12)
// 2. Execute: testConnection()

console.log('Para testar, execute: testConnection()');
window.testConnection = testConnection;
