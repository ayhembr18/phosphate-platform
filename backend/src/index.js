import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import 'dotenv/config';

import adminRoutes from './routes/admin.js';
import reportsRoutes from './routes/reports.js';

const app = express();
app.set('trust proxy', 1);

app.use(helmet());
app.use(express.json({ limit: '5mb' })); // images de graphiques en base64
app.use(
  cors({
    origin: process.env.FRONTEND_ORIGIN || 'http://localhost:5173',
    credentials: true,
  })
);

// Limite globale contre les abus / brute force
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Trop de requêtes. Réessayez plus tard.' },
});
app.use(globalLimiter);

// Limite stricte sur les routes sensibles (création de comptes)
const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
});

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api/admin', strictLimiter, adminRoutes);
app.use('/api/reports', reportsRoutes);

// Gestion d'erreurs générique — ne jamais renvoyer de stack trace au client
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Erreur serveur interne.' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`API sécurisée démarrée sur le port ${PORT}`);
});
