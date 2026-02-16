const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://bdqwermcastalojpkybi.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkcXdlcm1jYXN0YWxvanBreWJpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY2Nzk4MDYsImV4cCI6MjA0MjI1NTgwNn0.JcqBOLGABqhkd4PTPAjkgicXJNkSyDq6K6WWYPkZjUc';

const supabase = createClient(supabaseUrl, supabaseKey);

async function createIndex() {
  try {
    const { data, error } = await supabase.rpc('execute_sql', {
      sql: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_phone_verifications_lookup ON public.phone_verifications (phone_number, verification_code, verified_at);'
    });
    
    if (error) {
      console.error('Erro ao criar índice:', error);
    } else {
      console.log('Índice criado com sucesso!');
    }
  } catch (err) {
    console.error('Erro:', err);
  }
}

createIndex();
