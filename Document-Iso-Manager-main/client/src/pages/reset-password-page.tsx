import { useState, useEffect } from 'react';
import { useLocation, useRoute, Link } from 'wouter';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../components/ui/form';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert';
import { Loader2, CheckCircle, AlertCircle, ArrowLeft } from 'lucide-react';
import { useToast } from '../hooks/use-toast';
import AuthNavbar from '../components/auth-navbar';
import Footer from '../components/footer';
import { useAuth } from '../hooks/use-auth';

// Schema for password reset form
const resetPasswordSchema = z.object({
  password: z.string().min(8, 'La password deve essere di almeno 8 caratteri'),
  confirmPassword: z.string().min(8, 'La password deve essere di almeno 8 caratteri'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Le password non coincidono',
  path: ['confirmPassword'],
});

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

export default function ResetPasswordPage() {
  const [location] = useLocation();
  const [, params] = useRoute('/reset-password');
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [linkData, setLinkData] = useState<{ userId: number; action: string; } | null>(null);
  const [isVerifyingLink, setIsVerifyingLink] = useState(true);

  // Redirect se l'utente è già autenticato
  useEffect(() => {
    if (user) {
      window.location.href = '/';
    }
  }, [user]);

  // Extract link data from URL
  useEffect(() => {
    const searchParams = new URLSearchParams(location.split('?')[1] || '');
    const data = searchParams.get('data');
    const expires = searchParams.get('expires');
    const signature = searchParams.get('signature');

    if (!data || !expires || !signature) {
      setError('Link di recupero password non valido o scaduto');
      setIsVerifyingLink(false);
      return;
    }

    // Verify link
    fetch('/api/verify-reset-link', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ data, expires, signature }),
    })
      .then(res => res.json())
      .then(result => {
        if (!result.success) {
          setError(result.message || 'Link non valido o scaduto');
        } else {
          setLinkData(result.data);
        }
        setIsVerifyingLink(false);
      })
      .catch(err => {
        console.error('Errore durante la verifica del link:', err);
        setError('Errore durante la verifica del link');
        setIsVerifyingLink(false);
      });
  }, [location]);

  // Form setup
  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  // Handle form submission
  const onSubmit = async (values: ResetPasswordFormValues) => {
    if (!linkData) return;

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: linkData.userId,
          password: values.password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Errore durante il reset della password');
      }

      setIsSuccess(true);
      toast({
        title: 'Password reimpostata',
        description: 'La tua password è stata reimpostata con successo.',
      });
    } catch (err) {
      console.error('Errore durante il reset della password:', err);
      setError(err instanceof Error ? err.message : 'Errore durante il reset della password');
      toast({
        title: 'Errore',
        description: err instanceof Error ? err.message : 'Errore durante il reset della password',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Se l'utente è già loggato, reindirizza a home
  if (user) {
    return null; // Non renderizzare nulla mentre reindirizza
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <AuthNavbar />
      
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 md:p-8">
        <Card className="w-full max-w-md mx-auto shadow-lg">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">Reset Password</CardTitle>
            <CardDescription className="text-center">
              Inserisci la tua nuova password
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            {isVerifyingLink ? (
              <div className="flex flex-col items-center justify-center py-6">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="mt-2 text-sm text-gray-600">Verifica del link in corso...</p>
              </div>
            ) : error ? (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Errore</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
                <div className="mt-4">
                  <Link href="/auth">
                    <Button variant="outline" className="mt-2">
                      <ArrowLeft className="mr-2 h-4 w-4" /> Torna al login
                    </Button>
                  </Link>
                </div>
              </Alert>
            ) : isSuccess ? (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <CheckCircle className="h-12 w-12 text-green-500 mb-2" />
                <h3 className="text-lg font-medium">Password reimpostata con successo</h3>
                <p className="text-sm text-gray-600 mt-1">Ora puoi accedere con la tua nuova password.</p>
                <Link href="/auth">
                  <Button className="mt-4 w-full">
                    Vai al login
                  </Button>
                </Link>
              </div>
            ) : (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nuova Password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="••••••••" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Conferma Password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="••••••••" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Elaborazione...
                      </>
                    ) : (
                      'Reimposta Password'
                    )}
                  </Button>
                </form>
              </Form>
            )}
          </CardContent>
          
          <CardFooter className="flex justify-center">
            <div className="text-sm text-gray-600">
              <Link href="/auth" className="text-primary hover:underline">
                Torna al login
              </Link>
            </div>
          </CardFooter>
        </Card>
      </main>
      
      <Footer />
    </div>
  );
}
