import { useAuth } from "../hooks/use-auth";
import HeaderBar from "../components/header-bar";
import Footer from "../components/footer";

export default function AboutPage() {
  const { user } = useAuth();

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <HeaderBar user={user} />
      
      <main className="flex-1 container max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6 text-center">Chi Siamo</h1>
        
        <div className="space-y-8">
          <section className="bg-card border rounded-lg p-6">
            <h2 className="text-2xl font-semibold mb-4">ISO Document Manager</h2>
            <p className="text-muted-foreground mb-4">
              La nostra applicazione è stata sviluppata per aiutare le aziende a gestire efficacemente la documentazione conforme agli standard ISO, semplificando la conformità e migliorando l'organizzazione dei documenti.
            </p>
            
            <div className="grid md:grid-cols-2 gap-6 mt-8">
              <div className="bg-muted rounded-lg p-6">
                <h3 className="text-lg font-medium mb-3">La Nostra Missione</h3>
                <p className="text-sm text-muted-foreground">
                  Semplificare la gestione dei documenti ISO per ridurre il carico amministrativo e migliorare l'efficienza operativa delle aziende di qualsiasi dimensione.
                </p>
              </div>
              
              <div className="bg-muted rounded-lg p-6">
                <h3 className="text-lg font-medium mb-3">La Nostra Visione</h3>
                <p className="text-sm text-muted-foreground">
                  Diventare il partner di riferimento per le aziende che cercano di ottimizzare i loro processi di gestione documentale, garantendo conformità e qualità.
                </p>
              </div>
            </div>
          </section>
          
          <section className="bg-card border rounded-lg p-6">
            <h2 className="text-2xl font-semibold mb-4">Funzionalità Principali</h2>
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div className="border rounded-md p-4">
                <h3 className="font-medium mb-2">Gestione centralizzata</h3>
                <p className="text-sm text-muted-foreground">
                  Tutti i documenti ISO in un unico posto, facilmente accessibili e organizzati.
                </p>
              </div>
              
              <div className="border rounded-md p-4">
                <h3 className="font-medium mb-2">Controllo versioni</h3>
                <p className="text-sm text-muted-foreground">
                  Tracciamento completo delle revisioni e delle modifiche ai documenti.
                </p>
              </div>
              
              <div className="border rounded-md p-4">
                <h3 className="font-medium mb-2">Avvisi di scadenza</h3>
                <p className="text-sm text-muted-foreground">
                  Notifiche automatiche per documenti in scadenza o che richiedono revisione.
                </p>
              </div>
              
              <div className="border rounded-md p-4">
                <h3 className="font-medium mb-2">Integrazione Google Drive</h3>
                <p className="text-sm text-muted-foreground">
                  Sincronizzazione con Google Drive per un accesso semplificato ai documenti.
                </p>
              </div>
              
              <div className="border rounded-md p-4">
                <h3 className="font-medium mb-2">Controllo accessi</h3>
                <p className="text-sm text-muted-foreground">
                  Gestione granulare dei permessi utente con ruoli personalizzabili.
                </p>
              </div>
              
              <div className="border rounded-md p-4">
                <h3 className="font-medium mb-2">Dashboard analitica</h3>
                <p className="text-sm text-muted-foreground">
                  Statistiche in tempo reale sullo stato dei documenti e delle scadenze.
                </p>
              </div>
            </div>
          </section>
          
          <section className="bg-card border rounded-lg p-6">
            <h2 className="text-2xl font-semibold mb-4">Il Nostro Impegno</h2>
            <p className="text-muted-foreground">
              Il nostro team è costantemente impegnato nel miglioramento della piattaforma per offrire soluzioni sempre più avanzate e intuitive. Collaboriamo attivamente con i nostri clienti per comprendere le loro esigenze specifiche e adattare il nostro software di conseguenza.
            </p>
            <p className="text-muted-foreground mt-4">
              Investiamo in sicurezza, prestazioni e usabilità per garantire che la gestione dei documenti ISO diventi un processo fluido e senza stress per tutte le aziende che utilizzano la nostra soluzione.
            </p>
          </section>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
