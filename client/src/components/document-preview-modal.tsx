import { DocumentDocument } from "../../../shared-types/schema";

interface DocumentPreviewModalProps {
  document: DocumentDocument | null;
  isOpen: boolean;
  onClose: () => void;
}
