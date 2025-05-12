import { useState } from "react";
import { DocumentDocument as Document } from "../../../shared-types/schema";
import { Button } from "../components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { cn } from "../lib/utils";
import {
  Eye,
  Edit,
  History,
  File,
  FileText,
  FileSpreadsheet,
  FileImage,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { format } from "date-fns";

interface DocumentTableProps {
  documents: Document[];
  onPreview: (document: Document) => void;
  isAdmin: boolean;
  pageSize?: number;
}

export default function DocumentTable({
  documents,
  onPreview,
  isAdmin,
  pageSize = 10,
}: DocumentTableProps) {
  const [currentPage, setCurrentPage] = useState(1);

  // Calculate total pages
  const totalPages = Math.ceil(documents.length / pageSize);

  // Get current page documents
  const currentDocuments = documents.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Handle page changes
  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  // Calculate display range for showing results
  const startItem = documents.length > 0 ? (currentPage - 1) * pageSize + 1 : 0;
  const endItem = Math.min(startItem + pageSize - 1, documents.length);
  // Get icon based on file type
  const getFileIcon = (fileType: string) => {
    switch (fileType.toLowerCase()) {
      case "pdf":
        return <File className="h-4 w-4 text-slate-400" />;
      case "docx":
      case "doc":
        return <FileText className="h-4 w-4 text-slate-400" />;
      case "xlsx":
      case "xls":
        return <FileSpreadsheet className="h-4 w-4 text-slate-400" />;
      case "jpg":
      case "jpeg":
      case "png":
        return <FileImage className="h-4 w-4 text-slate-400" />;
      default:
        return <File className="h-4 w-4 text-slate-400" />;
    }
  };

  // Get status badge class
  const getStatusBadge = (status: string) => {
    if (status === "expired") {
      return (
        <span className="inline-flex items-center px-1.5 xs:px-2 sm:px-2.5 py-0.5 rounded-full text-[10px] xs:text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300">
          <AlertCircle className="h-2.5 w-2.5 xs:h-3 xs:w-3 mr-0.5 xs:mr-1" />
          <span className="hidden xs:inline">Scaduto</span>
          <span className="xs:hidden">!</span>
        </span>
      );
    } else if (status === "warning") {
      return (
        <span className="inline-flex items-center px-1.5 xs:px-2 sm:px-2.5 py-0.5 rounded-full text-[10px] xs:text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300">
          <AlertTriangle className="h-2.5 w-2.5 xs:h-3 xs:w-3 mr-0.5 xs:mr-1" />
          <span className="hidden xs:inline">In scadenza</span>
          <span className="xs:hidden">Avviso</span>
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center px-1.5 xs:px-2 sm:px-2.5 py-0.5 rounded-full text-[10px] xs:text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
          <CheckCircle className="h-2.5 w-2.5 xs:h-3 xs:w-3 mr-0.5 xs:mr-1" />
          <span className="hidden xs:inline">Valido</span>
          <span className="xs:hidden">OK</span>
        </span>
      );
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 shadow overflow-hidden rounded-md">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16 sm:w-24 hidden xs:table-cell">
                Riferimento
              </TableHead>
              <TableHead>Documento</TableHead>
              <TableHead className="hidden sm:table-cell">Revisione</TableHead>
              <TableHead>Stato</TableHead>
              <TableHead className="hidden md:table-cell">Aggiornato</TableHead>
              <TableHead className="text-right">Azioni</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {documents.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-4 sm:py-6">
                  <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm">
                    Nessun documento trovato
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              currentDocuments.map((document) => (
                <TableRow
                  key={document.legacyId}
                  className="hover:bg-slate-50 dark:hover:bg-slate-700"
                >
                  <TableCell className="font-mono text-xs sm:text-sm text-slate-900 dark:text-white hidden xs:table-cell">
                    {document.path}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <div className="flex items-center">
                      {getFileIcon(document.fileType)}
                      <a
                        href={`/documents/${document.legacyId}`}
                        className="ml-2 text-primary-600 dark:text-primary-400 hover:underline text-xs sm:text-sm truncate max-w-[120px] xs:max-w-[160px] sm:max-w-full"
                      >
                        {document.title}
                      </a>
                      <span className="ml-2 sm:hidden text-xs text-slate-500">
                        {document.revision}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-slate-500 dark:text-slate-400 hidden sm:table-cell text-xs sm:text-sm">
                    {document.revision}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-1">
                      {getStatusBadge(document.alertStatus || "valid")}
                    </div>
                  </TableCell>
                  <TableCell className="text-slate-500 dark:text-slate-400 hidden md:table-cell text-xs sm:text-sm">
                    {document.updatedAt
                      ? format(
                          new Date(document.updatedAt as unknown as string),
                          "yyyy-MM-dd"
                        )
                      : "N/A"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-1 sm:space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onPreview(document)}
                        title="Visualizza"
                        className="h-7 w-7 sm:h-8 sm:w-8 p-0"
                      >
                        <Eye className="h-3 w-3 sm:h-4 sm:w-4" />
                        <span className="sr-only">Visualizza</span>
                      </Button>

                      {isAdmin && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Modifica"
                            asChild
                            className="h-7 w-7 sm:h-8 sm:w-8 p-0"
                          >
                            <a href={`/documents/${document.legacyId}`}>
                              <Edit className="h-3 w-3 sm:h-4 sm:w-4" />
                              <span className="sr-only">Modifica</span>
                            </a>
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            title="Cronologia"
                            className="h-7 w-7 sm:h-8 sm:w-8 p-0"
                          >
                            <History className="h-3 w-3 sm:h-4 sm:w-4" />
                            <span className="sr-only">Cronologia</span>
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {documents.length > 0 && (
        <div className="bg-white dark:bg-slate-800 px-3 sm:px-4 md:px-6 py-2 sm:py-3 flex items-center justify-between border-t border-slate-200 dark:border-slate-700">
          <div className="hidden xs:block">
            <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300">
              <span className="hidden sm:inline">Visualizzazione di </span>
              <span className="font-medium">{startItem}</span>
              <span className="hidden sm:inline"> a </span>
              <span className="sm:hidden">-</span>
              <span className="font-medium">{endItem}</span>
              <span className="hidden sm:inline"> di </span>
              <span className="font-medium hidden sm:inline">
                {documents.length}
              </span>
              <span className="hidden sm:inline"> risultati</span>
            </p>
          </div>
          <div className="flex-1 flex justify-between xs:justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={goToPreviousPage}
              disabled={currentPage <= 1}
              className="text-xs sm:text-sm h-7 sm:h-9 px-2 sm:px-3 flex items-center"
            >
              <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
              Precedente
            </Button>

            {totalPages > 1 && (
              <span className="mx-2 text-xs sm:text-sm text-slate-500 dark:text-slate-400 self-center">
                {currentPage} / {totalPages}
              </span>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={goToNextPage}
              disabled={currentPage >= totalPages}
              className="ml-2 sm:ml-3 text-xs sm:text-sm h-7 sm:h-9 px-2 sm:px-3 flex items-center"
            >
              Successivo
              <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
