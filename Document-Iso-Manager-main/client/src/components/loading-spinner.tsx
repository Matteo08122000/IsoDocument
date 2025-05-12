type LoadingSpinnerProps = {
  message?: string;
};

export default function LoadingSpinner({ message = "Caricamento in corso..." }: LoadingSpinnerProps) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white dark:bg-slate-900 bg-opacity-90 dark:bg-opacity-90">
      <div className="flex flex-col items-center justify-center gap-6">
        <div className="relative">
          {/* Spinner esterno */}
          <div className="h-20 w-20 rounded-full border-4 border-t-primary border-r-primary border-b-transparent border-l-transparent animate-spin"></div>
          
          {/* Spinner interno */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-12 w-12 rounded-full border-4 border-t-transparent border-r-transparent border-b-primary border-l-primary animate-spin-reverse"></div>
          </div>
        </div>
        
        {message && (
          <p className="text-slate-700 dark:text-slate-300 text-lg font-medium">
            {message}
          </p>
        )}
      </div>
    </div>
  );
}
