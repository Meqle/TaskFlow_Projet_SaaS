require('dotenv').config();

if (!process.env.MONGO_URI) {
  console.error('Erreur critique : la variable MONGO_URI est absente de l\'environnement.');
  process.exit(1);
}

module.exports = {
  mongoUri: process.env.MONGO_URI,
  port: Number(process.env.PORT) || 3000,
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',
  seedOnStart: process.env.SEED_ON_START === 'true',
  adminEmail: process.env.ADMIN_EMAIL || 'admin@taskflow.local',
  adminPassword: process.env.ADMIN_PASSWORD || 'admin123'
};

