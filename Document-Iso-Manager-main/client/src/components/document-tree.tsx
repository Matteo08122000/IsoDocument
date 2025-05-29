import { useState } from "react";
import { DocumentDocument as Document } from "../../../shared-types/schema";
import { cn } from "../lib/utils";
import {
  ChevronRight,
  File,
  Folder,
  AlertTriangle,
  AlertCircle,
} from "lucide-react";
import { ScrollArea } from "../components/ui/scroll-area";

// A node in the document tree
interface TreeNode {
  path: string;
  label: string;
  level: number;
  children: TreeNode[];
  documents: Document[];
  hasWarning: boolean;
  hasError: boolean;
}

interface DocumentTreeProps {
  documents: Document[];
  onSelectDocument: (document: Document) => void;
}

export default function DocumentTree({
  documents,
  onSelectDocument,
}: DocumentTreeProps) {
  console.log("🌳 DocumentTree - Documenti ricevuti:", documents.length);
  console.log("📄 Dettaglio documenti:", documents);

  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({
    // Default expanded nodes
    "1": true,
    "8": true,
    "8.2": true,
  });

  // Build tree structure from document paths
  const buildTree = (docs: Document[]): TreeNode => {
    console.log("🌳 Costruzione albero con", docs.length, "documenti");

    const root: TreeNode = {
      path: "",
      label: "Root",
      level: 0,
      children: [],
      documents: [],
      hasWarning: false,
      hasError: false,
    };

    // Map to store nodes by path
    const nodeMap: Record<string, TreeNode> = {
      "": root,
    };

    // First, create the tree structure
    for (const doc of docs) {
      console.log("📄 Processando documento:", doc.path);
      const parts = doc.path.split(".");
      let currentPath = "";

      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        const nextPath = currentPath ? `${currentPath}.${part}` : part;

        if (!nodeMap[nextPath]) {
          console.log("🌱 Creazione nuovo nodo:", nextPath);
          const newNode: TreeNode = {
            path: nextPath,
            label: `${nextPath} ${i === parts.length - 1 ? doc.title : ""}`,
            level: i + 1,
            children: [],
            documents: [],
            hasWarning: false,
            hasError: false,
          };

          nodeMap[nextPath] = newNode;
          const parentNode = nodeMap[currentPath];
          parentNode.children.push(newNode);
        }

        currentPath = nextPath;
      }

      // Add document to its node
      const node = nodeMap[doc.path];
      node.documents.push(doc);
      console.log("📄 Documento aggiunto al nodo:", doc.path);

      // Update warning/error flags
      if (doc.alertStatus === "warning") {
        node.hasWarning = true;

        // Propagate warning up the tree
        let parentPath = doc.path.split(".").slice(0, -1).join(".");
        while (parentPath) {
          nodeMap[parentPath].hasWarning = true;
          parentPath = parentPath.split(".").slice(0, -1).join(".");
        }
        root.hasWarning = true;
      } else if (doc.alertStatus === "expired") {
        node.hasError = true;

        // Propagate error up the tree
        let parentPath = doc.path.split(".").slice(0, -1).join(".");
        while (parentPath) {
          nodeMap[parentPath].hasError = true;
          parentPath = parentPath.split(".").slice(0, -1).join(".");
        }
        root.hasError = true;
      }
    }

    console.log("✅ Albero costruito");
    return root;
  };

  // Toggle expansion of a node
  const toggleNode = (path: string) => {
    setExpandedNodes((prev) => ({
      ...prev,
      [path]: !prev[path],
    }));
  };

  // Render a single node and its children
  const renderNode = (node: TreeNode): JSX.Element => {
    const isExpanded = expandedNodes[node.path];
    const hasChildren = node.children.length > 0;

    if (node.path === "") {
      // Root node, just render children
      return (
        <div className="space-y-1">
          {node.children.map((child) => renderNode(child))}
        </div>
      );
    }

    return (
      <div key={node.path} className="mb-1">
        <div className="flex items-center">
          {hasChildren ? (
            <button
              onClick={() => toggleNode(node.path)}
              className="flex items-center px-2 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 rounded-md hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer w-full"
            >
              <ChevronRight
                className={cn(
                  "mr-1 h-4 w-4 text-slate-400 transition-transform",
                  isExpanded ? "transform rotate-90" : ""
                )}
              />
              <Folder className="h-4 w-4 mr-2 text-slate-400" />
              <span>{node.path}</span>

              {/* Warning/Error indicators */}
              {node.hasError && (
                <AlertCircle className="ml-2 h-4 w-4 text-red-500" />
              )}
              {!node.hasError && node.hasWarning && (
                <AlertTriangle className="ml-2 h-4 w-4 text-amber-500" />
              )}
            </button>
          ) : (
            <div className="pl-7 pr-2 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 flex items-center">
              <File className="h-4 w-4 mr-2 text-slate-400" />
              <span>{node.path}</span>
            </div>
          )}
        </div>

        {/* Documents at this node */}
        {node.documents.length > 0 && (
          <div className="ml-7 pl-4 border-l border-slate-200 dark:border-slate-700">
            {node.documents.map((doc) => (
              <button
                key={doc.legacyId}
                onClick={() => onSelectDocument(doc)}
                className="w-full text-left py-1.5 pl-2 pr-2 text-sm text-primary-600 dark:text-primary-400 hover:underline flex items-center"
              >
                <File className="h-4 w-4 mr-2 text-slate-400" />
                <span className="truncate">
                  {doc.title} ({doc.revision})
                </span>

                {doc.alertStatus === "expired" && (
                  <AlertCircle className="ml-2 h-4 w-4 text-red-500" />
                )}
                {doc.alertStatus === "warning" && (
                  <AlertTriangle className="ml-2 h-4 w-4 text-amber-500" />
                )}
              </button>
            ))}
          </div>
        )}

        {/* Children nodes */}
        {hasChildren && isExpanded && (
          <div className="ml-6 space-y-1">
            {node.children.map((child) => renderNode(child))}
          </div>
        )}
      </div>
    );
  };

  const tree = buildTree(documents);

  return (
    <ScrollArea className="h-[calc(100vh-200px)]">
      <div className="p-2">{renderNode(tree)}</div>
    </ScrollArea>
  );
}
