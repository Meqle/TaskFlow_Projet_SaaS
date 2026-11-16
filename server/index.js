const path = require('path');
const express = require('express');
const cookieParser = require('cookie-parser');
const mongoose = require('mongoose');
const config = require('./config');
const auth = require('./middlewares/auth');
const tenant = require('./middlewares/tenant');
const { seedIfEmpty } = require('./seed');

const authRoutes = require('./routes/auth');
const companyRoutes = require('./routes/companies');
const userRoutes = require('./routes/users');
const projectRoutes = require('./routes/projects');
const taskRoutes = require('./routes/tasks');
const statsRoutes = require('./routes/stats');

const app = express();

app.use(express.json());
app.use(cookieParser());

// Route publique de santé (Section 6.5)
app.get('/api/health', (req, res) => {
  const dbReady = mongoose.connection.readyState === 1;
  res.status(dbReady ? 200 : 503).json({
    status: dbReady ? 'ok' : 'degraded',
    database: dbReady ? 'connected' : 'disconnected'
  });
});

// Authentification (Section 6.5)
app.use('/api/auth', authRoutes);

// Toutes les routes métier passent par la chaîne fixe : auth -> tenant -> route (Section 4.1)
app.use('/api/companies', auth, tenant, companyRoutes);
app.use('/api/users', auth, tenant, userRoutes);
app.use('/api/projects', auth, tenant, projectRoutes);
app.use('/api/tasks', auth, tenant, taskRoutes);
app.use('/api/stats', auth, tenant, statsRoutes);

// Fichiers statiques Vue compilés
const publicDir = path.join(__dirname, 'public');
app.use(express.static(publicDir));

// Fallback SPA (Express 5 compatible)
app.get('/{*splat}', (req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'Route API introuvable' });
  }
  res.sendFile(path.join(publicDir, 'index.html'));
});

async function connectWithRetry(retries = 10, delayMs = 2000) {
  for (let i = 1; i <= retries; i++) {
    try {
      await mongoose.connect(config.mongoUri);
      console.log('Connecté à MongoDB.');
      return;
    } catch (err) {
      console.error(`Tentative MongoDB (${i}/${retries}) échouée : ${err.message}`);
      if (i === retries) throw err;
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
}

async function start() {
  try {
    await connectWithRetry();

    // Création des index définis dans les schémas
    await Promise.all([
      mongoose.model('Company').createIndexes(),
      mongoose.model('User').createIndexes(),
      mongoose.model('Project').createIndexes(),
      mongoose.model('Task').createIndexes()
    ]);

    if (config.seedOnStart) {
      await seedIfEmpty();
    }

    app.listen(config.port, '0.0.0.0', () => {
      console.log(`TaskFlow en écoute sur http://localhost:${config.port}`);
    });
  } catch (err) {
    console.error('Échec du démarrage :', err);
    process.exit(1);
  }
}

start();

