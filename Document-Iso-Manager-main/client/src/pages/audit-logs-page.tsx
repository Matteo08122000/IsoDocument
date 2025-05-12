import { useState } from "react";
import { useAuth } from "../hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { LogDocument as Log } from "../../../shared-types/schema";
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
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Loader2, ShieldAlert, Clock, Search } from "lucide-react";
import { format } from "date-fns";

export default function AuditLogsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const { user } = useAuth();

  const { data: logs, isLoading } = useQuery<Log[]>({
    queryKey: ["/api/logs"],
  });

  // Filter logs based on search query
  const filteredLogs = logs?.filter((log) => {
    if (searchQuery === "") return true;

    const searchLower = searchQuery.toLowerCase();

    return (
      log.action.toLowerCase().includes(searchLower) ||
      log.details?.toLowerCase().includes(searchLower) ||
      (`${log.documentId}` || "").includes(searchLower) ||
      (`${log.userId}` || "").includes(searchLower)
    );
  });

  // Get action badge variant
  const getActionBadgeVariant = (action: string) => {
    switch (action.toLowerCase()) {
      case "create":
        return "default";
      case "update":
        return "default";
      case "delete":
        return "destructive";
      case "restore":
        return "outline";
      case "login":
        return "secondary";
      default:
        return "default";
    }
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
                  Solo gli amministratori possono visualizzare i log di audit
                  del sistema.
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
              Log di Audit
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Monitora tutte le azioni eseguite nel sistema per garantire la
              conformità e la sicurezza
            </p>
          </div>

          {/* Search */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                type="search"
                placeholder="Cerca nei log di audit..."
                className="pl-9 w-full md:max-w-md"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Logs table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center">
                  <Clock className="mr-2 h-5 w-5" />
                  Registro Attività
                </CardTitle>
                <div className="text-sm text-slate-500 dark:text-slate-400">
                  {logs?.length || 0} attività registrate
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center items-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : filteredLogs && filteredLogs.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[150px]">Timestamp</TableHead>
                        <TableHead className="w-[100px]">Azione</TableHead>
                        <TableHead className="w-[200px]">Utente</TableHead>
                        <TableHead>Documento</TableHead>
                        <TableHead className="w-[250px]">Dettagli</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredLogs.map((log) => (
                        <TableRow key={log.legacyId}>
                          <TableCell className="font-mono text-xs">
                            {log.timestamp
                              ? format(
                                  new Date(log.timestamp),
                                  "dd/MM/yyyy HH:mm:ss"
                                )
                              : "N/A"}
                          </TableCell>
                          <TableCell>
                            <Badge variant={getActionBadgeVariant(log.action)}>
                              {log.action}
                            </Badge>
                          </TableCell>
                          <TableCell>{log.userId || "Sistema"}</TableCell>
                          <TableCell>
                            {log.documentId ? (
                              <div className="flex flex-col">
                                <span>{log.documentId}</span>
                              </div>
                            ) : (
                              <span className="text-slate-500">N/A</span>
                            )}
                          </TableCell>
                          <TableCell className="text-sm">
                            {log.details || "Nessun dettaglio"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-10">
                  <Clock className="h-8 w-8 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
                  <p className="text-slate-500 dark:text-slate-400">
                    Nessun log di audit trovato
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Export button */}
          {logs && logs.length > 0 && (
            <div className="mt-6 flex justify-end">
              <Button variant="outline">Esporta log (.csv)</Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
