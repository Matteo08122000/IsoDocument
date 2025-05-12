import { Express, Request, Response, NextFunction } from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

/**
 * Configurazione delle misure di sicurezza per l'ambiente di produzione
 * @param app Express application
 */
export function setupSecurity(app: Express) {
  // Aggiunge header di sicurezza
  app.use(helmet());

  // Limita le richieste ripetute per prevenire attacchi di forza bruta
  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minuti
    max: 10,
    message: { error: "Troppi tentativi di accesso. Riprova più tardi." },
  });

  app.use("/api/login", loginLimiter);
  app.use("/api/forgot-password", loginLimiter);
  app.use("/api/reset-password", loginLimiter);

  // Limiter generale per tutte le API
  const apiLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minuti
    max: 300,
    message: { error: "Troppe richieste in breve tempo. Riprova più tardi." },
  });

  app.use("/api/", apiLimiter);

  // Previene clickjacking
  app.use((req: Request, res: Response, next: NextFunction) => {
    res.setHeader("X-Frame-Options", "DENY");
    next();
  });

  // Verifica variabili d’ambiente critiche in produzione
  if (process.env.NODE_ENV === "production") {
    const requiredEnvVars = ["ENCRYPTION_KEY", "SESSION_SECRET", "MONGODB_URI"];
    const missingVars = requiredEnvVars.filter((name) => !process.env[name]);

    if (missingVars.length > 0) {
      console.error(`ERRORE CRITICO: Variabili mancanti: ${missingVars.join(", ")}`);
      process.exit(1);
    }

    if (process.env.ENCRYPTION_KEY.length < 32) {
      console.error("ERRORE CRITICO: ENCRYPTION_KEY deve avere almeno 32 caratteri");
      process.exit(1);
    }

    if (process.env.SESSION_SECRET.length < 32) {
      console.error("ERRORE CRITICO: SESSION_SECRET deve avere almeno 32 caratteri");
      process.exit(1);
    }
  }
}
