import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "../src/components/ui/toaster";
import { TooltipProvider } from "../src/components/ui/tooltip";
import NotFound from "../src/pages/not-found";
import HomePage from "../src/pages/home-page";
import AuthPage from "../src/pages/auth-page";
import DocumentPage from "../src/pages/document-page";
import UsersPage from "../src/pages/users-page";
import AuditLogsPage from "../src/pages/audit-logs-page";
import SettingsPage from "../src/pages/settings-page";
import ObsoletePage from "../src/pages/obsolete-page";
import SupportPage from "../src/pages/support-page";
import AboutPage from "../src/pages/about-page";
import ResetPasswordPage from "../src/pages/reset-password-page";
import ClientsPage from "../src/pages/clients-page";
import { ProtectedRoute } from "./lib/protected-route";
// Non importiamo più questi hook qui perché sono gestiti in main.tsx

function Router() {
  return (
    <Switch>
      {/* Protected routes */}
      <ProtectedRoute path="/" component={HomePage} />
      <ProtectedRoute path="/documents/:id" component={DocumentPage} />
      <ProtectedRoute path="/users" component={UsersPage} adminOnly={true} />
      <ProtectedRoute
        path="/clients"
        component={ClientsPage}
        adminOnly={true}
      />
      <ProtectedRoute
        path="/audit-logs"
        component={AuditLogsPage}
        adminOnly={true}
      />
      <ProtectedRoute path="/settings" component={SettingsPage} />
      <ProtectedRoute
        path="/obsolete"
        component={ObsoletePage}
        adminOnly={true}
      />

      {/* Public routes */}
      <Route path="/auth" component={AuthPage} />
      <Route path="/reset-password" component={ResetPasswordPage} />
      <Route path="/assistenza" component={SupportPage} />
      <Route path="/chi-siamo" component={AboutPage} />

      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

// La gestione della sessione è ora gestita dal componente SessionManager in main.tsx

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
