import { Link } from "wouter";
import { Card, CardContent } from "../components/ui/card";
import { AlertCircle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full h-100  flex items-center justify-center bg-white-50">
      <Card className="w-full max-w-md mx-4">
        <CardContent className="pt-6 ">
          <div className="flex mb-4 gap-2">
            <AlertCircle className="h-8 w-8 text-red-500" />
            <h1 className="text-3xl font-bold text-black-900">
              404 Page Not Found
            </h1>
          </div>

          <p className="mt-4 text-sm text-white-600">
            Pagina non trovata. Spiacenti, la pagina che stai cercando non
            esiste o non è più disponibile. Torna alla homepage.
          </p>
        </CardContent>
        <div className="flex justify-center mt-1">
          <Link
            href="/auth"
            className="mb-2 bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded "
          >
            Torna alla homepage
          </Link>
        </div>
      </Card>
    </div>
  );
}
