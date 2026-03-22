import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '@/hooks/useAuth';
import { ToastProvider } from '@/contexts/ToastContext';
import PhoneVerificationGuard from '@/components/PhoneVerificationGuard';
import CustomerTenantGuard from '@/components/CustomerTenantGuard';
import Layout from '@/components/Layout';
import Index from '@/pages/Index';
import Auth from '@/pages/Auth';
import Profile from '@/pages/Profile';
import Services from '@/pages/Services';
import Schedule from '@/pages/Schedule';
import Appointments from '@/pages/Appointments';
import Finances from '@/pages/Finances';
import BookAppointment from '@/pages/BookAppointment';
import BarberProfile from '@/pages/BarberProfile';
import Gallery from '@/pages/Gallery';
import AdminDashboard from '@/pages/AdminDashboard';
import SuperAdmin from '@/pages/SuperAdmin';
import VerifyPhone from '@/pages/VerifyPhone';
import AssinaturaPendente from '@/pages/AssinaturaPendente';
import BarberPanel from '@/pages/BarberPanel';
import NotFound from '@/pages/NotFound';

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <PhoneVerificationGuard>
            <CustomerTenantGuard />
            <Layout>
              <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/services" element={<Services />} />
              <Route path="/schedule" element={<Schedule />} />
              <Route path="/appointments" element={<Appointments />} />
              <Route path="/finances" element={<Finances />} />
              <Route path="/book/:barberId/:serviceId" element={<BookAppointment />} />
              <Route path="/barber" element={<BarberPanel />} />
              <Route path="/barber/:barberId" element={<BarberProfile />} />
              <Route path="/gallery" element={<Gallery />} />
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/super-admin" element={<SuperAdmin />} />
              <Route path="/assinatura-pendente" element={<AssinaturaPendente />} />
              <Route path="/verify-phone" element={<VerifyPhone />} />
              <Route path="/auth/callback" element={<Index />} />
              <Route path="*" element={<NotFound />} />
              </Routes>
            </Layout>
          </PhoneVerificationGuard>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}
