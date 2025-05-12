import { createContext, ReactNode, useContext } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { UserDocument as User } from "../../../shared-types/schema";
import { getQueryFn, apiRequest, queryClient } from "../lib/queryClient";
import { useToast } from "./use-toast";
import { z } from "zod";

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<User, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<User, Error, RegisterData>;
};

const loginSchema = z.object({
  email: z.string().email("Inserisci un indirizzo email valido"),
  password: z.string().min(6, "La password deve essere di almeno 6 caratteri"),
  remember: z.boolean().optional().default(false),
});

const registerSchema = z
  .object({
    email: z.string().email("Inserisci un indirizzo email valido"),
    password: z
      .string()
      .min(6, "La password deve essere di almeno 6 caratteri"),
    confirmPassword: z
      .string()
      .min(6, "La password deve essere di almeno 6 caratteri"),
    companyCode: z.string().optional(), // Codice aziendale opzionale
    acceptTerms: z.boolean().refine((val) => val === true, {
      message: "Devi accettare i termini e le condizioni",
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Le password non corrispondono",
    path: ["confirmPassword"],
  });

type LoginData = z.infer<typeof loginSchema>;
type RegisterData = z.infer<typeof registerSchema>;

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();

  const {
    data: user,
    error,
    isLoading,
  } = useQuery<User | null, Error>({
    queryKey: ["/api/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    // Aggiorniamo ogni minuto per verificare lo stato dell'autenticazione
    // invece di fare polling continuo
    refetchInterval: 60 * 1000,
    // Riduciamo il numero di richieste di rete
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    refetchOnReconnect: true,
    staleTime: 30 * 1000, // 30 secondi
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      const res = await apiRequest("POST", "/api/login", credentials);
      return await res.json();
    },
    onSuccess: async (data) => {
      // Forza un refresh della query dell'utente
      await queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      // Imposta i dati dell'utente
      queryClient.setQueryData(["/api/user"], data);
      toast({
        title: "Accesso effettuato",
        description: `Bentornato, ${data.email}!`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Accesso fallito",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (credentials: RegisterData) => {
      const { confirmPassword, ...registerData } = credentials;
      const res = await apiRequest("POST", "/api/register", registerData);
      return await res.json();
    },
    onSuccess: (user: User) => {
      queryClient.setQueryData(["/api/user"], user);
      toast({
        title: "Registrazione completata",
        description: `Benvenuto, ${user.email}!`,
      });
      // Il reindirizzamento viene gestito dal componente di autenticazione
      // con un ritardo per mostrare lo spinner
    },
    onError: (error: Error) => {
      toast({
        title: "Registrazione fallita",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/logout");
    },
    onSuccess: () => {
      queryClient.clear();
      queryClient.setQueryData(["/api/user"], null);
      toast({
        title: "Disconnessione effettuata",
        description: "Sei stato disconnesso con successo",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Disconnessione fallita",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        error,
        loginMutation,
        logoutMutation,
        registerMutation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
