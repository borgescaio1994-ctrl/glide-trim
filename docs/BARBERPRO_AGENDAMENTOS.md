# BookNow – Lógica de Agendamentos (Supabase + Cliente)

## 1. Tabelas no Supabase (já existentes)

As tabelas necessárias para o fluxo de agendamento **já estão criadas** nas migrations do projeto.

### Tabela `profiles`
- **Uso:** Clientes e barbeiros (auth Supabase).
- **Colunas relevantes:** `id`, `full_name`, `email`, `phone`, `role` ('client' | 'barber'), `is_verified`.
- **Migrations:** `20251225193425_*`, `20260104171722_*` (phone, is_verified).

### Tabela `barber_schedules`
- **Uso:** Horários de trabalho do barbeiro por dia da semana.
- **Colunas:** `barber_id`, `day_of_week` (0–6), `start_time`, `end_time`, `is_active`.
- **Migration:** `20251225193425_*`.

### Tabela `services`
- **Uso:** Serviços de cada barbeiro (corte, barba, etc.).
- **Colunas:** `barber_id`, `name`, `description`, `duration_minutes`, `price`, `is_active`.
- **Migration:** `20251225193425_*`.

### Tabela `appointments`
- **Uso:** Agendamentos do cliente com o barbeiro.
- **Colunas principais:**  
  `id`, `client_id`, `barber_id`, `service_id`, `appointment_date`, `start_time`, `end_time`, `status` ('scheduled' | 'completed' | 'cancelled'), `notes`, `completed_at`, `created_at`, `updated_at`.
- **Migrations:** `20251225193425_*` (criação), `20260101190201_*` (completed_at), `20260101190200_*` (políticas de leitura/inserção), `20260216000001_*` (auto-cancelamento de agendamentos passados).

### Políticas RLS (appointments)
- **SELECT:** Qualquer um pode listar (para o cliente ver horários disponíveis).
- **INSERT:** Usuário autenticado pode inserir (o app garante `client_id = auth.uid()` e telefone verificado na UI).
- **UPDATE:** Cliente ou barbeiro do agendamento.

---

## 2. Fluxo do cliente (já implementado)

1. **Página inicial (`/`)**  
   `ClientHome` lista barbeiros (role = 'barber') e permite busca.

2. **Perfil do barbeiro (`/barber/:barberId`)**  
   `BarberProfile` mostra serviços e botão “Agendar” por serviço.

3. **Agendamento (`/book/:barberId/:serviceId`)**  
   `BookAppointment`:
   - Carrega barbeiro, serviço, `barber_schedules` e `appointments` já agendados.
   - Calcula slots disponíveis (respeitando duração do serviço e horário de trabalho).
   - Exige login e **telefone verificado** (`profile.is_verified`) para confirmar.
   - Insere em `appointments` com `client_id`, `barber_id`, `service_id`, `appointment_date`, `start_time`, `end_time`, `status: 'scheduled'`.
   - Redireciona para `/appointments` após sucesso.

Nenhuma tabela nova é obrigatória para esse fluxo; a página de agendamento para o cliente já está implementada e usa as tabelas acima.

---

## 3. Notificações inteligentes (n8n – lembrete 1h antes)

Para o n8n disparar lembretes no WhatsApp 1 hora antes do horário:

- **Dados disponíveis:** `appointments.appointment_date`, `appointments.start_time`, `profiles.phone` (do cliente).
- **Lógica sugerida no n8n:**  
  A cada X minutos, buscar agendamentos com `status = 'scheduled'` onde `appointment_date` seja hoje e `start_time` esteja entre “agora” e “daqui 1 hora”; obter o telefone do cliente via `profiles.id = appointments.client_id` e enviar a mensagem.

Opcionalmente, para não reenviar o mesmo lembrete, pode-se usar a coluna `reminder_sent_at` (veja migration abaixo).

---

## 4. Tabela `agendamentos` (types.ts)

No `types.ts` existe o tipo `agendamentos` (nome em português). No código do app **todas** as queries usam a tabela **`appointments`** (inglês). A tabela `agendamentos` não é usada no fluxo atual; pode ser legado ou de outro contexto. Para o BookNow, use apenas **`appointments`**.
