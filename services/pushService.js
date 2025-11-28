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
  // Detectar si el endpoint es de iPhone/iOS
  static isIOSDevice(endpoint) {
    if (!endpoint) return false;
    // Los endpoints de Apple Push Notification service contienen "push.apple.com"
    return endpoint.includes('push.apple.com') || endpoint.includes('apns');
  }

  // Enviar notificación push a un usuario específico
  static async sendNotification(subscription, payload) {
    try {
      const result = await webpush.sendNotification(subscription, JSON.stringify(payload));
      console.log('✅ Notificación enviada exitosamente');
      return { success: true, result };
    } catch (error) {
      // Detectar si es dispositivo iOS/iPhone
      const isIOS = this.isIOSDevice(subscription?.endpoint);
      
      // Log detallado del error
      const errorDetails = {
        statusCode: error.statusCode,
        message: error.message,
        body: error.body,
        endpoint: subscription?.endpoint ? subscription.endpoint.substring(0, 50) + '...' : 'N/A',
        isIOS: isIOS
      };
      console.error('❌ Error enviando notificación:', JSON.stringify(errorDetails, null, 2));
      
      // Mapear errores comunes
      let errorMessage = error.message || 'Error desconocido';
      let invalidSubscription = false;
      
      // Solo marcar como inválida en casos DEFINITIVOS (no temporales)
      // iOS/iPhone puede tener errores temporales que no deben desactivar la suscripción
      
      if (error.statusCode === 410) {
        // Suscripción expirada o cancelada - SIEMPRE inválida
        errorMessage = 'La suscripción ha expirado o fue cancelada';
        invalidSubscription = true;
      } else if (error.statusCode === 404) {
        // Endpoint no encontrado - SIEMPRE inválida
        errorMessage = 'Endpoint de suscripción no encontrado';
        invalidSubscription = true;
      } else if (error.statusCode === 400) {
        // Error 400 - Puede ser temporal en iOS
        errorMessage = `Solicitud inválida: ${error.message || 'Verifica las VAPID keys o el payload'}`;
        
        // Solo marcar como inválida si NO es iOS y es un error de VAPID keys
        if (!isIOS && error.message && error.message.includes('unexpected response code')) {
          errorMessage = 'Las VAPID keys no coinciden. La suscripción fue creada con diferentes keys. Por favor, vuelve a suscribirte.';
          invalidSubscription = true;
        } else if (isIOS) {
          // Para iOS, los errores 400 pueden ser temporales - no desactivar
          console.log('⚠️ Error 400 en dispositivo iOS - No desactivando suscripción (puede ser temporal)');
        }
      } else if (error.statusCode === 429) {
        // Demasiadas solicitudes - TEMPORAL, no desactivar
        errorMessage = 'Demasiadas solicitudes. Intenta más tarde';
        console.log('⚠️ Rate limit alcanzado - No desactivando suscripción (error temporal)');
      } else if (error.statusCode === 413) {
        // Payload demasiado grande - TEMPORAL (ajustar payload), no desactivar
        errorMessage = 'El payload es demasiado grande';
        console.log('⚠️ Payload demasiado grande - No desactivando suscripción (error de configuración)');
      } else {
        // Otros errores (500, 503, etc.) - TEMPORALES, no desactivar
        if (isIOS) {
          console.log('⚠️ Error en dispositivo iOS - No desactivando suscripción (puede ser temporal)');
        }
      }
      
      return { 
        success: false, 
        error: errorMessage,
        statusCode: error.statusCode || 500,
        invalidSubscription: invalidSubscription,
        isIOS: isIOS,
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
