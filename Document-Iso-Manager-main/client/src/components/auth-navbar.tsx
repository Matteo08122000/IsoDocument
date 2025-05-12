import {
  Moon,
  Sun,
  Menu,
  HelpCircle,
  Users,
  Mail,
  Info,
  X,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { useTheme } from "../hooks/use-theme";
import { Link } from "wouter";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "../components/ui/sheet";
import { ScrollArea } from "../components/ui/scroll-area";
import { Separator } from "../components/ui/separator";
import { useState } from "react";

export default function AuthNavbar() {
  const { theme, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className="w-full border-b bg-white dark:bg-slate-900 sticky top-0 z-40">
      <div className="container px-4 mx-auto flex items-center justify-between h-16">
        <div className="flex items-center space-x-2">
          {/* Mobile Sidebar */}
          <div className="md:hidden">
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
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
                  <SheetTitle className="text-lg font-semibold">
                    Menu
                  </SheetTitle>
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
                    {/* Link visibili a tutti */}
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
                  </div>
                </ScrollArea>
              </SheetContent>
            </Sheet>
          </div>

          <Link
            href="/auth"
            className="flex items-center space-x-2 cursor-pointer"
          >
            <svg
              className="h-8 w-8 text-primary"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M7 18H17V16H7V18Z" fill="currentColor" />
              <path d="M17 14H7V12H17V14Z" fill="currentColor" />
              <path d="M7 10H11V8H7V10Z" fill="currentColor" />
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M6 2C4.34315 2 3 3.34315 3 5V19C3 20.6569 4.34315 22 6 22H18C19.6569 22 21 20.6569 21 19V9C21 5.13401 17.866 2 14 2H6ZM6 4H13V9H19V19C19 19.5523 18.5523 20 18 20H6C5.44772 20 5 19.5523 5 19V5C5 4.44772 5.44772 4 6 4ZM15.0315 4.01389C16.7032 4.24114 18.1226 5.25309 18.9603 6.68134L15.0315 4.01389Z"
                fill="currentColor"
              />
            </svg>
            <span className="font-bold text-lg lg:text-xl">
              ISO Document Manager
            </span>
          </Link>
        </div>

        <div className="flex items-center space-x-4">
          {/* Chi Siamo e Assistenza Link - Nascondi su mobile */}
          <div className="hidden md:flex md:items-center md:space-x-4">
            <Link href="/chi-siamo">
              <Button variant="ghost" className="flex items-center space-x-1">
                <Info className="h-4 w-4" />
                <span>Chi Siamo</span>
              </Button>
            </Link>

            <Link href="/assistenza">
              <Button variant="ghost" className="flex items-center space-x-1">
                <HelpCircle className="h-4 w-4" />
                <span>Assistenza</span>
              </Button>
            </Link>
          </div>

          {/* Theme Toggle - Sempre visibile */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                <span className="sr-only">Cambia tema</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setTheme("light")}>
                Chiaro
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme("dark")}>
                Scuro
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme("system")}>
                Sistema
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
