import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuth } from "../src/hooks/use-auth";
import { ThemeProvider } from "../src/hooks/use-theme";
import { queryClient } from "../src/lib/queryClient";
import { useEffect } from "react";
import App from "./App";
import "./index.css";

// Componente per gestire la sessione dell'utente
function SessionActivityMonitor() {
  const { user } = useAuth();
  
  // Utilizziamo useEffect per gestire correttamente il ciclo di vita
  useEffect(() => {
    let timerId: number | undefined;
    
    // Esegui solo se l'utente è autenticato
    if (user) {
      // Invia un ping al server ogni 15 minuti
      timerId = window.setInterval(() => {
        // Usa il fetch API direttamente per semplicità
        fetch('/api/extend-session', { method: 'POST' })
          .then(() => console.log("Sessione estesa"))
          .catch((error: Error) => console.error("Errore estensione sessione:", error));
      }, 15 * 60 * 1000);
    }
    
    // Cleanup del timer quando il componente viene smontato
    return () => {
      if (timerId) window.clearInterval(timerId);
    };
  }, [user]); // Riesegui quando cambia l'utente
  
  return null; // Non renderizza nulla, solo effetti collaterali
}

// Componente avvolgente che gestisce l'autenticazione e la sessione
function AppWithAuth() {
  return (
    <AuthProvider>
      <SessionActivityMonitor />
      <App />
    </AuthProvider>
  );
}

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AppWithAuth />
    </ThemeProvider>
  </QueryClientProvider>
);
