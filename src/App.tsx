import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Layout from "@/components/Layout";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Profile from "./pages/Profile";
import Services from "./pages/Services";
import Schedule from "./pages/Schedule";
import Appointments from "./pages/Appointments";
import Finances from "./pages/Finances";
import BookAppointment from "./pages/BookAppointment";
import BarberProfile from "./pages/BarberProfile";
import AdminDashboard from "./pages/AdminDashboard"; // Adição da importação
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <HashRouter>
          <Layout>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/services" element={<Services />} />
              <Route path="/schedule" element={<Schedule />} />
              <Route path="/appointments" element={<Appointments />} />
              <Route path="/finances" element={<Finances />} />
              <Route path="/admin" element={<AdminDashboard />} /> {/* Adição da rota */}
              <Route path="/book/:barberId/:serviceId" element={<BookAppointment />} />
              <Route path="/barber/:barberId" element={<BarberProfile />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Layout>
        </HashRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;