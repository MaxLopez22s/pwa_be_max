const webpush = require('web-push');
const config = require('../config');

// Configurar web-push con las claves VAPID
webpush.setVapidDetails(
  'mailto:tu-email@ejemplo.com', // Email de contacto
  config.vapidKeys.publicKey,
  config.vapidKeys.privateKey
);

class PushService {
  // Enviar notificación push a un usuario específico
  static async sendNotification(subscription, payload) {
    try {
      const result = await webpush.sendNotification(subscription, JSON.stringify(payload));
      console.log('✅ Notificación enviada:', result);
      return { success: true, result };
    } catch (error) {
      console.error('❌ Error enviando notificación:', error);
      
      // Si la suscripción es inválida, devolver información para limpiar
      if (error.statusCode === 410) {
        return { success: false, invalidSubscription: true, error: error.message };
      }
      
      return { success: false, error: error.message };
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
