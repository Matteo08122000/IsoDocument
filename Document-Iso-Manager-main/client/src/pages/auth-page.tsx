import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "../hooks/use-auth";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/ui/tabs";
import { Input } from "../components/ui/input";
import { Checkbox } from "../components/ui/checkbox";
import { Label } from "../components/ui/label";
import { AlertCircle, FileText, Lock, Mail, KeyRound } from "lucide-react";
import AuthNavbar from "../components/auth-navbar";
import Footer from "../components/footer";
import LoadingSpinner from "../components/loading-spinner";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../components/ui/form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "../lib/queryClient";
import { useToast } from "../hooks/use-toast";

const loginSchema = z.object({
  email: z.string().email("Inserisci un indirizzo email valido"),
  password: z.string().min(6, "La password deve contenere almeno 6 caratteri"),
  remember: z.boolean().default(false),
});

const registerSchema = z
  .object({
    email: z.string().email("Inserisci un indirizzo email valido"),
    password: z
      .string()
      .min(6, "La password deve contenere almeno 6 caratteri"),
    confirmPassword: z
      .string()
      .min(6, "La password deve contenere almeno 6 caratteri"),
    companyCode: z.string().optional(),
    acceptTerms: z.boolean().refine((val) => val, {
      message: "Devi accettare i termini e le condizioni",
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Le password non coincidono",
    path: ["confirmPassword"],
  });

type LoginFormValues = z.infer<typeof loginSchema>;
type RegisterFormValues = z.infer<typeof registerSchema>;

// Schema per il form di recupero password
const forgotPasswordSchema = z.object({
  email: z.string().email("Inserisci un indirizzo email valido"),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export default function AuthPage() {
  const [tabValue, setTabValue] = useState("login");
  const [showPasswordResetModal, setShowPasswordResetModal] = useState(false);
  const [showLoadingSpinner, setShowLoadingSpinner] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const { toast } = useToast();

  const [_, setLocation] = useLocation();
  const { user, isLoading, loginMutation, registerMutation } = useAuth();

  // Gestisce il reindirizzamento quando l'utente è autenticato
  useEffect(() => {
    // Se l'utente è autenticato e non è in corso un caricamento
    if (user && !isLoading) {
      // Mostra lo spinner di caricamento
      setLoadingMessage("Reindirizzamento in corso...");
      setShowLoadingSpinner(true);

      // Reindirizza alla home page dopo un breve delay per mostrare lo spinner
      const redirectTimeout = setTimeout(() => {
        setLocation("/");
      }, 2000); // Ridotto a 1 secondo per una migliore esperienza utente

      // Pulisce il timeout se il componente viene smontato
      return () => clearTimeout(redirectTimeout);
    }
  }, [user, isLoading, setLocation]);

  // Gestisce lo spinner durante il login
  useEffect(() => {
    if (loginMutation.isPending) {
      setLoadingMessage("Accesso in corso...");
      setShowLoadingSpinner(true);
    } else {
      setShowLoadingSpinner(false);
    }
  }, [loginMutation.isPending]);

  // Gestisce lo spinner durante la registrazione
  useEffect(() => {
    if (registerMutation.isPending) {
      setLoadingMessage("Registrazione in corso...");
      setShowLoadingSpinner(true);
    } else {
      setShowLoadingSpinner(false);
    }
  }, [registerMutation.isPending]);

  // Login form
  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
      remember: false,
    },
  });

  // Register form
  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
      companyCode: "",
      acceptTerms: false,
    },
  });

  // Handle login form submission
  const onLoginSubmit = (values: LoginFormValues) => {
    loginMutation.mutate({
      email: values.email,
      password: values.password,
      remember: values.remember,
    });
  };

  // Handle register form submission
  const onRegisterSubmit = (values: RegisterFormValues) => {
    registerMutation.mutate({
      email: values.email,
      password: values.password,
      confirmPassword: values.confirmPassword,
      companyCode: values.companyCode,
      acceptTerms: values.acceptTerms,
    });
  };

  // Password reset form
  const passwordResetForm = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  // Password reset mutation
  const passwordResetMutation = useMutation({
    mutationFn: async (data: ForgotPasswordFormValues) => {
      const res = await apiRequest("POST", "/api/forgot-password", data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Email inviata",
        description:
          "Se l'indirizzo email è registrato, riceverai un link per reimpostare la password.",
        duration: 1000,
      });
      passwordResetForm.reset();
      setShowPasswordResetModal(false);
    },
    onError: (error) => {
      toast({
        title: "Errore",
        description:
          error instanceof Error
            ? error.message
            : "Si è verificato un errore durante l'invio dell'email.",
        variant: "destructive",
      });
    },
  });

  // Handle password reset form submission
  const onPasswordResetSubmit = (values: ForgotPasswordFormValues) => {
    passwordResetMutation.mutate({ email: values.email });
  };

  return (
    <div className="min-h-screen flex flex-col">
      {showLoadingSpinner && <LoadingSpinner message={loadingMessage} />}
      <AuthNavbar />

      <div className="flex-1 flex flex-col lg:flex-row">
        {/* Left column - Auth forms */}
        <div className="flex-1 flex items-center justify-center p-6 bg-white dark:bg-slate-900">
          <Card className="w-full max-w-md">
            <CardContent className="pt-6">
              <Tabs
                value={tabValue}
                onValueChange={setTabValue}
                className="w-full"
              >
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="login">Accedi</TabsTrigger>
                  <TabsTrigger value="register">Registrati</TabsTrigger>
                </TabsList>

                <TabsContent value="login">
                  <h1 className="text-2xl font-bold text-center mb-6">
                    Gestione Documenti ISO
                  </h1>

                  <Form {...loginForm}>
                    <form
                      onSubmit={loginForm.handleSubmit(onLoginSubmit)}
                      className="space-y-4"
                    >
                      <FormField
                        control={loginForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Mail className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                                <Input
                                  placeholder="tua@email.com"
                                  className="pl-10"
                                  {...field}
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={loginForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Password</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Lock className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                                <Input
                                  type="password"
                                  placeholder="••••••••"
                                  className="pl-10"
                                  {...field}
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="flex items-center justify-between">
                        <FormField
                          control={loginForm.control}
                          name="remember"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <FormLabel className="text-sm font-normal cursor-pointer">
                                Ricordami
                              </FormLabel>
                            </FormItem>
                          )}
                        />

                        <Button
                          variant="link"
                          className="text-sm font-medium text-primary hover:text-primary/90 p-0 h-auto"
                          onClick={() => setShowPasswordResetModal(true)}
                        >
                          Password dimenticata?
                        </Button>
                      </div>

                      <Button
                        type="submit"
                        className="w-full"
                        disabled={loginMutation.isPending}
                      >
                        {loginMutation.isPending
                          ? "Accesso in corso..."
                          : "Accedi"}
                      </Button>
                    </form>
                  </Form>
                </TabsContent>

                <TabsContent value="register">
                  <h1 className="text-2xl font-bold text-center mb-6">
                    Crea un Account
                  </h1>

                  <Form {...registerForm}>
                    <form
                      onSubmit={registerForm.handleSubmit(onRegisterSubmit)}
                      className="space-y-4"
                    >
                      <FormField
                        control={registerForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Mail className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                                <Input
                                  placeholder="tua@email.com"
                                  className="pl-10"
                                  {...field}
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={registerForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Password</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Lock className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                                <Input
                                  type="password"
                                  placeholder="••••••••"
                                  className="pl-10"
                                  {...field}
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={registerForm.control}
                        name="confirmPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Conferma Password</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Lock className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                                <Input
                                  type="password"
                                  placeholder="••••••••"
                                  className="pl-10"
                                  {...field}
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={registerForm.control}
                        name="companyCode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              Codice Aziendale{" "}
                              <span className="text-sm text-muted-foreground">
                                (opzionale)
                              </span>
                            </FormLabel>
                            <FormControl>
                              <div className="relative">
                                <KeyRound className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                                <Input
                                  placeholder="Inserisci il codice se ne possiedi uno"
                                  className="pl-10"
                                  {...field}
                                />
                              </div>
                            </FormControl>
                            <FormDescription>
                              Se disponi di un codice aziendale, inseriscilo qui
                              per ottenere privilegi speciali.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={registerForm.control}
                        name="acceptTerms"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-2 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel className="text-sm font-normal cursor-pointer">
                                Accetto i termini e le condizioni
                              </FormLabel>
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <Button
                        type="submit"
                        className="w-full mt-6"
                        disabled={registerMutation.isPending}
                      >
                        {registerMutation.isPending
                          ? "Registrazione in corso..."
                          : "Registrati"}
                      </Button>
                    </form>
                  </Form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* Right column - Hero image and description */}
        <div className="flex-1 bg-primary p-10 text-primary-foreground flex flex-col justify-center items-center space-y-6 lg:space-y-10">
          <div className="max-w-md text-center">
            <h1 className="text-3xl font-bold mb-4">Gestione Documenti ISO</h1>
            <p className="mb-6 text-lg opacity-90">
              Gestisci, organizza e monitora i tuoi documenti ISO nel rispetto
              delle normative
            </p>
            <div className="flex flex-col space-y-4">
              <div className="flex items-start space-x-3">
                <div className="bg-primary-foreground text-primary rounded-full p-1 mt-0.5">
                  <FileText size={16} />
                </div>
                <div className="text-left">
                  <h3 className="font-medium">Tracciamento completo</h3>
                  <p className="text-sm opacity-90">
                    Mantieni traccia dello stato e delle revisioni dei documenti
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="bg-primary-foreground text-primary rounded-full p-1 mt-0.5">
                  <AlertCircle size={16} />
                </div>
                <div className="text-left">
                  <h3 className="font-medium">Avvisi automatici</h3>
                  <p className="text-sm opacity-90">
                    Ricevi notifiche sui documenti in scadenza o obsoleti
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />

      {/* Password reset modal */}
      <Dialog
        open={showPasswordResetModal}
        onOpenChange={setShowPasswordResetModal}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Recupera password</DialogTitle>
            <DialogDescription>
              Inserisci il tuo indirizzo email per ricevere un link di recupero
              password.
            </DialogDescription>
          </DialogHeader>

          <Form {...passwordResetForm}>
            <form
              onSubmit={passwordResetForm.handleSubmit(onPasswordResetSubmit)}
              className="space-y-4 py-4"
            >
              <FormField
                control={passwordResetForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Mail className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                        <Input
                          placeholder="tua@email.com"
                          className="pl-10"
                          {...field}
                          autoComplete="email"
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter className="mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowPasswordResetModal(false)}
                >
                  Annulla
                </Button>
                <Button
                  type="submit"
                  disabled={passwordResetMutation.isPending}
                >
                  {passwordResetMutation.isPending
                    ? "Invio in corso..."
                    : "Invia link di recupero"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
