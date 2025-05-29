import express, { type Request, Response, NextFunction } from "express";
import * as dotenv from "dotenv";
import cors from "cors";
import { mongoStorage } from "./mongo-storage";

// ✅ Carica .env PRIMA DI QUALUNQUE ALTRO IMPORT
if (process.env.NODE_ENV === "production") {
  dotenv.config({ path: ".env.production" });
} else {
  dotenv.config();
}

const app = express();

// ✅ CORS config
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

if (process.env.NODE_ENV === "production") {
  const { setupSecurity } = await import("./security");
  setupSecurity(app);
  console.log("🛡️  Misure di sicurezza per la produzione attivate");
}

// ✅ Logging API
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      console.log(logLine);
    }
  });

  next();
});

async function startServer() {
  try {
    await mongoStorage.connect();
    console.log("Connected to MongoDB");

    // Correggi i documenti esistenti
    await mongoStorage.fixDocumentsClientId();

    const app = express();
    // ... rest of the server setup code ...
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

(async () => {
  // ✅ IMPORTA ORA registerRoutes DOPO dotenv.config()
  const { registerRoutes } = await import("./routes");
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  const port = 5000;
  server.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      console.log(`🚀 Backend in ascolto su http://localhost:${port}`);
    }
  );
})();
