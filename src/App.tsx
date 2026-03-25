import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/AppLayout";
import Dashboard from "@/pages/Dashboard";
import CampaignsPage from "@/pages/CampaignsPage";
import LeadsPage from "@/pages/LeadsPage";
import TelecallingPage from "@/pages/TelecallingPage";
import FollowUpsPage from "@/pages/FollowUpsPage";
import AdmissionsPage from "@/pages/AdmissionsPage";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppLayout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/campaigns" element={<CampaignsPage />} />
            <Route path="/leads" element={<LeadsPage />} />
            <Route path="/telecalling" element={<TelecallingPage />} />
            <Route path="/follow-ups" element={<FollowUpsPage />} />
            <Route path="/admissions" element={<AdmissionsPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AppLayout>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
