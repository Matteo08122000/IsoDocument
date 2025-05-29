import { useState } from "react";
import { useAuth } from "../hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { DocumentDocument as Document } from "../../../shared-types/schema";
import { useToast } from "../hooks/use-toast";
import HeaderBar from "../components/header-bar";
import Footer from "../components/footer";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Loader2, ShieldAlert, Search, ArchiveRestore } from "lucide-react";
import { apiRequest, queryClient } from "../lib/queryClient";

export default function ObsoletePage() {
  const [searchQuery, setSearchQuery] = useState("");
  const { user } = useAuth();
  const { toast } = useToast();

  /* -----------------------------------------------------------
   * QUERY – documenti obsoleti
   * --------------------------------------------------------- */
  const {
    data: documents,
    isLoading,
    error,
  } = useQuery<Document[]>({
    queryKey: ["/api/documents/obsolete"],
  });

  /* -----------------------------------------------------------
   * MUTATION – ripristino documento
   * --------------------------------------------------------- */
  const restoreMutation = useMutation({
    mutationFn: async (documentId: number) => {
      const res = await apiRequest(
        "POST",
        `/api/documents/${documentId}/restore`
      );
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents/obsolete"] });
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      toast({
        title: "Documento ripristinato",
        description: "Il documento è stato ripristinato con successo.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Errore durante il ripristino",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  /* -----------------------------------------------------------
   * FILTRO – ricerca locale
   * --------------------------------------------------------- */
  const filteredDocuments = documents?.filter((doc) => {
    if (searchQuery === "") return true;

    const searchLower = searchQuery.toLowerCase();

    return (
      doc.title.toLowerCase().includes(searchLower) ||
      doc.path.toLowerCase().includes(searchLower) ||
      String(doc.revision).toLowerCase().includes(searchLower)
    );
  });

  /* -----------------------------------------------------------
   * GUARD – accesso solo admin
   * --------------------------------------------------------- */
  if (user?.role !== "admin") {
    return (
      <div className="flex flex-col min-h-screen">
        <HeaderBar user={user} />

        <main className="flex-1 bg-slate-50 dark:bg-slate-900 p-4 md:p-6">
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
                  Solo gli amministratori possono visualizzare e gestire i
                  documenti obsoleti.
                </p>
              </CardContent>
            </Card>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <HeaderBar user={user} />

      <main className="flex-1 bg-slate-50 dark:bg-slate-900 p-4 md:p-6">
        <div className="max-w-7xl mx-auto">
          {/* Page header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              Documenti Obsoleti
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Visualizza e gestisci i documenti che sono stati contrassegnati
              come obsoleti o archiviati
            </p>
          </div>

          {/* Search bar */}
          <div className="mb-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  type="search"
                  placeholder="Cerca tra i documenti obsoleti..."
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Documents table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Archivio Documenti</CardTitle>
                <div className="text-sm text-slate-500 dark:text-slate-400">
                  {filteredDocuments?.length ?? 0} / {documents?.length ?? 0}{" "}
                  documenti obsoleti
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center items-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : error ? (
                <p className="text-destructive text-center py-10">
                  Errore nel caricamento dei documenti.
                </p>
              ) : filteredDocuments && filteredDocuments.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-700">
                        <th className="text-left py-3 px-4 font-medium text-slate-500 dark:text-slate-400">
                          Titolo
                        </th>
                        <th className="text-left py-3 px-4 font-medium text-slate-500 dark:text-slate-400">
                          Percorso ISO
                        </th>
                        <th className="text-left py-3 px-4 font-medium text-slate-500 dark:text-slate-400">
                          Revisione
                        </th>
                        <th className="text-left py-3 px-4 font-medium text-slate-500 dark:text-slate-400">
                          Data Archiviazione
                        </th>
                        <th className="text-left py-3 px-4 font-medium text-slate-500 dark:text-slate-400">
                          Azioni
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredDocuments.map((doc) => (
                        <tr
                          key={doc.legacyId}
                          className="border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
                        >
                          <td className="py-3 px-4">{doc.title}</td>
                          <td className="py-3 px-4">{doc.path}</td>
                          <td className="py-3 px-4">{doc.revision}</td>
                          <td className="py-3 px-4">
                            {doc.updatedAt
                              ? new Date(doc.updatedAt).toLocaleDateString(
                                  "it-IT"
                                )
                              : "N/A"}
                          </td>
                          <td className="py-3 px-4">
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex items-center text-xs"
                              onClick={() => handleRestore(doc.legacyId)}
                              disabled={restoreMutation.isPending}
                            >
                              <ArchiveRestore className="mr-1 h-3.5 w-3.5" />
                              Ripristina
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-10">
                  <ArchiveRestore className="h-8 w-8 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
                  <p className="text-slate-500 dark:text-slate-400">
                    Nessun documento obsoleto trovato
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
}
