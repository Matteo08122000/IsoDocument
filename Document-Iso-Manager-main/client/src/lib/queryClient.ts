import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  try {
    const res = await fetch(url, {
      method,
      headers: data ? { "Content-Type": "application/json" } : {},
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include",
    });

    // Gestione speciale per errori di autenticazione
    if (res.status === 401) {
      console.warn('Errore di autenticazione durante la richiesta API:', url);
      
      // Tenta di estendere la sessione prima di fallire
      try {
        const authStatusResponse = await fetch('/api/auth-status', {
          credentials: 'include'
        });
        
        // Se la risposta auth-status è ok, forse la sessione è stata estesa,
        // quindi ritenta la richiesta originale una volta
        if (authStatusResponse.ok) {
          console.log('Sessione verificata con /api/auth-status, ritentando richiesta originale');
          
          // Ritenta la richiesta originale
          const retryRes = await fetch(url, {
            method,
            headers: data ? { "Content-Type": "application/json" } : {},
            body: data ? JSON.stringify(data) : undefined,
            credentials: "include",
          });
          
          if (retryRes.ok) {
            console.log('Richiesta riprovata con successo dopo controllo sessione');
            return retryRes;
          }
        }
      } catch (retryError) {
        console.error('Errore durante il tentativo di estendere la sessione:', retryError);
      }
    }
    
    await throwIfResNotOk(res);
    return res;
  } catch (error) {
    console.error(`Errore durante ${method} ${url}:`, error);
    throw error;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    try {
      let res = await fetch(queryKey[0] as string, {
        credentials: "include",
      });
      
      // Gestione speciale per errori di autenticazione
      if (res.status === 401) {
        console.warn('Errore di autenticazione durante il recupero dati:', queryKey[0]);
        
        // Se l'opzione è returnNull, restituiamo null come richiesto
        if (unauthorizedBehavior === "returnNull") {
          // Prima proviamo a estendere la sessione
          try {
            const authStatusResponse = await fetch('/api/auth-status', {
              credentials: 'include'
            });
            
            // Se la risposta auth-status è ok, forse la sessione è stata estesa,
            // quindi ritenta la richiesta originale una volta
            if (authStatusResponse.ok) {
              console.log('Sessione verificata con /api/auth-status, ritentando query');
              
              // Ritenta la richiesta originale
              const retryRes = await fetch(queryKey[0] as string, {
                credentials: "include",
              });
              
              if (retryRes.ok) {
                console.log('Query riprovata con successo dopo controllo sessione');
                return await retryRes.json();
              }
            }
          } catch (retryError) {
            console.error('Errore durante il tentativo di estendere la sessione:', retryError);
          }
          
          // Se ancora non ha funzionato, restituisci null come da comportamento richiesto
          return null;
        }
      }

      await throwIfResNotOk(res);
      return await res.json();
    } catch (error) {
      console.error(`Errore durante la query su ${queryKey[0]}:`, error);
      throw error;
    }
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
