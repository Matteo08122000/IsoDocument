import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { DocumentDocument as Document } from "../../../shared-types/schema";
import { useAuth } from "../hooks/use-auth";
import { useToast } from "../hooks/use-toast";
import HeaderBar from "../components/header-bar";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Separator } from "../components/ui/separator";
import {
  Loader2,
  FileText,
  Calendar,
  Tag,
  FileBadge,
  Link as LinkIcon,
  ExternalLink,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import { apiRequest, queryClient } from "../lib/queryClient";
import { format } from "date-fns";

export default function DocumentPage() {
  const [match, params] = useRoute("/document/:id");
  const [_, setLocation] = useLocation();
  const [editMode, setEditMode] = useState(false);
  const [title, setTitle] = useState("");
  const [path, setPath] = useState("");
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: document, isLoading } = useQuery<Document>({
    queryKey: [`/api/documents/${params?.id}`],
    onSuccess: (data) => {
      setTitle(data.title);
      setPath(data.path);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PATCH", `/api/documents/${params?.id}`, {
        title,
        path,
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [`/api/documents/${params?.id}`],
      });
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      setEditMode(false);
      toast({
        title: "Document updated",
        description: "The document has been successfully updated.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const archivedMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("DELETE", `/api/documents/${params?.id}`);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      toast({
        title: "Document archived",
        description: "The document has been moved to the archive.",
      });
      setLocation("/");
    },
    onError: (error: Error) => {
      toast({
        title: "Archive failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Get status CSS class
  const getStatusClass = (status: string) => {
    if (status === "expired") {
      return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
    } else if (status === "warning") {
      return "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300";
    } else {
      return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
    }
  };

  const getStatusText = (status: string) => {
    if (status === "expired") {
      return "Scaduto";
    } else if (status === "warning") {
      return "In Scadenza";
    } else {
      return "Valido";
    }
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    if (status === "expired") {
      return <AlertCircle className="h-3 w-3 mr-1" />;
    } else if (status === "warning") {
      return <AlertTriangle className="h-3 w-3 mr-1" />;
    } else {
      return <CheckCircle className="h-3 w-3 mr-1" />;
    }
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <HeaderBar user={user} />

      <main className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-900 p-4 md:p-6">
        <div className="max-w-5xl mx-auto">
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : document ? (
            <>
              {/* Document Header */}
              <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                    {document.title}
                  </h1>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    {document.path}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    className="flex items-center gap-1"
                    asChild
                  >
                    <a
                      href={document.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Apri File
                    </a>
                  </Button>

                  {user?.role === "admin" && (
                    <>
                      <Button
                        variant="outline"
                        onClick={() => setEditMode(!editMode)}
                      >
                        {editMode ? "Annulla" : "Modifica"}
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() => archivedMutation.mutate()}
                        disabled={archivedMutation.isPending}
                      >
                        {archivedMutation.isPending
                          ? "Elaborazione..."
                          : "Archivia"}
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {/* Document Details */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column with Document Info */}
                <div className="lg:col-span-2 space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Dettagli Documento</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {editMode ? (
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="title">Titolo</Label>
                            <Input
                              id="title"
                              value={title}
                              onChange={(e) => setTitle(e.target.value)}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="path">Percorso ISO</Label>
                            <Input
                              id="path"
                              value={path}
                              onChange={(e) => setPath(e.target.value)}
                            />
                          </div>

                          <div className="flex justify-end mt-4">
                            <Button
                              onClick={() => updateMutation.mutate()}
                              disabled={updateMutation.isPending}
                            >
                              {updateMutation.isPending
                                ? "Salvataggio..."
                                : "Salva Modifiche"}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                          <div>
                            <dt className="text-sm font-medium text-slate-500 dark:text-slate-400">
                              Titolo
                            </dt>
                            <dd className="mt-1 text-slate-900 dark:text-white">
                              {document.title}
                            </dd>
                          </div>

                          <div>
                            <dt className="text-sm font-medium text-slate-500 dark:text-slate-400">
                              Percorso ISO
                            </dt>
                            <dd className="mt-1 text-slate-900 dark:text-white">
                              {document.path}
                            </dd>
                          </div>

                          <div>
                            <dt className="text-sm font-medium text-slate-500 dark:text-slate-400">
                              Revisione
                            </dt>
                            <dd className="mt-1 text-slate-900 dark:text-white">
                              {document.revision}
                            </dd>
                          </div>

                          <div>
                            <dt className="text-sm font-medium text-slate-500 dark:text-slate-400">
                              Data Documento
                            </dt>
                            <dd className="mt-1 text-slate-900 dark:text-white">
                              {document.documentDate
                                ? format(
                                    new Date(document.documentDate),
                                    "dd/MM/yyyy"
                                  )
                                : "N/A"}
                            </dd>
                          </div>

                          <div>
                            <dt className="text-sm font-medium text-slate-500 dark:text-slate-400">
                              Tipo File
                            </dt>
                            <dd className="mt-1 text-slate-900 dark:text-white uppercase">
                              {document.fileType}
                            </dd>
                          </div>

                          <div>
                            <dt className="text-sm font-medium text-slate-500 dark:text-slate-400">
                              Aggiornato
                            </dt>
                            <dd className="mt-1 text-slate-900 dark:text-white">
                              {document.updatedAt
                                ? format(
                                    new Date(document.updatedAt),
                                    "dd/MM/yyyy"
                                  )
                                : "N/A"}
                            </dd>
                          </div>
                        </dl>
                      )}
                    </CardContent>
                  </Card>

                  {/* Document Preview (Placeholder) */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Anteprima Documento</CardTitle>
                    </CardHeader>
                    <CardContent className="flex justify-center py-8">
                      <div className="text-center space-y-3">
                        <FileText className="h-16 w-16 mx-auto text-slate-300 dark:text-slate-600" />
                        <div className="space-y-1">
                          <p className="text-slate-900 dark:text-white">
                            {document.title}
                          </p>
                          <p className="text-sm text-slate-500 dark:text-slate-400">
                            {document.fileType.toUpperCase()}
                          </p>
                        </div>
                        <Button variant="outline" className="mt-2" asChild>
                          <a
                            href={document.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Visualizza Documento Completo
                          </a>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Right Column with Status and Metadata */}
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Stato</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div>
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusClass(
                              document.alertStatus
                            )}`}
                          >
                            {getStatusIcon(document.alertStatus)}
                            {getStatusText(document.alertStatus)}
                          </span>
                        </div>

                        <div className="space-y-2">
                          <Label>Scadenza</Label>
                          <div className="flex items-center space-x-2">
                            <Calendar className="h-4 w-4 text-slate-500" />
                            <span>
                              {document.expiryDate
                                ? format(
                                    new Date(document.expiryDate),
                                    "dd/MM/yyyy"
                                  )
                                : "Non specificata"}
                            </span>
                          </div>
                        </div>

                        <Separator />

                        <div className="space-y-2">
                          <Label>Tag</Label>
                          <div className="flex flex-wrap gap-1">
                            <span className="bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300 px-2 py-1 rounded text-xs">
                              {document.path}
                            </span>
                            <span className="bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300 px-2 py-1 rounded text-xs">
                              Rev.{document.revision}
                            </span>
                            <span className="bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300 px-2 py-1 rounded text-xs">
                              {document.fileType.toUpperCase()}
                            </span>
                          </div>
                        </div>

                        <Separator />

                        <div className="space-y-2">
                          <Label>Posizione File</Label>
                          <div className="overflow-hidden text-ellipsis">
                            <a
                              href={document.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline flex items-center space-x-1"
                            >
                              <LinkIcon className="h-3.5 w-3.5" />
                              <span className="text-sm truncate">
                                {document.fileUrl || "N/A"}
                              </span>
                            </a>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Revisioni</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="text-sm">
                          Revisione Corrente:{" "}
                          <span className="font-medium">
                            {document.revision}
                          </span>
                        </div>

                        <div className="text-sm text-slate-500 dark:text-slate-400">
                          Revisioni Precedenti
                        </div>

                        <div className="text-center py-6">
                          <FileBadge className="h-8 w-8 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                          <p className="text-sm text-slate-500 dark:text-slate-400">
                            Nessuna revisione precedente trovata
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-12">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                Documento non trovato
              </h2>
              <p className="mt-2 text-slate-500 dark:text-slate-400">
                Il documento richiesto non esiste o è stato rimosso.
              </p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => setLocation("/")}
              >
                Torna all'indice documenti
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
