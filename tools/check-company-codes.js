import mongoose from 'mongoose';
const { Schema } = mongoose;

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

async function findCompanyCodes() {
  try {
    await mongoose.connect(process.env.DB_URI);
    console.log('Connected to MongoDB');
    
    // Cerca i codici aziendali
    const companyCodes = await CompanyCodeModel.find({});
    console.log('Codici aziendali trovati:', companyCodes.length);
    
    if (companyCodes.length === 0) {
      console.log('Non sono stati trovati codici aziendali nel database.');
    } else {
      companyCodes.forEach(code => {
        console.log({
          id: code.legacyId,
          code: code.code,
          role: code.role,
          usageLimit: code.usageLimit,
          usageCount: code.usageCount,
          isActive: code.isActive,
          expiresAt: code.expiresAt,
          createdAt: code.createdAt
        });
      });
    }
  } catch (error) {
    console.error('Errore nella connessione a MongoDB:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('Connessione chiusa');
  }
}

findCompanyCodes();
