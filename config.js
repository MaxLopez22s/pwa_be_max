// Configuración del servidor
const config = {
  port: process.env.PORT || 3001,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // MongoDB Atlas
  mongodbUri: process.env.MONGODB_URI || 'mongodb+srv://max:max.lopez.22@cluster0.fixejdk.mongodb.net/pwa-database?retryWrites=true&w=majority',
  useDatabase: process.env.USE_DATABASE === 'false' ? false : true,
  
  // Web Push VAPID Keys (desde keys.json)
  vapidKeys: {
    publicKey: process.env.VAPID_PUBLIC_KEY || 'BLbz7pe2pc9pZnoILf5q43dkshGp9Z-UA6lKpkZtqVaFyasrLTTrJjeNbFFCOBCGtB2KtWRIO8c04O2dXAhwdvA',
    privateKey: process.env.VAPID_PRIVATE_KEY || 'NB_Sw6_NpRLOcmnqJD4gG404xsPdilVThhz6dCPFADI'
  },
  
  // CORS
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  
  // Rate limiting
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100 // límite de 100 requests por ventana
  }
};

module.exports = config;
