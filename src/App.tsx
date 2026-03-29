import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '@/hooks/useAuth';
import { ToastProvider } from '@/contexts/ToastContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import PhoneVerificationGuard from '@/components/PhoneVerificationGuard';
import CustomerTenantGuard from '@/components/CustomerTenantGuard';
import Layout from '@/components/Layout';
import ScrollAndReloadSync from '@/components/ScrollAndReloadSync';
import AuthBootstrapGate from '@/components/AuthBootstrapGate';

const Index = lazy(() => import('@/pages/Index'));
const Auth = lazy(() => import('@/pages/Auth'));
const Profile = lazy(() => import('@/pages/Profile'));
const Services = lazy(() => import('@/pages/Services'));
const Schedule = lazy(() => import('@/pages/Schedule'));
const Appointments = lazy(() => import('@/pages/Appointments'));
const Finances = lazy(() => import('@/pages/Finances'));
const BookAppointment = lazy(() => import('@/pages/BookAppointment'));
const BarberProfile = lazy(() => import('@/pages/BarberProfile'));
const Gallery = lazy(() => import('@/pages/Gallery'));
const AdminDashboard = lazy(() => import('@/pages/AdminDashboard'));
const SuperAdmin = lazy(() => import('@/pages/SuperAdmin'));
const VerifyPhone = lazy(() => import('@/pages/VerifyPhone'));
const AssinaturaPendente = lazy(() => import('@/pages/AssinaturaPendente'));
const BarberPanel = lazy(() => import('@/pages/BarberPanel'));
const NotFound = lazy(() => import('@/pages/NotFound'));

function PageFallback() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center text-sm text-muted-foreground">
      Carregando…
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <AuthBootstrapGate>
        <BrowserRouter
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true,
          }}
        >
          <ScrollAndReloadSync />
          <ThemeProvider>
          <PhoneVerificationGuard>
            <CustomerTenantGuard />
            <Layout>
              <Suspense fallback={<PageFallback />}>
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
              </Suspense>
            </Layout>
          </PhoneVerificationGuard>
          </ThemeProvider>
        </BrowserRouter>
        </AuthBootstrapGate>
      </ToastProvider>
    </AuthProvider>
  );
}
