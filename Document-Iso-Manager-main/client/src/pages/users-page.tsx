import { useState } from "react";
import { useAuth } from "../hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { UserDocument as User } from "../../../shared-types/schema";
import { useToast } from "../hooks/use-toast";
import HeaderBar from "../components/header-bar";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  Loader2,
  Users,
  ShieldAlert,
  Shield,
  Plus,
  UserPlus,
} from "lucide-react";
import { apiRequest, queryClient } from "../lib/queryClient";
import { format } from "date-fns";
import * as z from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../components/ui/form";

// Schema per creare un nuovo utente
const newUserSchema = z.object({
  email: z.string().email("Inserisci un indirizzo email valido"),
  password: z.string().min(6, "La password deve contenere almeno 6 caratteri"),
  role: z.enum(["admin", "viewer"], {
    required_error: "Seleziona un ruolo",
  }),
});

type NewUserFormValues = z.infer<typeof newUserSchema>;

export default function UsersPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const { data: users, isLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  // Form per la creazione di un nuovo utente
  const form = useForm<NewUserFormValues>({
    resolver: zodResolver(newUserSchema),
    defaultValues: {
      email: "",
      password: "",
      role: "viewer",
    },
  });

  // Mutation per aggiornare il ruolo di un utente
  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: number; role: string }) => {
      const res = await apiRequest("PATCH", `/api/users/${userId}/role`, {
        role,
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Ruolo aggiornato",
        description: "Il ruolo dell'utente è stato aggiornato con successo.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Aggiornamento fallito",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation per creare un nuovo utente
  const createUserMutation = useMutation({
    mutationFn: async (data: NewUserFormValues) => {
      const res = await apiRequest("POST", "/api/users", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Utente creato",
        description: "Il nuovo utente è stato creato con successo.",
      });
      form.reset();
      setCreateDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Creazione fallita",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle role change
  const handleRoleChange = (userId: number, role: string) => {
    updateRoleMutation.mutate({ userId, role });
  };

  // Handle new user form submission
  const onSubmit = (values: NewUserFormValues) => {
    createUserMutation.mutate(values);
  };

  // Redirect non-admin users
  if (user?.role !== "admin") {
    return (
      <div className="flex flex-col h-screen overflow-hidden">
        <HeaderBar user={user} />

        <main className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-900 p-4 md:p-6">
          <div className="max-w-5xl mx-auto">
            <Card className="border-destructive">
              <CardHeader>
                <CardTitle className="text-destructive flex items-center">
                  <ShieldAlert className="mr-2 h-5 w-5" />
                  Accesso negato
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-700 dark:text-slate-300">
                  Non hai i permessi necessari per accedere a questa pagina.
                  Solo gli amministratori possono gestire gli utenti del
                  sistema.
                </p>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <HeaderBar user={user} />

      <main className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-900 p-4 md:p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              Gestione Utenti
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Visualizza e gestisci gli utenti del sistema
            </p>
          </div>

          {/* Users table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center">
                  <Users className="mr-2 h-5 w-5" />
                  Utenti del Sistema
                </CardTitle>
                <div className="flex items-center space-x-4">
                  <div className="text-sm text-slate-500 dark:text-slate-400">
                    {users?.length || 0} utenti registrati
                  </div>
                  <Dialog
                    open={createDialogOpen}
                    onOpenChange={setCreateDialogOpen}
                  >
                    <DialogTrigger asChild>
                      <Button size="sm" className="flex items-center">
                        <UserPlus className="mr-2 h-4 w-4" />
                        Nuovo Utente
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Crea Nuovo Utente</DialogTitle>
                        <DialogDescription>
                          Inserisci i dati per creare un nuovo utente nel
                          sistema.
                        </DialogDescription>
                      </DialogHeader>
                      <Form {...form}>
                        <form
                          onSubmit={form.handleSubmit(onSubmit)}
                          className="space-y-4"
                        >
                          <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Email</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="esempio@email.com"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="password"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Password</FormLabel>
                                <FormControl>
                                  <Input
                                    type="password"
                                    placeholder="Almeno 6 caratteri"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="role"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Ruolo</FormLabel>
                                <Select
                                  onValueChange={field.onChange}
                                  defaultValue={field.value}
                                >
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Seleziona un ruolo" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="viewer">
                                      Visualizzatore
                                    </SelectItem>
                                    <SelectItem value="admin">
                                      Amministratore
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormDescription>
                                  Gli amministratori hanno accesso completo al
                                  sistema.
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <DialogFooter>
                            <Button
                              type="submit"
                              disabled={createUserMutation.isPending}
                              className="mt-4"
                            >
                              {createUserMutation.isPending && (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              )}
                              Crea Utente
                            </Button>
                          </DialogFooter>
                        </form>
                      </Form>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center items-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : users && users.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[50px]">ID</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead className="w-[130px]">Ruolo</TableHead>
                        <TableHead className="w-[130px]">2FA</TableHead>
                        <TableHead className="w-[180px]">
                          Data Registrazione
                        </TableHead>
                        <TableHead className="w-[160px]">Azioni</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((usr) => (
                        <TableRow key={usr.id}>
                          <TableCell className="font-mono">{usr.id}</TableCell>
                          <TableCell>{usr.email}</TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                usr.role === "admin" ? "default" : "outline"
                              }
                              className="capitalize"
                            >
                              {usr.role}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="w-fit">
                              {/* Gestione 2FA futura */}
                              Disabilitato
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">
                            {usr.createdAt
                              ? format(
                                  new Date(usr.createdAt),
                                  "dd/MM/yyyy HH:mm"
                                )
                              : "N/A"}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <Select
                                defaultValue={usr.role}
                                onValueChange={(value) =>
                                  handleRoleChange(usr.id, value)
                                }
                                disabled={
                                  usr.id === user?.id ||
                                  updateRoleMutation.isPending
                                }
                              >
                                <SelectTrigger className="w-32">
                                  <SelectValue placeholder="Ruolo" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="viewer">
                                    Visualizzatore
                                  </SelectItem>
                                  <SelectItem value="admin">
                                    Amministratore
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-10">
                  <Users className="h-8 w-8 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
                  <p className="text-slate-500 dark:text-slate-400">
                    Nessun utente trovato
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
