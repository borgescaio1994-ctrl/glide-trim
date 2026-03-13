import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Layout from "@/components/Layout";
import { Suspense, lazy } from "react";
import { Loader2 } from "lucide-react";
import { App as CapacitorApp } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";

// Lazy loading components para melhor performance
const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const Profile = lazy(() => import("./pages/Profile"));
const Services = lazy(() => import("./pages/Services"));
const Schedule = lazy(() => import("./pages/Schedule"));
const Appointments = lazy(() => import("./pages/Appointments"));
const Finances = lazy(() => import("./pages/Finances"));
const BookAppointment = lazy(() => import("./pages/BookAppointment"));
const BarberProfile = lazy(() => import("./pages/BarberProfile"));
const Gallery = lazy(() => import("./pages/Gallery"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const VerifyPhone = lazy(() => import("./pages/VerifyPhone"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Componente de loading
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center">
    <Loader2 className="animate-spin text-primary" size={32} />
  </div>
);

const queryClient = new QueryClient();

const App = () => {
  useEffect(() => {
    // Handle Android back button
    if (Capacitor.isNativePlatform()) {
      CapacitorApp.addListener('backButton', ({ canGoBack }) => {
        if (canGoBack) {
          window.history.back();
        }
        // Do nothing if cannot go back, preventing app exit
      });
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter future={{ v7_relativeSplatPath: true }}>
            <Layout>
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/services" element={<Services />} />
                  <Route path="/schedule" element={<Schedule />} />
                  <Route path="/appointments" element={<Appointments />} />
                  <Route path="/finances" element={<Finances />} />
                  <Route path="/book/:barberId/:serviceId" element={<BookAppointment />} />
                  <Route path="/barber/:barberId" element={<BarberProfile />} />
                  <Route path="/gallery" element={<Gallery />} />
                  <Route path="/admin" element={<AdminDashboard />} />
                  <Route path="/verify-phone" element={<VerifyPhone />} />
                  {/* Removido /verify-otp para evitar conflito - usando apenas /verify-phone */}
                  <Route path="/auth/callback" element={<Index />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </Layout>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
