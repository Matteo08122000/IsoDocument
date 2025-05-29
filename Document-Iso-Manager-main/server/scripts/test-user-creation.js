"use strict";
var __awaiter =
  (this && this.__awaiter) ||
  function (thisArg, _arguments, P, generator) {
    function adopt(value) {
      return value instanceof P
        ? value
        : new P(function (resolve) {
            resolve(value);
          });
    }
    return new (P || (P = Promise))(function (resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      }
      function rejected(value) {
        try {
          step(generator["throw"](value));
        } catch (e) {
          reject(e);
        }
      }
      function step(result) {
        result.done
          ? resolve(result.value)
          : adopt(result.value).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  };
var __generator =
  (this && this.__generator) ||
  function (thisArg, body) {
    var _ = {
        label: 0,
        sent: function () {
          if (t[0] & 1) throw t[1];
          return t[1];
        },
        trys: [],
        ops: [],
      },
      f,
      y,
      t,
      g = Object.create(
        (typeof Iterator === "function" ? Iterator : Object).prototype
      );
    return (
      (g.next = verb(0)),
      (g["throw"] = verb(1)),
      (g["return"] = verb(2)),
      typeof Symbol === "function" &&
        (g[Symbol.iterator] = function () {
          return this;
        }),
      g
    );
    function verb(n) {
      return function (v) {
        return step([n, v]);
      };
    }
    function step(op) {
      if (f) throw new TypeError("Generator is already executing.");
      while ((g && ((g = 0), op[0] && (_ = 0)), _))
        try {
          if (
            ((f = 1),
            y &&
              (t =
                op[0] & 2
                  ? y["return"]
                  : op[0]
                  ? y["throw"] || ((t = y["return"]) && t.call(y), 0)
                  : y.next) &&
              !(t = t.call(y, op[1])).done)
          )
            return t;
          if (((y = 0), t)) op = [op[0] & 2, t.value];
          switch (op[0]) {
            case 0:
            case 1:
              t = op;
              break;
            case 4:
              _.label++;
              return { value: op[1], done: false };
            case 5:
              _.label++;
              y = op[1];
              op = [0];
              continue;
            case 7:
              op = _.ops.pop();
              _.trys.pop();
              continue;
            default:
              if (
                !((t = _.trys), (t = t.length > 0 && t[t.length - 1])) &&
                (op[0] === 6 || op[0] === 2)
              ) {
                _ = 0;
                continue;
              }
              if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) {
                _.label = op[1];
                break;
              }
              if (op[0] === 6 && _.label < t[1]) {
                _.label = t[1];
                t = op;
                break;
              }
              if (t && _.label < t[2]) {
                _.label = t[2];
                _.ops.push(op);
                break;
              }
              if (t[2]) _.ops.pop();
              _.trys.pop();
              continue;
          }
          op = body.call(thisArg, _);
        } catch (e) {
          op = [6, e];
          y = 0;
        } finally {
          f = t = 0;
        }
      if (op[0] & 5) throw op[1];
      return { value: op[0] ? op[1] : void 0, done: true };
    }
  };
Object.defineProperty(exports, "__esModule", { value: true });
var mongo_storage_1 = require("../mongo-storage");
var bcrypt_1 = require("bcrypt");
function testUserCreation() {
  return __awaiter(this, void 0, void 0, function () {
    var hashedPassword, newUser, retrievedUser, newClient, updatedUser, error_1;
    return __generator(this, function (_a) {
      switch (_a.label) {
        case 0:
          _a.trys.push([0, 6, 7, 8]);
          console.log("Inizio test creazione utente...");
          return [4 /*yield*/, bcrypt_1.default.hash("test123", 10)];
        case 1:
          hashedPassword = _a.sent();
          return [
            4 /*yield*/,
            mongo_storage_1.mongoStorage.createUser({
              email: "test@example.com",
              password: hashedPassword,
              role: "viewer",
              lastLogin: null,
              sessionExpiry: null,
              clientId: null,
            }),
          ];
        case 2:
          newUser = _a.sent();
          console.log("Utente creato:", {
            id: newUser.legacyId,
            email: newUser.email,
            role: newUser.role,
            clientId: newUser.clientId,
          });
          return [
            4 /*yield*/,
            mongo_storage_1.mongoStorage.getUser(newUser.legacyId),
          ];
        case 3:
          retrievedUser = _a.sent();
          console.log("Utente recuperato:", {
            id:
              retrievedUser === null || retrievedUser === void 0
                ? void 0
                : retrievedUser.legacyId,
            email:
              retrievedUser === null || retrievedUser === void 0
                ? void 0
                : retrievedUser.email,
            role:
              retrievedUser === null || retrievedUser === void 0
                ? void 0
                : retrievedUser.role,
            clientId:
              retrievedUser === null || retrievedUser === void 0
                ? void 0
                : retrievedUser.clientId,
          });
          return [
            4 /*yield*/,
            mongo_storage_1.mongoStorage.createClient({
              name: "Test Client",
              driveFolderId: "test-folder-id",
            }),
          ];
        case 4:
          newClient = _a.sent();
          console.log("Client creato:", {
            id: newClient.legacyId,
            name: newClient.name,
            driveFolderId: newClient.driveFolderId,
          });
          return [
            4 /*yield*/,
            mongo_storage_1.mongoStorage.updateUserClient(
              newUser.legacyId,
              newClient.legacyId
            ),
          ];
        case 5:
          updatedUser = _a.sent();
          console.log("Utente aggiornato con client:", {
            id:
              updatedUser === null || updatedUser === void 0
                ? void 0
                : updatedUser.legacyId,
            email:
              updatedUser === null || updatedUser === void 0
                ? void 0
                : updatedUser.email,
            role:
              updatedUser === null || updatedUser === void 0
                ? void 0
                : updatedUser.role,
            clientId:
              updatedUser === null || updatedUser === void 0
                ? void 0
                : updatedUser.clientId,
          });
          console.log("Test completato con successo!");
          return [3 /*break*/, 8];
        case 6:
          error_1 = _a.sent();
          console.error("Errore durante il test:", error_1);
          return [3 /*break*/, 8];
        case 7:
          // Chiudiamo la connessione al database
          process.exit(0);
          return [7 /*endfinally*/];
        case 8:
          return [2 /*return*/];
      }
    });
  });
}
// Eseguiamo il test
testUserCreation();
