import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, Users, Calendar } from "lucide-react";

export default function AdminDashboard() {
  const [stats, setStats] = useState({ totalRevenue: 0, totalAppointments: 0, totalClients: 0 });

  useEffect(() => {
    async function fetchStats() {
      // Busca agendamentos para somar o faturamento
      const { data: appts } = await supabase.from("agendamentos").select("valor");
      const { data: profiles } = await supabase.from("profiles").select("id");
      
      const revenue = appts?.reduce((acc, curr) => acc + (curr.valor || 0), 0) || 0;
      
      setStats({
        totalRevenue: revenue,
        totalAppointments: appts?.length || 0,
        totalClients: profiles?.length || 0
      });
    }
    fetchStats();
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-8">Painel do Barbeiro Chefe</h1>
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Faturamento Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R$ {stats.totalRevenue.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Agendamentos</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalAppointments}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clientes Cadastrados</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalClients}</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}