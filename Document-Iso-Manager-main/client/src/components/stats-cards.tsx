import { Link } from "wouter";
import { Card, CardContent } from "../components/ui/card";
import {
  FileText,
  AlertTriangle,
  AlertCircle,
  Archive,
  CheckCircle,
} from "lucide-react";

interface StatsCardsProps {
  stats: {
    total: number;
    expiringSoon: number;
    expired: number;
    obsolete: number;
  };
}

export default function StatsCards({ stats }: StatsCardsProps) {
  // Calcola documenti validi (non in scadenza, non scaduti, non obsoleti)
  const validDocs =
    stats.total - stats.expiringSoon - stats.expired - stats.obsolete;

  return (
    <>
      {/* Stats Cards */}
      <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
        {/* Total Documents Card */}
        <Card className="overflow-hidden">
          <CardContent className="p-3 xs:p-4 sm:p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-primary-100 dark:bg-primary-900 rounded-md p-2 sm:p-3">
                <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-primary-600 dark:text-primary-400" />
              </div>
              <div className="ml-3 sm:ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400 truncate">
                    Documenti Totali
                  </dt>
                  <dd>
                    <div className="text-base sm:text-lg font-medium text-slate-900 dark:text-white">
                      {stats.total}
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Expiring Soon Card */}
        <Card className="overflow-hidden">
          <CardContent className="p-3 xs:p-4 sm:p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-amber-100 dark:bg-amber-900 rounded-md p-2 sm:p-3">
                <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="ml-3 sm:ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400 truncate">
                    In Scadenza
                  </dt>
                  <dd>
                    <div className="text-base sm:text-lg font-medium text-slate-900 dark:text-white">
                      {stats.expiringSoon}
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Expired Card */}
        <Card className="overflow-hidden">
          <CardContent className="p-3 xs:p-4 sm:p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-red-100 dark:bg-red-900 rounded-md p-2 sm:p-3">
                <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-red-600 dark:text-red-400" />
              </div>
              <div className="ml-3 sm:ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400 truncate">
                    Documenti Scaduti
                  </dt>
                  <dd>
                    <div className="text-base sm:text-lg font-medium text-slate-900 dark:text-white">
                      {stats.expired}
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Obsolete Documents Card */}
        <Card className="overflow-hidden">
          <CardContent className="p-3 xs:p-4 sm:p-5">
            <Link to="/obsolete">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-slate-100 dark:bg-slate-700 rounded-md p-2 sm:p-3">
                  <Archive className="h-4 w-4 sm:h-5 sm:w-5 text-slate-600 dark:text-slate-400" />
                </div>
                <div className="ml-3 sm:ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400 truncate">
                      Documenti Obsoleti
                    </dt>
                    <dd>
                      <div className="text-base sm:text-lg font-medium text-slate-900 dark:text-white">
                        {stats.obsolete}
                      </div>
                    </dd>
                  </dl>
                </div>
              </div>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Status Legend */}
      <Card className="mb-4 sm:mb-6 overflow-hidden">
        <CardContent className="p-3 xs:p-4 sm:p-5">
          <h3 className="text-sm xs:text-base font-medium text-slate-900 dark:text-white mb-2 sm:mb-3">
            Stato dei documenti
          </h3>
          <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
            {/* Valid status */}
            <div className="flex items-center">
              <span className="inline-flex items-center mr-2 px-1.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                <CheckCircle className="h-3 w-3 mr-1" />
                <span>Valido</span>
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {validDocs} documenti
              </span>
            </div>

            {/* Warning status */}
            <div className="flex items-center">
              <span className="inline-flex items-center mr-2 px-1.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300">
                <AlertTriangle className="h-3 w-3 mr-1" />
                <span>In scadenza</span>
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {stats.expiringSoon} documenti
              </span>
            </div>

            {/* Expired status */}
            <div className="flex items-center">
              <span className="inline-flex items-center mr-2 px-1.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300">
                <AlertCircle className="h-3 w-3 mr-1" />
                <span>Scaduto</span>
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {stats.expired} documenti
              </span>
            </div>

            {/* Obsolete status */}
            <div className="flex items-center">
              <span className="inline-flex items-center mr-2 px-1.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300">
                <Archive className="h-3 w-3 mr-1" />
                <span>Obsoleto</span>
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {stats.obsolete} documenti
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
