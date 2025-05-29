import { useState } from "react";
import { useToast } from "../hooks/use-toast";
import { useAuth } from "../hooks/use-auth";
import { apiRequest } from "../lib/queryClient";
import HeaderBar from "../components/header-bar";
import Footer from "../components/footer";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../components/ui/accordion";
import { Label } from "../components/ui/label";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Button } from "../components/ui/button";

export default function SupportPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactMessage, setContactMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);

      // Invia la richiesta al backend
      const response = await apiRequest("POST", "/api/contact", {
        name: contactName,
        email: contactEmail,
        message: contactMessage,
        to: "docgenius8@gmail.com", // Email di destinazione
        subject: `Nuovo messaggio di supporto da ${contactName}`,
      });

      if (!response.ok) {
        throw new Error("Errore nell'invio del messaggio");
      }

      toast({
        title: "Messaggio inviato",
        description:
          "Grazie per averci contattato. Ti risponderemo il prima possibile.",
        duration: 2000,
      });

      // Reset del form
      setContactName("");
      setContactEmail("");
      setContactMessage("");
    } catch (error) {
      console.error("Errore durante l'invio del messaggio:", error);
      toast({
        title: "Errore",
        description:
          "Si è verificato un errore durante l'invio del messaggio. Riprova più tardi.",
        variant: "destructive",
        duration: 2000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <HeaderBar user={user} />

      <main className="flex-1 container max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6 text-center">Assistenza</h1>

        <div className="space-y-8 max-w-4xl mx-auto">
          <section>
            <h2 className="text-2xl font-semibold mb-4">Suggerimenti utili</h2>
            <div className="bg-muted p-6 rounded-lg">
              <h3 className="text-lg font-medium mb-3">
                Convenzione di nomenclatura dei file
              </h3>
              <p className="mb-2">
                Per ottimizzare l'estrazione dei metadati, utilizza il seguente
                formato per i nomi dei file:
              </p>
              <pre className="bg-background p-3 rounded border mb-4 overflow-x-auto">
                N.N.N_TitoloProcedura_Rev.N_YYYY-MM-DD.ext
              </pre>
              <p className="text-sm text-muted-foreground">
                Esempio:{" "}
                <code>4.2.1_GestioneDocumenti_Rev.3_2023-10-15.docx</code>
              </p>

              <div className="border-t border-border my-4 pt-4">
                <h3 className="text-lg font-medium mb-3">
                  Utilizzo degli indicatori di stato
                </h3>
                <p className="mb-2">
                  Per i documenti Excel, è possibile utilizzare i seguenti
                  indicatori:
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>
                    <span className="text-green-500">🟢</span> - Indica un
                    documento valido
                  </li>
                  <li>
                    <span className="text-red-500">🔴</span> - Indica un
                    documento scaduto
                  </li>
                  <li>
                    <span className="text-amber-500">⚠️</span> - Indica un
                    documento in scadenza
                  </li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Domande frequenti</h2>
            <div className="border rounded-md">
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="item-1">
                  <AccordionTrigger className="px-4">
                    Come posso caricare documenti?
                  </AccordionTrigger>
                  <AccordionContent className="px-4">
                    I documenti possono essere caricati direttamente dalla
                    dashboard utilizzando il pulsante "Carica Documento" oppure
                    possono essere sincronizzati automaticamente da Google Drive
                    configurando le impostazioni di sincronizzazione.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-2">
                  <AccordionTrigger className="px-4">
                    Come funzionano gli avvisi di scadenza?
                  </AccordionTrigger>
                  <AccordionContent className="px-4">
                    Il sistema analizza automaticamente le date di scadenza nei
                    documenti. Riceverai notifiche via email e all'interno
                    dell'applicazione quando un documento sta per scadere o è
                    già scaduto.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-3">
                  <AccordionTrigger className="px-4">
                    Come posso aggiungere nuovi utenti?
                  </AccordionTrigger>
                  <AccordionContent className="px-4">
                    Gli amministratori possono aggiungere nuovi utenti dalla
                    sezione "Utenti" nelle impostazioni. È possibile assegnare
                    diversi livelli di accesso a ciascun utente in base al
                    ruolo.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-4">
                  <AccordionTrigger className="px-4">
                    È possibile esportare i documenti?
                  </AccordionTrigger>
                  <AccordionContent className="px-4">
                    Sì, tutti i documenti possono essere esportati in vari
                    formati (PDF, Excel, ecc.) sia singolarmente che in gruppo.
                    Puoi anche generare report personalizzati dalla sezione
                    "Report".
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-5">
                  <AccordionTrigger className="px-4">
                    Come funziona la sincronizzazione con Google Drive?
                  </AccordionTrigger>
                  <AccordionContent className="px-4">
                    Dopo aver configurato le credenziali di Google Drive nelle
                    impostazioni, puoi specificare quali cartelle sincronizzare.
                    Il sistema estrarrà automaticamente i metadati dai nomi dei
                    file e li organizzerà nel sistema.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </section>

          <section className="bg-card border rounded-lg p-6">
            <h2 className="text-2xl font-semibold mb-4">Contattaci</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Compila il modulo sottostante per contattare il nostro team di
              supporto.
            </p>

            <form
              onSubmit={handleContactSubmit}
              className="grid grid-cols-1 md:grid-cols-2 gap-6"
            >
              <div className="flex flex-col space-y-2">
                <Label htmlFor="name" className="text-sm font-medium">
                  Nome
                </Label>
                <Input
                  id="name"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder="Il tuo nome"
                  required
                  className="h-10"
                />
              </div>

              <div className="flex flex-col space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="La tua email"
                  required
                  className="h-10"
                />
              </div>

              <div className="flex flex-col space-y-2 md:col-span-2">
                <Label htmlFor="message" className="text-sm font-medium">
                  Messaggio
                </Label>
                <Textarea
                  id="message"
                  placeholder="Descrivi il problema che stai riscontrando..."
                  value={contactMessage}
                  onChange={(e) => setContactMessage(e.target.value)}
                  required
                  className="min-h-[120px] resize-none"
                />
              </div>

              <div className="md:col-span-2 flex justify-end">
                <Button
                  type="submit"
                  className="w-full md:w-auto"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Invio in corso..." : "Invia messaggio"}
                </Button>
              </div>
            </form>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
