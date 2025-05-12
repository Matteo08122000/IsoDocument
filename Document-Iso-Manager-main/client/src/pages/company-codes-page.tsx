import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "../hooks/use-toast";
import { Plus, Trash2, Edit, RefreshCw, Check, X } from "lucide-react";
import { queryClient, apiRequest } from "../lib/queryClient";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Switch } from "../components/ui/switch";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "../components/ui/form";
import { Skeleton } from "../components/ui/skeleton";
import { Badge } from "../components/ui/badge";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { format } from "date-fns";

type CompanyCode = {
  id: number;
  code: string;
  role: string;
  usageLimit: number;
  usageCount: number;
  expiresAt: string | null;
  isActive: boolean;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
};

// Schema per la creazione e modifica di codici aziendali
const companyCodeSchema = z.object({
  code: z.string().min(4, "Il codice deve contenere almeno 4 caratteri"),
  role: z.string(),
  usageLimit: z.coerce.number().int().min(1, "Il limite di utilizzo deve essere almeno 1"),
  expiresAt: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
});

type CompanyCodeFormValues = z.infer<typeof companyCodeSchema>;

export default function CompanyCodesPage() {
  const { toast } = useToast();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingCode, setEditingCode] = useState<CompanyCode | null>(null);
  
  // Query per ottenere tutti i codici aziendali
  const companiesQuery = useQuery({ queryKey: ["/api/company-codes"] });
  const companyCodes = companiesQuery.data as CompanyCode[] | undefined;
  const isLoading = companiesQuery.isLoading;
  
  // Add error handling
  if (companiesQuery.isError) {
    toast({
      title: "Errore",
      description: `Non è stato possibile caricare i codici aziendali: ${(companiesQuery.error as Error).message}`,
      variant: "destructive",
    });
  }
  
  // Mutation per creare un nuovo codice aziendale
  const createMutation = useMutation({
    mutationFn: async (data: CompanyCodeFormValues) => {
      const res = await apiRequest("POST", "/api/company-codes", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/company-codes"] });
      toast({
        title: "Codice aziendale creato",
        description: "Il nuovo codice aziendale è stato creato con successo.",
      });
      setShowCreateDialog(false);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Errore",
        description: `Non è stato possibile creare il codice aziendale: ${error.message}`,
        variant: "destructive",
      });
    },
  });
  
  // Mutation per aggiornare un codice aziendale
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<CompanyCodeFormValues> }) => {
      const res = await apiRequest("PATCH", `/api/company-codes/${id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/company-codes"] });
      toast({
        title: "Codice aziendale aggiornato",
        description: "Il codice aziendale è stato aggiornato con successo.",
      });
      setEditingCode(null);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Errore",
        description: `Non è stato possibile aggiornare il codice aziendale: ${error.message}`,
        variant: "destructive",
      });
    },
  });
  
  // Mutation per eliminare un codice aziendale
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/company-codes/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/company-codes"] });
      toast({
        title: "Codice aziendale eliminato",
        description: "Il codice aziendale è stato eliminato con successo.",
      });
    },
    onError: (error) => {
      toast({
        title: "Errore",
        description: `Non è stato possibile eliminare il codice aziendale: ${error.message}`,
        variant: "destructive",
      });
    },
  });
  
  // Form per la creazione/modifica di codici aziendali
  const form = useForm<CompanyCodeFormValues>({
    resolver: zodResolver(companyCodeSchema),
    defaultValues: {
      code: "",
      role: "admin",
      usageLimit: 1,
      expiresAt: null,
      isActive: true,
    },
  });
  
  // Quando si apre il modale di modifica, popola il form con i dati del codice selezionato
  const handleEditCode = (code: CompanyCode) => {
    setEditingCode(code);
    form.reset({
      code: code.code,
      role: code.role,
      usageLimit: code.usageLimit,
      expiresAt: code.expiresAt ? new Date(code.expiresAt).toISOString().split('T')[0] : null,
      isActive: code.isActive,
    });
  };
  
  // Azione quando si annulla la creazione/modifica
  const handleCancel = () => {
    setShowCreateDialog(false);
    setEditingCode(null);
    form.reset();
  };
  
  // Gestisci l'invio del form
  const onSubmit = (values: CompanyCodeFormValues) => {
    if (editingCode) {
      updateMutation.mutate({ id: editingCode.id, data: values });
    } else {
      createMutation.mutate(values);
    }
  };
  
  // Formatta la data
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Nessuna scadenza";
    return format(new Date(dateString), "dd/MM/yyyy");
  };
  
  // Contenuto del dialogo per creare/modificare un codice aziendale
  const renderDialog = () => (
    <Dialog open={showCreateDialog || !!editingCode} onOpenChange={(open) => {
      if (!open) handleCancel();
    }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {editingCode ? "Modifica codice aziendale" : "Crea nuovo codice aziendale"}
          </DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Codice aziendale</FormLabel>
                  <FormControl>
                    <Input placeholder="Inserisci il codice" {...field} />
                  </FormControl>
                  <FormDescription>
                    Il codice che gli utenti inseriranno durante la registrazione.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ruolo associato</FormLabel>
                  <Select 
                    value={field.value} 
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleziona un ruolo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="viewer">Viewer</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Il ruolo che verrà assegnato all'utente quando utilizza questo codice.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="usageLimit"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Limite di utilizzi</FormLabel>
                  <FormControl>
                    <Input type="number" min="1" {...field} />
                  </FormControl>
                  <FormDescription>
                    Quante volte questo codice può essere utilizzato.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="expiresAt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Data di scadenza (opzionale)</FormLabel>
                  <FormControl>
                    <Input 
                      type="date" 
                      {...field} 
                      value={field.value || ""}
                      onChange={(e) => field.onChange(e.target.value || null)}
                    />
                  </FormControl>
                  <FormDescription>
                    Se impostata, il codice non sarà più valido dopo questa data.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>Attivo</FormLabel>
                    <FormDescription>
                      Se disattivato, il codice non potrà essere utilizzato.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCancel}>
                Annulla
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {(createMutation.isPending || updateMutation.isPending) ? "Salvataggio..." : 
                 editingCode ? "Aggiorna" : "Crea"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
  
  return (
    <div className="container py-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Gestione Codici Aziendali</h1>
          <p className="text-muted-foreground mt-2">
            Crea e gestisci i codici aziendali per l'assegnazione automatica dei ruoli durante la registrazione.
          </p>
        </div>
        
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nuovo codice
        </Button>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Codici Aziendali</CardTitle>
          <CardDescription>
            Lista di tutti i codici aziendali disponibili nel sistema.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <Skeleton className="h-12 w-full" />
                </div>
              ))}
            </div>
          ) : !companyCodes || (Array.isArray(companyCodes) && companyCodes.length === 0) ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Nessun codice aziendale trovato.</p>
              <p className="text-sm mt-2">Crea il tuo primo codice aziendale per consentire l'assegnazione automatica dei ruoli.</p>
              <Button 
                variant="outline" 
                className="mt-4" 
                onClick={() => setShowCreateDialog(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Crea codice aziendale
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Codice</TableHead>
                    <TableHead>Ruolo</TableHead>
                    <TableHead>Utilizzi</TableHead>
                    <TableHead>Scadenza</TableHead>
                    <TableHead>Stato</TableHead>
                    <TableHead>Creato il</TableHead>
                    <TableHead className="text-right">Azioni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.isArray(companyCodes) && companyCodes.map((code: CompanyCode) => (
                    <TableRow key={code.id}>
                      <TableCell className="font-medium">{code.code}</TableCell>
                      <TableCell>
                        <Badge variant={code.role === "admin" ? "default" : "secondary"}>
                          {code.role === "admin" ? "Admin" : "Viewer"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {code.usageCount} / {code.usageLimit}
                      </TableCell>
                      <TableCell>{formatDate(code.expiresAt)}</TableCell>
                      <TableCell>
                        {code.isActive ? (
                          <Badge variant="outline" className="bg-green-100 text-green-800 hover:bg-green-200">
                            <Check className="h-3.5 w-3.5 mr-1" />
                            Attivo
                          </Badge>
                        ) : (
                          <Badge variant="destructive" className="bg-red-100 text-red-800 hover:bg-red-200">
                            <X className="h-3.5 w-3.5 mr-1" />
                            Disattivato
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>{formatDate(code.createdAt)}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditCode(code)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteMutation.mutate(code.id)}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      
      {renderDialog()}
    </div>
  );
}
