import mongoose from 'mongoose';
const { Schema } = mongoose;

// Definizione schema per il contatore di sequenza
const counterSchema = new Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 }
});

const Counter = mongoose.model('Counter', counterSchema);

// Funzione per ottenere il prossimo valore di sequenza
async function getNextSequence(name) {
  const counter = await Counter.findByIdAndUpdate(
    name,
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return counter.seq;
}

// Definizione schema company code
const companyCodeSchema = new Schema({
  code: { type: String, required: true, unique: true },
  role: { type: String, required: true, default: 'admin' },
  usageLimit: { type: Number, default: 1 },
  usageCount: { type: Number, default: 0 },
  expiresAt: { type: Date, default: null },
  isActive: { type: Boolean, default: true },
  createdBy: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  legacyId: { type: Number, unique: true }
});

// Model
const CompanyCodeModel = mongoose.model('CompanyCode', companyCodeSchema);

async function createCompanyCode() {
  try {
    await mongoose.connect(process.env.DB_URI);
    console.log('Connesso a MongoDB');
    
    // Genera un codice aziendale casuale
    const randomCode = 'ADMIN' + Math.random().toString(36).substring(2, 10).toUpperCase();
    
    // Ottieni il prossimo ID
    const legacyId = await getNextSequence('company_code_id');
    
    // Crea il nuovo codice aziendale
    const newCompanyCode = new CompanyCodeModel({
      code: randomCode,
      role: 'admin',
      usageLimit: 1,
      usageCount: 0,
      isActive: true,
      createdBy: 1, // Assumiamo che l'ID 1 sia un admin esistente
      createdAt: new Date(),
      updatedAt: new Date(),
      legacyId
    });
    
    // Salva nel database
    await newCompanyCode.save();
    
    console.log('Nuovo codice aziendale creato:');
    console.log({
      id: newCompanyCode.legacyId,
      code: newCompanyCode.code,
      role: newCompanyCode.role,
      usageLimit: newCompanyCode.usageLimit,
      usageCount: newCompanyCode.usageCount,
      isActive: newCompanyCode.isActive
    });
    
    console.log('\nATTENZIONE: Conserva questo codice in un luogo sicuro.');
    console.log('Potrai fornirlo alle aziende per registrarsi come amministratori.');
    
  } catch (error) {
    console.error('Errore nella creazione del codice aziendale:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('Connessione chiusa');
  }
}

createCompanyCode();
