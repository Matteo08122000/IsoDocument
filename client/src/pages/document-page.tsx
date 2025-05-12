import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { DocumentDocument } from "../../../shared-types/schema";
import { useAuth } from "../hooks/use-auth";
import { useToast } from "../hooks/use-toast";

export default function DocumentPage() {
  const [match, params] = useRoute("/document/:id");
  const [_, setLocation] = useLocation();
  const [editMode, setEditMode] = useState(false);
  const [title, setTitle] = useState("");
  const [path, setPath] = useState("");
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: document, isLoading } = useQuery<DocumentDocument>({
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
  });
}
