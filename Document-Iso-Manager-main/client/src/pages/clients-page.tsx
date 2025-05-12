import { useState } from "react";
import { useAuth } from "../hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ClientDocument as Client } from "../../../shared-types/client";
import { useToast } from "../hooks/use-toast";
import HeaderBar from "../components/header-bar";
import Footer from "../components/footer";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
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
} from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Plus, Pencil } from "lucide-react";
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
import * as React from "react";

// Schema per la gestione del client
const clientSchema = z.object({
  name: z.string().min(1, "Il nome del cliente è obbligatorio"),
  driveFolderId: z
    .string()
    .min(1, "L'ID della cartella Google Drive è obbligatorio"),
});

type ClientFormValues = z.infer<typeof clientSchema>;

// Funzione per estrarre l'ID della cartella da un URL di Google Drive
function extractFolderIdFromUrl(url: string): string | null {
  // Pattern per gli URL di Google Drive
  const patterns = [
    /https:\/\/drive\.google\.com\/drive\/(?:u\/\d+\/)?folders\/([a-zA-Z0-9_-]+)(?:\?[^\s]*)?/,
    /https:\/\/drive\.google\.com\/drive\/(?:u\/\d+\/)?my-drive\/([a-zA-Z0-9_-]+)(?:\?[^\s]*)?/,
    /https:\/\/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)(?:&[^\s]*)?/,
  ];

  // Prova tutti i pattern e restituisci il primo match
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  // Se è già un ID senza URL, restituisci l'input originale
  if (/^[a-zA-Z0-9_-]+$/.test(url)) {
    return url;
  }

  return null;
}

export default function ClientsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  const {
    data: clients,
    isLoading,
    isError,
  } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  // Form per la creazione/modifica di un client
  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      name: "",
      driveFolderId: "",
    },
  });

  // Gestisce l'apertura del form di modifica
  const handleEdit = (client: Client) => {
    setEditingClient(client);
    form.reset({
      name: client.name,
      driveFolderId: client.driveFolderId,
    });
    setCreateDialogOpen(true);
  };

  // Chiude il form e resetta i valori
  const handleCloseForm = () => {
    setCreateDialogOpen(false);
    setEditingClient(null);
    form.reset({
      name: "",
      driveFolderId: "",
    });
  };

  // Mutation per creare un nuovo client
  const createMutation = useMutation({
    mutationFn: async (data: ClientFormValues) => {
      const res = await apiRequest("POST", "/api/clients", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      toast({
        title: "Client creato",
        description: "Il nuovo client è stato creato con successo.",
      });
      handleCloseForm();
    },
    onError: (error: Error) => {
      toast({
        title: "Creazione fallita",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation per aggiornare un client esistente
  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: number;
      data: ClientFormValues;
    }) => {
      const res = await apiRequest("PUT", `/api/clients/${id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      toast({
        title: "Client aggiornato",
        description: "Il client è stato aggiornato con successo.",
      });
      handleCloseForm();
    },
    onError: (error: Error) => {
      toast({
        title: "Aggiornamento fallito",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Gestisce l'invio del form (creazione o aggiornamento)
  const onSubmit = (values: ClientFormValues) => {
    // Estrai l'ID della cartella se è stato inserito un URL
    const extractedId = extractFolderIdFromUrl(values.driveFolderId);

    if (!extractedId) {
      toast({
        title: "URL non valido",
        description: "L'URL o l'ID della cartella Google Drive non è valido.",
        variant: "destructive",
      });
      return;
    }

    // Aggiorna il valore nel form con l'ID estratto
    const dataToSubmit = {
      ...values,
      driveFolderId: extractedId,
    };

    if (editingClient) {
      updateMutation.mutate({ id: editingClient.id, data: dataToSubmit });
    } else {
      createMutation.mutate(dataToSubmit);
    }
  };

  const connectGoogleDrive = async (clientId: number) => {
    const res = await fetch(`/api/google/auth-url/${clientId}`);
    const data = await res.json();
    window.open(data.url, "_blank");
  };

  // Formatta la data
  const formatDate = (dateString: string | Date) => {
    return format(new Date(dateString), "dd/MM/yyyy HH:mm");
  };

  return (
    <div className="flex flex-col min-h-screen">
      <HeaderBar user={user} />

      <main className="flex-1 container mx-auto py-8 px-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Gestione Clienti</h1>
            <p className="text-muted-foreground mt-2">
              Crea e gestisci i clienti e le loro cartelle Google Drive
              associate
            </p>
          </div>

          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nuovo Cliente
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Clienti</CardTitle>
            <CardDescription>
              Lista di tutti i clienti registrati nel sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="py-10 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent"></div>
                <p className="mt-2 text-muted-foreground">
                  Caricamento clienti...
                </p>
              </div>
            ) : isError ? (
              <div className="py-10 text-center">
                <p className="text-destructive">
                  Si è verificato un errore durante il caricamento dei clienti
                </p>
              </div>
            ) : !clients || clients.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-muted-foreground">
                  Nessun cliente registrato
                </p>
                <Button
                  variant="outline"
                  onClick={() => setCreateDialogOpen(true)}
                  className="mt-4"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Aggiungi il primo cliente
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>ID Cartella Google Drive</TableHead>
                    <TableHead>Data Creazione</TableHead>
                    <TableHead>Ultima Modifica</TableHead>
                    <TableHead className="text-right">Azioni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clients.map((client) => (
                    <TableRow key={client.legacyId}>
                      <TableCell className="font-medium">
                        {client.name}
                      </TableCell>
                      <TableCell>
                        <div className="max-w-xs overflow-hidden text-ellipsis">
                          {client.driveFolderId}
                        </div>
                      </TableCell>
                      <TableCell>{formatDate(client.createdAt)}</TableCell>
                      <TableCell>{formatDate(client.updatedAt)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(client)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="ml-2"
                          onClick={() => connectGoogleDrive(client.legacyId)}
                        >
                          Collega Drive
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Form Dialog */}
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingClient ? "Modifica Cliente" : "Nuovo Cliente"}
              </DialogTitle>
              <DialogDescription>
                {editingClient
                  ? "Modifica i dettagli del cliente selezionato."
                  : "Compila il form per creare un nuovo cliente."}
              </DialogDescription>
            </DialogHeader>

            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-6"
              >
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome Cliente</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Inserisci il nome del cliente"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="driveFolderId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cartella Google Drive</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Incolla l'URL o l'ID della cartella di Google Drive"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Puoi incollare l'intero URL della cartella di Google
                        Drive o solo l'ID della cartella.
                        <br />
                        Esempio URL:
                        https://drive.google.com/drive/folders/ABCDEF123456
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCloseForm}
                  >
                    Annulla
                  </Button>
                  <Button
                    type="submit"
                    disabled={
                      createMutation.isPending || updateMutation.isPending
                    }
                  >
                    {createMutation.isPending || updateMutation.isPending
                      ? "Salvataggio..."
                      : editingClient
                      ? "Aggiorna"
                      : "Crea"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </main>

      <Footer />
    </div>
  );
}
