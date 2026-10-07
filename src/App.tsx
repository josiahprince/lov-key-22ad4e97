import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import AppLayout from "@/components/AppLayout";
import HomeRedirect from "@/pages/HomeRedirect";
import OnboardingPage from "@/pages/OnboardingPage";
import MatchesPage from "@/pages/MatchesPage";
import ChatsPage from "@/pages/ChatsPage";
import ChatPage from "@/pages/ChatPage";
import ProfilePage from "@/pages/ProfilePage";
import GradientShell from "@/components/GradientShell";
import LoadingState from "@/components/LoadingState";

// The main screens load up front; pages people visit rarely are fetched on demand.
const SettingsPage = lazy(() => import("@/pages/SettingsPage"));
const TermsPage = lazy(() => import("@/pages/TermsPage"));
const PrivacyPage = lazy(() => import("@/pages/PrivacyPage"));
const ResetPasswordPage = lazy(() => import("@/pages/ResetPasswordPage"));
const MatchedProfileView = lazy(() => import("@/pages/MatchedProfileView"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

// Light / Dark / System, chosen in Settings → Appearance and kept per device.
const App = () => (
  <ThemeProvider attribute="class" defaultTheme="system" enableSystem storageKey="lovkey-theme" disableTransitionOnChange>
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Suspense
            fallback={
              <GradientShell centered>
                <LoadingState variant="spinner" label="Loading..." />
              </GradientShell>
            }
          >
          <Routes>
            <Route element={<AppLayout />}>
              <Route path="/" element={<HomeRedirect />} />
              <Route path="/onboarding" element={<OnboardingPage />} />
              <Route path="/matches" element={<MatchesPage />} />
              <Route path="/chats" element={<ChatsPage />} />
              <Route path="/chats/:matchId" element={<ChatPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route
                path="/match/:matchId"
                element={<MatchedProfileView backTo="/matches" backLabel="Back to Matches" />}
              />
              <Route
                path="/chat/:matchId"
                element={<MatchedProfileView backTo="/chats" backLabel="Back to Chats" />}
              />
            </Route>
            {/* Public: linked from the sign-up form and the reset-password email, so they can't sit behind AppLayout's auth gate */}
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  </ThemeProvider>
);

export default App;
