import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { mongoStorage as storage } from "./mongo-storage";
import { UserDocument as User } from "../shared-types/schema";
// Usiamo lo store MongoDB dalla classe MongoStorage

declare global {
  namespace Express {
    interface UserDocument extends User {}
  }
}

const scryptAsync = promisify(scrypt);

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

export async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

/**
 * Session timeout middleware
 * Checks if the session has expired and logs the user out if it has
 * Se la sessione è ancora valida, questa continua ad essere utilizzabile
 * Rispetta l'impostazione "Ricordami" dell'utente
 */
export function sessionTimeoutMiddleware(
  req: Request,
  res: Response,
  next: any
) {
  if (req.isAuthenticated() && req.user) {
    // Se non c'è data di scadenza, impostiamone una di default (1 ora nel futuro)
    if (!req.user.sessionExpiry) {
      console.log(
        "Sessione senza data di scadenza rilevata, impostazione scadenza predefinita"
      );
      const defaultExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 ora
      req.user.sessionExpiry = defaultExpiry;

      // Aggiorniamo anche nel database in background senza bloccare la richiesta
      storage
        .updateUserSession(req.user.id, null, defaultExpiry)
        .catch((err) =>
          console.error(
            "Errore nel salvataggio della scadenza di sessione:",
            err
          )
        );
    }

    const now = new Date();
    const expiry = new Date(req.user.sessionExpiry);

    // Verifica se la sessione è scaduta
    if (now > expiry) {
      console.log(
        `Sessione scaduta per l'utente ${req.user.id} - Ultima attività: ${req.user.sessionExpiry}`
      );

      // Verificare se l'utente aveva scelto "Ricordami"
      const isRememberMe =
        req.session?.cookie?.maxAge &&
        req.session.cookie.maxAge > 60 * 60 * 1000; // > 1 ora

      // Creiamo un log per la scadenza della sessione
      try {
        storage
          .createLog({
            userId: req.user.id,
            action: "session_expired",
            details: {
              message: "User session expired",
              timestamp: now.toISOString(),
              rememberMeEnabled: isRememberMe || false,
            },
          })
          .catch((err) =>
            console.error(
              "Errore nella creazione del log di sessione scaduta:",
              err
            )
          );
      } catch (e) {
        console.error("Errore durante la creazione del log di sessione:", e);
      }

      // Facciamo logout dell'utente
      req.logout((err) => {
        if (err) {
          console.error("Errore durante il logout:", err);
          return next(err);
        }
        return res.status(401).json({
          message: "Sessione scaduta. Effettua nuovamente l'accesso.",
        });
      });
      return;
    } else {
      // La sessione è ancora valida, non fare nulla
      // Possibilmente potremmo estendere la sessione qui se desidera
    }
  }
  next();
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "iso-document-manager-secret",
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      httpOnly: true,
      sameSite: "lax",
    },
  };

  // Log di sessione per debug
  console.log(
    `Configurazione sessione: ambiente=${process.env.NODE_ENV}, cookie secure=${
      process.env.NODE_ENV === "production"
    }}`
  );

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(
      {
        usernameField: "email",
        passwordField: "password",
      },
      async (email, password, done) => {
        try {
          const user = await storage.getUserByEmail(email);
          if (!user || !(await comparePasswords(password, user.password))) {
            return done(null, false, { message: "Invalid email or password" });
          }
          return done(null, user);
        } catch (error) {
          return done(error);
        }
      }
    )
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      const { email, password, role, companyCode } = req.body;

      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "Email already exists" });
      }

      const sessionExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 ora

      let userRole =
        role && ["admin", "viewer"].includes(role) ? role : "viewer";

      let clientId: number | null = null;

      // Se è stato fornito un codice aziendale, verifica e risali al clientId
      if (companyCode) {
        const codeVerification = await storage.verifyCompanyCode(companyCode);

        if (codeVerification.valid) {
          userRole = codeVerification.role || "admin";

          if (codeVerification.codeId) {
            await storage.incrementCompanyCodeUsage(codeVerification.codeId);

            // 🔥 Ottieni clientId del creatore del codice
            const companyCodeDoc = await storage.getCompanyCode(
              codeVerification.codeId
            );
            if (companyCodeDoc) {
              const creatorUser = await storage.getUser(
                companyCodeDoc.createdBy
              );
              clientId = creatorUser?.clientId ?? null;
            }
          }

          await storage.createLog({
            userId: 0,
            action: "company_code_used",
            details: {
              message: "Company code used during registration",
              code: companyCode,
              roleAssigned: userRole,
              timestamp: new Date().toISOString(),
            },
          });
        } else {
          await storage.createLog({
            userId: 0,
            action: "invalid_company_code_attempt",
            details: {
              message: "Invalid company code used during registration",
              code: companyCode,
              timestamp: new Date().toISOString(),
            },
          });
        }
      }

      // 🔐 Crea l'utente includendo il clientId ottenuto dinamicamente
      const user = await storage.createUser({
        email,
        password: await hashPassword(password),
        role: userRole,
        lastLogin: new Date(),
        sessionExpiry,
        clientId,
      });

      await storage.createLog({
        userId: user.id,
        action: "login",
        details: {
          message: "User registered",
          timestamp: new Date().toISOString(),
        },
      });

      req.login(user, (err) => {
        if (err) return next(err);
        const { password, ...safeUser } = user;
        res.status(201).json(safeUser);
      });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/login", async (req, res, next) => {
    try {
      const { email, password, remember } = req.body;

      const user = await storage.getUserByEmail(email);
      if (!user || !(await comparePasswords(password, user.password))) {
        return res.status(401).json({ message: "Credenziali non valide" });
      }

      // Set session expiry - 30 minutes by default, 7 days if "remember me" is checked
      const sessionDuration = remember
        ? 7 * 24 * 60 * 60 * 1000
        : 60 * 60 * 1000; // 7 giorni o 60 minuti (aumentato da 30 a 60)
      const sessionExpiry = new Date(Date.now() + sessionDuration);
      const lastLogin = new Date();

      // Update the cookie max age based on remember me selection
      if (req.session.cookie) {
        req.session.cookie.maxAge = sessionDuration;
      }

      // Update user's last login time and session expiry in the database
      const updatedUser = await storage.updateUserSession(
        user.id,
        lastLogin,
        sessionExpiry
      );

      // Log the login event with timestamp for audit trail
      await storage.createLog({
        userId: user.id,
        action: "login",
        details: {
          message: "User logged in",
          timestamp: lastLogin.toISOString(),
          ipAddress: req.ip || "unknown",
          rememberMeEnabled: !!remember,
        },
      });

      // Verifica se l'utente ha un client associato
      let clientDetails = null;
      if (updatedUser && updatedUser.clientId) {
        clientDetails = await storage.getClient(updatedUser.clientId);
      }

      // Usa l'utente aggiornato per il login
      const userForLogin = updatedUser || {
        ...user,
        lastLogin,
        sessionExpiry,
      };

      // Usa passport.authenticate direttamente qui per evitare problemi con req.login
      req.login(userForLogin, (err) => {
        if (err) return next(err);

        // Extend session length to match user preference
        if (req.session) {
          req.session.cookie.maxAge = sessionDuration;
        }

        // Safely send user info without password
        const { password, ...safeUser } = userForLogin;
        res.status(200).json({
          ...safeUser,
          lastLogin,
          sessionExpiry,
          client: clientDetails,
        });
      });
    } catch (error) {
      console.error("Login error:", error);
      next(error);
    }
  });

  app.post("/api/logout", async (req, res, next) => {
    try {
      if (req.user) {
        // Audit log for logout
        await storage.createLog({
          userId: req.user.id,
          action: "logout",
          details: {
            message: "User logged out",
            timestamp: new Date().toISOString(),
            ipAddress: req.ip || "unknown",
          },
        });
      }

      req.logout((err) => {
        if (err) return next(err);
        res
          .status(200)
          .json({ message: "Disconnessione effettuata con successo" });
      });
    } catch (error) {
      next(error);
    }
  });

  // Get current user endpoint with session validity check and client info
  app.get("/api/user", sessionTimeoutMiddleware, async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Non autenticato" });
    }

    try {
      // Safe user object without password
      const { password, ...safeUser } = req.user;

      // Se l'utente ha un client associato, ottieni i dettagli del client
      let clientDetails = null;
      if (req.user.clientId) {
        clientDetails = await storage.getClient(req.user.clientId);
      }

      res.json({
        ...safeUser,
        client: clientDetails,
      });
    } catch (error) {
      console.error("Error fetching user details:", error);
      res.status(500).json({ message: "Errore nel recupero dei dati utente" });
    }
  });

  // Update session endpoint - called to extend session
  app.post(
    "/api/extend-session",
    sessionTimeoutMiddleware,
    async (req, res, next) => {
      try {
        if (!req.isAuthenticated()) {
          return res.status(401).json({ message: "Non autenticato" });
        }

        // Verificare se l'utente ha scelto "Ricordami" controllando la durata del cookie
        const isRememberMe =
          req.session.cookie.maxAge &&
          req.session.cookie.maxAge > 60 * 60 * 1000; // > 1 ora

        // Estendi la sessione basandosi su quanto scelto dall'utente
        const sessionDuration = isRememberMe
          ? 7 * 24 * 60 * 60 * 1000
          : 60 * 60 * 1000; // 7 giorni o 60 minuti (aumentato da 30 a 60)
        const sessionExpiry = new Date(Date.now() + sessionDuration);

        // Aggiorna l'utente nel database e ricevi l'utente aggiornato
        const updatedUser = await storage.updateUserSession(
          req.user.id,
          null,
          sessionExpiry
        );

        // Update session - sia nell'oggetto req.user che nella durata cookie
        req.user.sessionExpiry = sessionExpiry;
        if (req.session && req.session.cookie) {
          req.session.cookie.maxAge = sessionDuration;
        }

        // Se l'utente ha un client associato, ottieni i dettagli del client
        let clientDetails = null;
        if (updatedUser && updatedUser.clientId) {
          clientDetails = await storage.getClient(updatedUser.clientId);
        } else if (req.user.clientId) {
          clientDetails = await storage.getClient(req.user.clientId);
        }

        console.log(
          "Sessione estesa con successo. Nuova scadenza:",
          sessionExpiry
        );

        res.json({
          message: "Sessione estesa",
          sessionExpiry,
          isRememberMe,
          client: clientDetails,
        });
      } catch (error) {
        console.error("Errore durante l'estensione della sessione:", error);
        next(error);
      }
    }
  );
}
