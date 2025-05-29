import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "../hooks/use-auth";
import { cn } from "../lib/utils";
import {
  ChevronRight,
  LayoutDashboard,
  FileText,
  Users,
  Settings,
  Archive,
  ClipboardList,
  Folder,
  FileQuestion,
  Building,
} from "lucide-react";
import { Separator } from "../components/ui/separator";
import { ScrollArea } from "../components/ui/scroll-area";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../components/ui/collapsible";

// Document tree structure type
type TreeItem = {
  id: string;
  label: string;
  path: string;
  icon?: React.ReactNode;
  children?: TreeItem[];
};

interface SidebarNavigationProps {
  isOpen: boolean;
  onToggle: () => void;
  currentPath: string;
  isAdmin: boolean;
}

export default function SidebarNavigation({
  isOpen,
  onToggle,
  currentPath,
  isAdmin,
}: SidebarNavigationProps) {
  // Get ISO document structure
  const [location] = useLocation();
  const { user } = useAuth();

  // Example ISO structure
  const isoStructure: TreeItem[] = [
    {
      id: "1",
      label: "1. Scope",
      path: "1",
      icon: <Folder className="h-4 w-4" />,
      children: [
        {
          id: "1.1",
          label: "1.1 General Info",
          path: "1.1",
          icon: <FileText className="h-4 w-4" />,
        },
      ],
    },
    {
      id: "4",
      label: "4. Context of Organization",
      path: "4",
      icon: <Folder className="h-4 w-4" />,
    },
    {
      id: "8",
      label: "8. Operation",
      path: "8",
      icon: <Folder className="h-4 w-4" />,
      children: [
        {
          id: "8.2",
          label: "8.2 Requirements",
          path: "8.2",
          icon: <Folder className="h-4 w-4" />,
          children: [
            {
              id: "8.2.1",
              label: "8.2.1 Customer Requirements",
              path: "8.2.1",
              icon: <FileText className="h-4 w-4" />,
            },
          ],
        },
      ],
    },
  ];

  // Track which sections are expanded
  const [expandedSections, setExpandedSections] = useState<
    Record<string, boolean>
  >({
    "1": true,
    "8": true,
    "8.2": true,
  });

  // Toggle a section's expanded state
  const toggleSection = (id: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Check if a path is active
  const isActive = (path: string) => {
    return location === path;
  };

  // Render a tree item (recursive)
  const renderTreeItem = (item: TreeItem) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedSections[item.legacyId];

    return (
      <div key={item.legacyId} className="mb-1">
        {hasChildren ? (
          <Collapsible
            open={isExpanded}
            onOpenChange={() => toggleSection(item.legacyId)}
          >
            <CollapsibleTrigger className="w-full">
              <div
                className={cn(
                  "flex items-center px-2 py-2 text-sm font-medium rounded-md hover:bg-slate-50 dark:hover:bg-slate-700",
                  "text-slate-700 dark:text-slate-300"
                )}
              >
                <ChevronRight
                  className={cn(
                    "h-4 w-4 mr-1 text-slate-400 transition-transform",
                    isExpanded ? "transform rotate-90" : ""
                  )}
                />
                {item.icon || (
                  <FileQuestion className="h-4 w-4 mr-3 text-slate-400" />
                )}
                <span className="ml-2">{item.label}</span>
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="ml-6 space-y-1">
                {item.children?.map((child) => renderTreeItem(child))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        ) : (
          <Link href={`/section/${item.path}`}>
            <a
              className={cn(
                "flex items-center px-2 py-2 text-sm font-medium rounded-md hover:bg-slate-50 dark:hover:bg-slate-700",
                isActive(`/section/${item.path}`)
                  ? "bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-200"
                  : "text-slate-600 dark:text-slate-400"
              )}
            >
              {item.icon || (
                <FileQuestion className="h-4 w-4 mr-3 text-slate-400" />
              )}
              <span className="ml-2">{item.label}</span>
              {item.label.includes("Customer Requirements") && (
                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300">
                  <span className="material-icons text-xs mr-1">warning</span>
                  30d
                </span>
              )}
            </a>
          </Link>
        )}
      </div>
    );
  };

  return (
    <div>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 z-10 bg-black bg-opacity-50 transition-opacity duration-200 ease-in-out"
          onClick={onToggle}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-20 bg-white dark:bg-slate-800 shadow-md overflow-y-auto transition-transform duration-200 ease-in-out",
          "w-[85vw] xs:w-[70vw] sm:w-[280px] md:w-[300px] lg:w-[320px] xl:w-[280px] 2xl:w-[320px]",
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <ScrollArea className="h-full">
          <div className="py-4 px-3">
            <div className="flex items-center px-2 py-2">
              <FileText className="h-6 w-6 text-primary-600 dark:text-primary-400 mr-2" />
              <h2 className="text-lg font-semibold text-slate-800 dark:text-white">
                Gestione Documenti ISO
              </h2>
            </div>

            <nav className="mt-5 px-2 space-y-1">
              {/* Dashboard Link */}
              <Link href="/">
                <a
                  className={cn(
                    "group flex items-center px-2 py-2 text-sm font-medium rounded-md",
                    currentPath === "/"
                      ? "bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-200"
                      : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                  )}
                >
                  <LayoutDashboard
                    className={cn(
                      "mr-3 h-5 w-5",
                      currentPath === "/"
                        ? "text-primary-500 dark:text-primary-400"
                        : "text-slate-400 group-hover:text-slate-500 dark:text-slate-500 dark:group-hover:text-slate-400"
                    )}
                  />
                  Dashboard
                </a>
              </Link>

              {/* Documents Section */}
              <div className="pt-4">
                <h3 className="px-3 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Documenti ISO
                </h3>

                {/* Document Tree */}
                <div className="space-y-1">
                  {isoStructure.map((section) => renderTreeItem(section))}
                </div>
              </div>

              {/* Admin Section (only visible to admins) */}
              {isAdmin && (
                <div className="pt-4">
                  <Separator className="my-2" />
                  <h3 className="px-3 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Amministrazione
                  </h3>

                  <Link href="/users">
                    <a
                      className={cn(
                        "group flex items-center px-2 py-2 text-sm font-medium rounded-md",
                        currentPath === "/users"
                          ? "bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-200"
                          : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                      )}
                    >
                      <Users
                        className={cn(
                          "mr-3 h-5 w-5",
                          currentPath === "/users"
                            ? "text-primary-500 dark:text-primary-400"
                            : "text-slate-400 group-hover:text-slate-500 dark:text-slate-500 dark:group-hover:text-slate-400"
                        )}
                      />
                      Utenti
                    </a>
                  </Link>

                  <Link href="/clients">
                    <a
                      className={cn(
                        "group flex items-center px-2 py-2 text-sm font-medium rounded-md",
                        currentPath === "/clients"
                          ? "bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-200"
                          : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                      )}
                    >
                      <Building
                        className={cn(
                          "mr-3 h-5 w-5",
                          currentPath === "/clients"
                            ? "text-primary-500 dark:text-primary-400"
                            : "text-slate-400 group-hover:text-slate-500 dark:text-slate-500 dark:group-hover:text-slate-400"
                        )}
                      />
                      Clienti
                    </a>
                  </Link>

                  <Link href="/company-codes">
                    <a
                      className={cn(
                        "group flex items-center px-2 py-2 text-sm font-medium rounded-md",
                        currentPath === "/company-codes"
                          ? "bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-200"
                          : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                      )}
                    >
                      <svg
                        className={cn(
                          "mr-3 h-5 w-5",
                          currentPath === "/company-codes"
                            ? "text-primary-500 dark:text-primary-400"
                            : "text-slate-400 group-hover:text-slate-500 dark:text-slate-500 dark:group-hover:text-slate-400"
                        )}
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                        <polygon points="3 15 7 15 7 12 12 17 7 22 7 19 3 19 3 15"></polygon>
                      </svg>
                      Codici Aziendali
                    </a>
                  </Link>

                  <Link href="/audit-logs">
                    <a
                      className={cn(
                        "group flex items-center px-2 py-2 text-sm font-medium rounded-md",
                        currentPath === "/audit-logs"
                          ? "bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-200"
                          : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                      )}
                    >
                      <ClipboardList
                        className={cn(
                          "mr-3 h-5 w-5",
                          currentPath === "/audit-logs"
                            ? "text-primary-500 dark:text-primary-400"
                            : "text-slate-400 group-hover:text-slate-500 dark:text-slate-500 dark:group-hover:text-slate-400"
                        )}
                      />
                      Registro Attività
                    </a>
                  </Link>

                  <Link href="/settings">
                    <a
                      className={cn(
                        "group flex items-center px-2 py-2 text-sm font-medium rounded-md",
                        currentPath === "/settings"
                          ? "bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-200"
                          : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                      )}
                    >
                      <Settings
                        className={cn(
                          "mr-3 h-5 w-5",
                          currentPath === "/settings"
                            ? "text-primary-500 dark:text-primary-400"
                            : "text-slate-400 group-hover:text-slate-500 dark:text-slate-500 dark:group-hover:text-slate-400"
                        )}
                      />
                      Impostazioni
                    </a>
                  </Link>

                  <Link href="/obsolete">
                    <a
                      className={cn(
                        "group flex items-center px-2 py-2 text-sm font-medium rounded-md",
                        currentPath === "/obsolete"
                          ? "bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-200"
                          : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                      )}
                    >
                      <Archive
                        className={cn(
                          "mr-3 h-5 w-5",
                          currentPath === "/obsolete"
                            ? "text-primary-500 dark:text-primary-400"
                            : "text-slate-400 group-hover:text-slate-500 dark:text-slate-500 dark:group-hover:text-slate-400"
                        )}
                      />
                      Documenti Obsoleti
                    </a>
                  </Link>
                </div>
              )}
            </nav>
          </div>
        </ScrollArea>
      </aside>
    </div>
  );
}
