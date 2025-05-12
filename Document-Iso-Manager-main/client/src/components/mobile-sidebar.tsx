import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "../hooks/use-auth";
import { cn } from "../lib/utils";
import { ScrollArea } from "../components/ui/scroll-area";
import { Button } from "../components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "../components/ui/sheet";
import { Separator } from "../components/ui/separator";
import {
  Menu,
  Info,
  HelpCircle,
  User as UserIcon,
  Settings,
  LogOut,
  X,
} from "lucide-react";
import LoadingSpinner from "./loading-spinner";

interface MobileSidebarProps {
  isAuthenticated: boolean;
}

export default function MobileSidebar({ isAuthenticated }: MobileSidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { logoutMutation } = useAuth();
  const [_, setLocation] = useLocation();
  const [showLoadingSpinner, setShowLoadingSpinner] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");

  // Gestione del logout
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

  return (
    <>
      {showLoadingSpinner && <LoadingSpinner message={loadingMessage} />}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden h-8 w-8"
            aria-label="Menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent
          side="left"
          className="w-[80vw] xs:w-[70vw] sm:w-[60vw] p-0"
        >
          <SheetHeader className="p-4 border-b border-border">
            <SheetTitle className="text-lg font-semibold">Menu</SheetTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(false)}
              className="absolute right-4 top-4 h-8 w-8 rounded-full p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </SheetHeader>

          <ScrollArea className="h-[calc(100vh-80px)]">
            <div className="p-4 space-y-6">
              {/* Link Chi Siamo e Assistenza (sempre visibili) */}
              <div className="space-y-3">
                <Link href="/chi-siamo">
                  <Button
                    variant="ghost"
                    className="w-full justify-start gap-3 px-2 py-6 h-auto text-base"
                    onClick={() => setIsOpen(false)}
                  >
                    <Info className="h-5 w-5" />
                    Chi Siamo
                  </Button>
                </Link>
                <Link href="/assistenza">
                  <Button
                    variant="ghost"
                    className="w-full justify-start gap-3 px-2 py-6 h-auto text-base"
                    onClick={() => setIsOpen(false)}
                  >
                    <HelpCircle className="h-5 w-5" />
                    Assistenza
                  </Button>
                </Link>
              </div>

              {/* Separatore */}
              <Separator />

              {/* Link visibili solo agli utenti autenticati */}
              {isAuthenticated && (
                <div className="space-y-3">
                  <Link href="/settings">
                    <Button
                      variant="ghost"
                      className="w-full justify-start gap-3 px-2 py-6 h-auto text-base"
                      onClick={() => setIsOpen(false)}
                    >
                      <UserIcon className="h-5 w-5" />
                      Profilo
                    </Button>
                  </Link>
                  <Link href="/settings">
                    <Button
                      variant="ghost"
                      className="w-full justify-start gap-3 px-2 py-6 h-auto text-base"
                      onClick={() => setIsOpen(false)}
                    >
                      <Settings className="h-5 w-5" />
                      Impostazioni
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    className="w-full justify-start gap-3 px-2 py-6 h-auto text-base text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
                    onClick={handleLogout}
                    disabled={logoutMutation.isPending}
                  >
                    <LogOut className="h-5 w-5" />
                    {logoutMutation.isPending
                      ? "Disconnessione..."
                      : "Disconnetti"}
                  </Button>
                </div>
              )}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </>
  );
}
