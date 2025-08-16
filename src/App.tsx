import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import MileTracker from "./pages/MileTracker";
import Appointments from "./pages/Appointments";
import Clients from "./pages/Clients";
import { NavBar } from "@/components/NavBar";
import { SupabaseAuthProvider, useSupabaseAuth } from "@/contexts/SupabaseAuthProvider";
import ProtectedRoute from "@/components/ProtectedRoute";
import Login from "./pages/Login";

const queryClient = new QueryClient();

const AppShell = () => {
  const { session } = useSupabaseAuth();
  return (
    <BrowserRouter>
      {session && <NavBar />}
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
        <Route path="/miles" element={<ProtectedRoute><MileTracker /></ProtectedRoute>} />
        <Route path="/appointments" element={<ProtectedRoute><Appointments /></ProtectedRoute>} />
        <Route path="/clients" element={<ProtectedRoute><Clients /></ProtectedRoute>} />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <SupabaseAuthProvider>
        <AppShell />
      </SupabaseAuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;