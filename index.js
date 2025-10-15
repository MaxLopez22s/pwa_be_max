const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const connectDB = require('./database/connection');
const config = require('./config');

// Importar rutas
const authRoutes = require('./routes/auth');
const dataRoutes = require('./routes/data');
const notificationRoutes = require('./routes/notifications');

const app = express();

// Conectar a MongoDB (opcional para desarrollo)
if (config.useDatabase) {
  connectDB();
} else {
  console.log('⚠️ MongoDB deshabilitado para desarrollo');
}

// Middleware de seguridad
app.use(helmet());

// Configurar CORS
app.use(cors({
  origin: config.frontendUrl,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate limiting
const limiter = rateLimit(config.rateLimit);
app.use(limiter);

// Middleware para parsear JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Middleware de logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Rutas de la API
app.use('/api/auth', authRoutes);
app.use('/api/data', dataRoutes);
app.use('/api/notifications', notificationRoutes);

// Ruta de salud del servidor
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Servidor funcionando correctamente',
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv
  });
});

// Ruta para obtener claves VAPID públicas
app.get('/api/vapid-public-key', (req, res) => {
  res.json({
    success: true,
    publicKey: config.vapidKeys.publicKey
  });
});

// Middleware para manejar rutas no encontradas
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Ruta no encontrada'
  });
});

// Middleware de manejo de errores
app.use((error, req, res, next) => {
  console.error('Error del servidor:', error);
  
  res.status(error.status || 500).json({
    success: false,
    message: error.message || 'Error interno del servidor',
    ...(config.nodeEnv === 'development' && { stack: error.stack })
  });
});

// Iniciar servidor
const PORT = config.port;
app.listen(PORT, () => {
  console.log(`🚀 Servidor iniciado en puerto ${PORT}`);
  console.log(`📱 Frontend URL: ${config.frontendUrl}`);
  console.log(`🌍 Entorno: ${config.nodeEnv}`);
  console.log(`📊 MongoDB: ${config.mongodbUri}`);
});

module.exports = app;
