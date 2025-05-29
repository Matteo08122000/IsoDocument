import authRouter from './routes/auth';
import documentRouter from './routes/documents';
import syncRouter from './routes/sync';

// Routes
app.use('/api/auth', authRouter);
app.use('/api/documents', documentRouter);
app.use('/api/sync', syncRouter); 