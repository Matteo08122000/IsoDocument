import { useState, useEffect, FormEvent } from "react";
import react from "react";
import { useAuth } from "../hooks/use-auth";
import { useToast } from "../hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import HeaderBar from "../components/header-bar";
import Footer from "../components/footer";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Label } from "../components/ui/label";
import { Switch } from "../components/ui/switch";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/ui/tabs";
import { RefreshCw, Loader2 } from "lucide-react";
import { Separator } from "../components/ui/separator";
// Rimossi import non più necessari
import { apiRequest } from "../lib/queryClient";

// La funzionalità di debug dell'autenticazione è stata rimossa

interface PasswordForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
  error?: string;
}

export default function SettingsPage() {
  const [tabValue, setTabValue] = useState("account");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [passwordForm, setPasswordForm] = useState<PasswordForm>({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const { user } = useAuth();
  const { toast } = useToast();

  // Gestione del cambio password
  const handleChangePassword = async (e: FormEvent) => {
    e.preventDefault();

    // Validazione lato client
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordForm((prev) => ({
        ...prev,
        error: "Le password non corrispondono",
      }));
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      setPasswordForm((prev) => ({
        ...prev,
        error: "La nuova password deve essere di almeno 6 caratteri",
      }));
      return;
    }

    setIsSubmitting(true);
    setPasswordForm((prev) => ({ ...prev, error: undefined }));

    // Usiamo una variabile locale per tenere traccia dei dati del form
    const currentFormData = {
      currentPassword: passwordForm.currentPassword,
      newPassword: passwordForm.newPassword,
      confirmPassword: passwordForm.confirmPassword,
    };

    try {
      const response = await fetch("/api/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: currentFormData.currentPassword,
          newPassword: currentFormData.newPassword,
        }),
        credentials: "include",
      });

      if (response.ok) {
        // Successo - prima resetta il form, poi mostra il toast
        const emptyForm = {
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        };

        setPasswordForm(emptyForm);
        console.log("Form resettatato", emptyForm);

        // Mostra messaggio di successo
        toast({
          title: "Password Aggiornata",
          description:
            "La tua password è stata modificata con successo. Sarai disconnesso tra 3 secondi.",
          variant: "default",
        });

        // Attendi 3 secondi per consentire all'utente di vedere il messaggio, poi esegui logout
        setTimeout(() => {
          fetch("/api/logout", {
            method: "POST",
            credentials: "include",
          })
            .then(() => {
              // Dopo il logout, reindirizza alla pagina di login
              window.location.href = "/auth";
            })
            .catch((err) => {
              console.error("Errore durante il logout:", err);
              // In caso di errore, reindirizza comunque alla pagina di login
              window.location.href = "/auth";
            });
        }, 3000);
      } else {
        // Errore
        try {
          const errorData = await response.json();
          setPasswordForm((prev) => ({
            ...prev,
            error: errorData.message || "Si è verificato un errore",
          }));
        } catch (e) {
          setPasswordForm((prev) => ({
            ...prev,
            error: `Errore ${response.status}: ${
              response.statusText || "Errore sconosciuto"
            }`,
          }));
        }
      }
    } catch (error) {
      console.error("Errore di connessione:", error);
      setPasswordForm((prev) => ({
        ...prev,
        error: "Errore di connessione al server. Riprova più tardi.",
      }));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Funzionalità di monitoraggio della sessione spostate nel backend
  // Funzioneranno automaticamente senza necessità di controllo visibile dall'utente

  return (
    <div className="flex flex-col min-h-screen">
      <HeaderBar user={user} />

      <main className="flex-1 bg-slate-50 dark:bg-slate-900 p-4 md:p-6">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              Impostazioni
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Gestisci il tuo account e le preferenze dell'applicazione
            </p>
          </div>

          <Tabs value={tabValue} onValueChange={setTabValue}>
            <TabsList className="w-full grid grid-cols-2 mb-6">
              <TabsTrigger value="account">Account</TabsTrigger>
              <TabsTrigger value="application">Applicazione</TabsTrigger>
            </TabsList>

            <TabsContent value="account">
              <div className="grid gap-6">
                {/* Profile Settings */}
                <Card>
                  <CardHeader>
                    <CardTitle>Profilo Utente</CardTitle>
                    <CardDescription>
                      Aggiorna le informazioni del tuo account e le impostazioni
                      di sicurezza
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="email">Indirizzo Email</Label>
                        <Input
                          id="email"
                          value={user?.email || ""}
                          readOnly
                          disabled
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="role">Ruolo</Label>
                        <Input
                          id="role"
                          value={
                            user?.role
                              ? user.role.charAt(0).toUpperCase() +
                                user.role.slice(1)
                              : ""
                          }
                          readOnly
                          disabled
                        />
                      </div>

                      {/* Aggiunta sezione per il cambio password */}
                      <Separator className="my-4" />

                      <div className="space-y-4">
                        <div>
                          <h4 className="text-sm font-medium text-slate-900 dark:text-white">
                            Cambio Password
                          </h4>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            Modifica la tua password di accesso
                          </p>
                        </div>

                        <form
                          onSubmit={handleChangePassword}
                          className="space-y-4"
                        >
                          <div className="space-y-2">
                            <Label htmlFor="currentPassword">
                              Password Attuale
                            </Label>
                            <Input
                              id="currentPassword"
                              type="password"
                              value={passwordForm.currentPassword}
                              onChange={(e) =>
                                setPasswordForm({
                                  ...passwordForm,
                                  currentPassword: e.target.value,
                                })
                              }
                              required
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="newPassword">Nuova Password</Label>
                            <Input
                              id="newPassword"
                              type="password"
                              value={passwordForm.newPassword}
                              onChange={(e) =>
                                setPasswordForm({
                                  ...passwordForm,
                                  newPassword: e.target.value,
                                })
                              }
                              required
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="confirmPassword">
                              Conferma Nuova Password
                            </Label>
                            <Input
                              id="confirmPassword"
                              type="password"
                              value={passwordForm.confirmPassword}
                              onChange={(e) =>
                                setPasswordForm({
                                  ...passwordForm,
                                  confirmPassword: e.target.value,
                                })
                              }
                              required
                            />
                          </div>

                          {passwordForm.error && (
                            <div className="text-red-500 text-sm">
                              {passwordForm.error}
                            </div>
                          )}

                          <div className="flex justify-end">
                            <Button type="submit" disabled={isSubmitting}>
                              {isSubmitting ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Aggiornamento...
                                </>
                              ) : (
                                "Cambia Password"
                              )}
                            </Button>
                          </div>
                        </form>
                      </div>

                      {/* La sezione Separator e Informazioni di Sessione è stata rimossa come richiesto */}

                      {/* La sezione di Sicurezza Avanzata è stata rimossa come richiesto */}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="application">
              <div className="grid gap-6">
                {/* Google Drive Integration */}
                <Card>
                  <CardHeader>
                    <CardTitle>Integrazione Google Drive</CardTitle>
                    <CardDescription>
                      Configura l'integrazione con Google Drive per
                      sincronizzare i documenti ISO
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="text-sm font-medium text-slate-900 dark:text-white">
                              Sincronizzazione Automatica
                            </h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              Sincronizza automaticamente i documenti da Google
                              Drive
                            </p>
                          </div>
                          <Switch defaultChecked />
                        </div>
                      </div>

                      {/* Intervallo di sincronizzazione rimosso visivamente e impostato a 15 minuti in background */}
                    </div>
                  </CardContent>
                </Card>

                {/* Notification Settings */}
                <Card>
                  <CardHeader>
                    <CardTitle>Impostazioni Notifiche</CardTitle>
                    <CardDescription>
                      Configura le notifiche per documenti in scadenza e
                      aggiornamenti
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="text-sm font-medium text-slate-900 dark:text-white">
                              Notifiche Email
                            </h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              Ricevi notifiche via email per aggiornamenti e
                              scadenze
                            </p>
                          </div>
                          <Switch defaultChecked />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="text-sm font-medium text-slate-900 dark:text-white">
                              Notifiche In-App
                            </h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              Visualizza notifiche all'interno dell'applicazione
                            </p>
                          </div>
                          <Switch defaultChecked />
                        </div>
                      </div>

                      {/* La sezione di preavviso scadenza è stata rimossa come richiesto
                      La scadenza sarà gestita a livello di documento */}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <Footer />
    </div>
  );
}
