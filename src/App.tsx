import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import AppLayout from "@/components/AppLayout";
import HomeRedirect from "@/pages/HomeRedirect";
import OnboardingPage from "@/pages/OnboardingPage";
import MatchesPage from "@/pages/MatchesPage";
import ChatsPage from "@/pages/ChatsPage";
import ChatPage from "@/pages/ChatPage";
import ProfilePage from "@/pages/ProfilePage";
import MatchedProfileView from "@/pages/MatchedProfileView";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route element={<AppLayout />}>
              <Route path="/" element={<HomeRedirect />} />
              <Route path="/onboarding" element={<OnboardingPage />} />
              <Route path="/matches" element={<MatchesPage />} />
              <Route path="/chats" element={<ChatsPage />} />
              <Route path="/chats/:matchId" element={<ChatPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route
                path="/match/:matchId"
                element={<MatchedProfileView backTo="/matches" backLabel="Back to Matches" />}
              />
              <Route
                path="/chat/:matchId"
                element={<MatchedProfileView backTo="/chats" backLabel="Back to Chats" />}
              />
            </Route>
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
