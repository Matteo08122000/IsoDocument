import { useState } from "react";
import { useAuth } from "../hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { DocumentDocument as Document } from "../../../shared-types/schema";
import HeaderBar from "../components/header-bar";
import DocumentTable from "../components/document-table";
import StatsCards from "../components/stats-cards";
import ActionsBar from "../components/actions-bar";
import DocumentPreviewModal from "../components/document-preview-modal";
import Footer from "../components/footer";
import { Loader2 } from "lucide-react";

export default function HomePage() {
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(
    null
  );
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterValue, setFilterValue] = useState("all");

  const { user } = useAuth();

  const { data: documents, isLoading } = useQuery<Document[]>({
    queryKey: ["/api/documents"],
  });

  // Filter documents based on search query and filter value
  const filteredDocuments = documents?.filter((doc) => {
    // Search filter
    const matchesSearch =
      searchQuery === "" ||
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.path.toLowerCase().includes(searchQuery.toLowerCase());

    // Status filter
    let matchesFilter = true;
    if (filterValue === "expiring") {
      matchesFilter = doc.alertStatus === "warning";
    } else if (filterValue === "expired") {
      matchesFilter = doc.alertStatus === "expired";
    } else if (filterValue === "recent") {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      matchesFilter = doc.updatedAt ? doc.updatedAt > oneWeekAgo : false;
    }

    return matchesSearch && matchesFilter;
  });

  // Stats calculations
  const stats = {
    total: documents?.length || 0,
    expiringSoon:
      documents?.filter((doc) => doc.alertStatus === "warning").length || 0,
    expired:
      documents?.filter((doc) => doc.alertStatus === "expired").length || 0,
    obsolete: documents?.filter((doc) => doc.isObsolete === true).length || 0,
  };

  // Handle document preview
  const handlePreview = (document: Document) => {
    setSelectedDocument(document);
    setIsPreviewOpen(true);
  };

  return (
    <div className="flex flex-col min-h-screen">
      <HeaderBar onSearch={setSearchQuery} user={user} />

      <main className="flex-1 bg-slate-50 dark:bg-slate-900 p-3 xs:p-4 sm:p-5 md:p-6">
        {/* Page Header */}
        <div className="mb-4 sm:mb-6">
          <h1 className="text-xl xs:text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
            Indice dei Documenti
          </h1>
          <p className="mt-1 text-xs xs:text-sm text-slate-500 dark:text-slate-400">
            Sfoglia e gestisci la tua documentazione ISO
          </p>
        </div>

        {/* Stats Cards */}
        <StatsCards stats={stats} />

        {/* Actions Bar */}
        <ActionsBar
          onFilterChange={setFilterValue}
          filterValue={filterValue}
          onSearch={setSearchQuery}
          isAdmin={user?.role === "admin"}
        />

        {/* Document Table */}
        {isLoading ? (
          <div className="flex justify-center items-center h-40 xs:h-48 sm:h-56 md:h-64">
            <Loader2 className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 animate-spin text-primary" />
          </div>
        ) : (
          <DocumentTable
            documents={filteredDocuments || []}
            onPreview={handlePreview}
            isAdmin={user?.role === "admin"}
            pageSize={10}
          />
        )}
      </main>

      <Footer />

      {/* Document Preview Modal */}
      <DocumentPreviewModal
        document={selectedDocument}
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
      />
    </div>
  );
}
