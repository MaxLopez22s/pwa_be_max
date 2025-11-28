const webpush = require('web-push');
const config = require('../config');

// Configurar web-push con las claves VAPID
const contactEmail = process.env.VAPID_CONTACT_EMAIL || 'mailto:tu-email@ejemplo.com';
webpush.setVapidDetails(
  contactEmail,
  config.vapidKeys.publicKey,
  config.vapidKeys.privateKey
);

class PushService {
  // Enviar notificación push a un usuario específico
  static async sendNotification(subscription, payload) {
    try {
      const result = await webpush.sendNotification(subscription, JSON.stringify(payload));
      console.log('✅ Notificación enviada exitosamente');
      return { success: true, result };
    } catch (error) {
      // Log detallado del error
      const errorDetails = {
        statusCode: error.statusCode,
        message: error.message,
        body: error.body,
        endpoint: subscription?.endpoint
      };
      console.error('❌ Error enviando notificación:', JSON.stringify(errorDetails, null, 2));
      
      // Mapear errores comunes
      let errorMessage = error.message || 'Error desconocido';
      
      // Detectar error de VAPID keys incorrectas
      if (error.message && error.message.includes('unexpected response code')) {
        errorMessage = 'Las VAPID keys no coinciden. La suscripción fue creada con diferentes keys. Por favor, vuelve a suscribirte.';
        return { 
          success: false, 
          invalidSubscription: true, 
          error: errorMessage, 
          statusCode: 400 
        };
      }
      
      if (error.statusCode === 410) {
        // Suscripción expirada o cancelada
        errorMessage = 'La suscripción ha expirado o fue cancelada';
        return { success: false, invalidSubscription: true, error: errorMessage, statusCode: 410 };
      } else if (error.statusCode === 404) {
        // Endpoint no encontrado
        errorMessage = 'Endpoint de suscripción no encontrado';
        return { success: false, invalidSubscription: true, error: errorMessage, statusCode: 404 };
      } else if (error.statusCode === 400) {
        // Solicitud inválida (posible problema con VAPID keys o payload)
        errorMessage = `Solicitud inválida: ${error.message || 'Verifica las VAPID keys o el payload'}`;
        return { 
          success: false, 
          error: errorMessage, 
          statusCode: 400,
          invalidSubscription: true // Marcar como inválida para que se desactive
        };
      } else if (error.statusCode === 429) {
        // Demasiadas solicitudes
        errorMessage = 'Demasiadas solicitudes. Intenta más tarde';
        return { success: false, error: errorMessage, statusCode: 429 };
      } else if (error.statusCode === 413) {
        // Payload demasiado grande
        errorMessage = 'El payload es demasiado grande';
        return { success: false, error: errorMessage, statusCode: 413 };
      }
      
      return { 
        success: false, 
        error: errorMessage,
        statusCode: error.statusCode || 500,
        details: error.body || error.message
      };
    }
  }

  // Enviar notificación a múltiples usuarios
  static async sendBulkNotification(subscriptions, payload) {
    const results = await Promise.allSettled(
      subscriptions.map(sub => this.sendNotification(sub, payload))
    );

    const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
    const failed = results.length - successful;

    return {
      total: results.length,
      successful,
      failed,
      results: results.map(r => r.status === 'fulfilled' ? r.value : { success: false, error: r.reason })
    };
  }

  // Crear payload de notificación
  static createNotificationPayload(title, body, options = {}) {
    return {
      title,
      body,
      icon: options.icon || '/icons/icon-192x192.png',
      badge: options.badge || '/icons/badge-72x72.png',
      url: options.url || '/',
      data: options.data || {},
      actions: options.actions || [],
      requireInteraction: options.requireInteraction || false,
      silent: options.silent || false,
      vibrate: options.vibrate || [200, 100, 200],
      tag: options.tag || 'default'
    };
  }
}

module.exports = PushService;
