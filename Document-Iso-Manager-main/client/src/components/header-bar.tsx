import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "../hooks/use-auth";
import { useTheme } from "../hooks/use-theme";
import { UserDocument as User } from "../../../shared-types/schema";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import LoadingSpinner from "./loading-spinner";

import { toast } from "../hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import {
  Sun,
  Moon,
  LogOut,
  Settings,
  User as UserIcon,
  FileText,
  HelpCircle,
  Info,
} from "lucide-react";
import { Avatar, AvatarFallback } from "../components/ui/avatar";
import MobileSidebar from "./mobile-sidebar";

interface HeaderBarProps {
  onSearch?: (query: string) => void;
  user: User | null;
}

export default function HeaderBar({ onSearch, user }: HeaderBarProps) {
  const { theme, setTheme } = useTheme();
  const { logoutMutation } = useAuth();
  const [_, setLocation] = useLocation();
  const [contactEmail, setContactEmail] = useState("");
  const [contactMessage, setContactMessage] = useState("");
  const [contactName, setContactName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showLoadingSpinner, setShowLoadingSpinner] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");

  const handleLogout = () => {
    setLoadingMessage("Disconnessione in corso...");
    setShowLoadingSpinner(true);

    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        // Forza il reindirizzamento alla pagina di login dopo un breve delay
        setTimeout(() => {
          window.location.href = "/auth";
        }, 1000);
      },
      onError: () => {
        setShowLoadingSpinner(false);
      },
    });
  };

  // Generate first letter of email for avatar
  const getUserInitials = () => {
    if (!user || !user.email) return "U";
    return user.email.charAt(0).toUpperCase();
  };

  return (
    <>
      {showLoadingSpinner && <LoadingSpinner message={loadingMessage} />}
      <header className="bg-white dark:bg-slate-800 shadow-sm z-10">
        <div className="px-3 xs:px-4 sm:px-6 lg:px-8 py-2 sm:py-3 flex items-center justify-between">
          <div className="flex items-center space-x-2 sm:space-x-4">
            {/* Mobile Sidebar - Mostra solo in mobile */}
            <div className="md:hidden">
              <MobileSidebar isAuthenticated={!!user} />
            </div>

            {/* App Logo - Clickable */}
            <div
              className="flex items-center cursor-pointer"
              onClick={() => setLocation(user ? "/" : "/auth")}
            >
              <FileText className="text-primary h-5 w-5 xs:h-6 xs:w-6 mr-1 xs:mr-2" />
              <h1 className="text-sm xs:text-base sm:text-lg font-semibold text-slate-800 dark:text-white truncate max-w-[120px] xs:max-w-[160px] sm:max-w-full">
                Gestione Documenti ISO
              </h1>
            </div>
          </div>

          <div className="flex items-center space-x-1 xs:space-x-2 sm:space-x-3">
            {/* Chi Siamo Link - Nascondi in mobile */}
            <div className="hidden md:block">
              <Link href="/chi-siamo">
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex items-center px-2 py-1 sm:px-3 sm:py-2 text-xs sm:text-sm h-8 sm:h-10"
                >
                  <Info className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                  <span>Chi Siamo</span>
                </Button>
              </Link>
            </div>

            {/* Assistenza Link - Nascondi in mobile */}
            <div className="hidden md:block">
              <Link href="/assistenza">
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex items-center px-2 py-1 sm:px-3 sm:py-2 text-xs sm:text-sm h-8 sm:h-10"
                >
                  <HelpCircle className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                  <span>Assistenza</span>
                </Button>
              </Link>
            </div>

            {/* Theme Toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 sm:h-10 sm:w-10"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              title={
                theme === "dark"
                  ? "Passa alla modalità chiara"
                  : "Passa alla modalità scura"
              }
            >
              {theme === "dark" ? (
                <Sun className="h-4 w-4 sm:h-5 sm:w-5" />
              ) : (
                <Moon className="h-4 w-4 sm:h-5 sm:w-5" />
              )}
              <span className="sr-only">Cambia tema</span>
            </Button>

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="relative h-7 w-7 sm:h-8 sm:w-8 rounded-full focus-visible:ring-0 focus-visible:ring-offset-0"
                >
                  <Avatar className="h-7 w-7 sm:h-8 sm:w-8">
                    <AvatarFallback className="bg-primary-600 text-white text-xs sm:text-sm">
                      {getUserInitials()}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {user?.email}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user && user.role
                        ? user.role.charAt(0).toUpperCase() + user.role.slice(1)
                        : ""}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem asChild>
                    <Link href="/settings">
                      <UserIcon className="mr-2 h-4 w-4" />
                      <span>Profilo</span>
                    </Link>
                  </DropdownMenuItem>
                  {user?.role === "admin" && (
                    <DropdownMenuItem asChild>
                      <Link href="/clients">
                        <FileText className="mr-2 h-4 w-4" />
                        <span>Clienti</span>
                      </Link>
                    </DropdownMenuItem>
                  )}
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  disabled={logoutMutation.isPending}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>
                    {logoutMutation.isPending
                      ? "Disconnessione in corso..."
                      : "Disconnetti"}
                  </span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>
    </>
  );
}
