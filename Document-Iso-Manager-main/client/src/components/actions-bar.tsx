import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Search, Plus } from "lucide-react";

interface ActionsBarProps {
  onFilterChange: (value: string) => void;
  filterValue: string;
  onSearch: (query: string) => void;
  isAdmin: boolean;
}

export default function ActionsBar({
  onFilterChange,
  filterValue,
  onSearch,
  isAdmin,
}: ActionsBarProps) {
  return (
    <div className="mb-4 sm:mb-6 flex flex-col xs:flex-row xs:items-center xs:justify-between gap-2 xs:gap-3 sm:gap-4">
      <div className="flex items-center space-x-2 xs:space-x-3 sm:space-x-4 flex-1">
        <div className="relative">
          <Select value={filterValue} onValueChange={onFilterChange}>
            <SelectTrigger className="w-[140px] xs:w-[160px] sm:w-[180px] text-xs sm:text-sm h-8 sm:h-10">
              <SelectValue placeholder="Tutti i Documenti" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutti i Documenti</SelectItem>
              <SelectItem value="none">Validi</SelectItem>
              <SelectItem value="expiring">In Scadenza</SelectItem>
              <SelectItem value="expired">Scaduti</SelectItem>
              <SelectItem value="recent">Aggiornati Recentemente</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="relative xs:flex-1 max-w-full xs:max-w-[240px] sm:max-w-md">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <Search className="h-3 w-3 sm:h-4 sm:w-4 text-slate-400" />
          </div>
          <Input
            type="search"
            placeholder="Cerca..."
            className="pl-8 sm:pl-10 h-8 sm:h-10 text-xs sm:text-sm"
            onChange={(e) => onSearch(e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}
