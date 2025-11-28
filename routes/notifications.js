const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const User = require('../models/User');
const PushService = require('../services/pushService');
const { isAdmin, checkIsAdmin } = require('./auth');

// Obtener notificaciones de un usuario
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { read, limit = 20, page = 1 } = req.query;

    // Construir filtros
    const filters = { user: userId };
    if (read !== undefined) filters.read = read === 'true';

    // Calcular paginación
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const notifications = await Notification.find(filters)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip)
      .lean();

    const total = await Notification.countDocuments(filters);
    const unreadCount = await Notification.countDocuments({ user: userId, read: false });

    res.json({
      success: true,
      notifications,
      unreadCount,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Error obteniendo notificaciones:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
});

// Crear nueva notificación
router.post('/', async (req, res) => {
  try {
    const { userId, title, body, icon, url, type, priority, data, sendPush = true } = req.body;

    if (!userId || !title || !body) {
      return res.status(400).json({
        success: false,
        message: 'userId, title y body son requeridos'
      });
    }

    // Crear notificación en la base de datos
    const notification = new Notification({
      user: userId,
      title,
      body,
      icon: icon || '/icons/icon-192x192.png',
      url: url || '/',
      type: type || 'info',
      priority: priority || 'normal',
      data: data || {}
    });

    await notification.save();

    // Enviar notificación push si está habilitado
    if (sendPush) {
      const user = await User.findById(userId);
      if (user) {
        // Determinar el tipo de notificación desde el payload o usar 'default'
        const notificationType = type || 'default';
        
        // Buscar suscripciones activas del tipo especificado
        let subscriptionsToUse = [];
        
        if (user.subscriptions && user.subscriptions.length > 0) {
          subscriptionsToUse = user.subscriptions.filter(
            sub => sub.active && sub.type === notificationType
          );
        }
        
        // Si no hay suscripciones del tipo específico, usar la suscripción principal
        if (subscriptionsToUse.length === 0 && user.subscription) {
          subscriptionsToUse = [{ subscription: user.subscription, type: 'default', config: {} }];
        }
        
        // Enviar notificación a todas las suscripciones encontradas
        for (const subData of subscriptionsToUse) {
          const subConfig = subData.config || {};
          
          const payload = PushService.createNotificationPayload(
            title, 
            body, 
            {
              icon: notification.icon || subConfig.icon,
              url: notification.url,
              data: { 
                notificationId: notification._id, 
                subscriptionType: notificationType,
                ...notification.data 
              },
              requireInteraction: subConfig.requireInteraction || false,
              vibrate: subConfig.vibrate || [200, 100, 200],
              tag: notificationType
            }
          );

          const pushResult = await PushService.sendNotification(subData.subscription, payload);
          
          if (pushResult.success) {
            notification.sent = true;
            notification.sentAt = new Date();
            await notification.save();
            break; // Si una suscripción funciona, no intentar más
          }
        }
      }
    }

    res.status(201).json({
      success: true,
      message: 'Notificación creada correctamente',
      notification
    });

  } catch (error) {
    console.error('Error creando notificación:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
});

// Marcar notificación como leída
router.post('/:notificationId/read', async (req, res) => {
  try {
    const { notificationId } = req.params;

    const notification = await Notification.findByIdAndUpdate(
      notificationId,
      { 
        read: true,
        readAt: new Date()
      },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notificación no encontrada'
      });
    }

    res.json({
      success: true,
      message: 'Notificación marcada como leída',
      notification
    });

  } catch (error) {
    console.error('Error marcando notificación como leída:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
});

// Marcar todas las notificaciones como leídas
router.post('/:userId/read-all', async (req, res) => {
  try {
    const { userId } = req.params;

    const result = await Notification.updateMany(
      { user: userId, read: false },
      { 
        read: true,
        readAt: new Date()
      }
    );

    res.json({
      success: true,
      message: `${result.modifiedCount} notificaciones marcadas como leídas`
    });

  } catch (error) {
    console.error('Error marcando notificaciones como leídas:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
});

// Eliminar notificación
router.delete('/:notificationId', async (req, res) => {
  try {
    const { notificationId } = req.params;

    const notification = await Notification.findByIdAndDelete(notificationId);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notificación no encontrada'
      });
    }

    res.json({
      success: true,
      message: 'Notificación eliminada correctamente'
    });

  } catch (error) {
    console.error('Error eliminando notificación:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
});

// Enviar notificación push de prueba
router.post('/test-push/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { title = 'Notificación de prueba', body = 'Esta es una notificación de prueba' } = req.body;

    const user = await User.findById(userId);
    if (!user || !user.subscription) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado o sin suscripción push'
      });
    }

    const payload = PushService.createNotificationPayload(title, body, {
      icon: '/icons/icon-192x192.png',
      url: '/',
      data: { test: true }
    });

    const result = await PushService.sendNotification(user.subscription, payload);

    res.json({
      success: result.success,
      message: result.success ? 'Notificación de prueba enviada' : 'Error enviando notificación',
      result
    });

  } catch (error) {
    console.error('Error enviando notificación de prueba:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
});

// Enviar notificación push a todas las suscripciones de un tipo específico (SOLO ADMIN)
router.post('/admin/send-by-subscription-type', async (req, res) => {
  try {
    const { adminTelefono, subscriptionType, title, body, icon, url, data, options } = req.body;

    // Verificar que sea admin
    const isAdminUser = adminTelefono && (isAdmin(adminTelefono) || await checkIsAdmin(adminTelefono));
    if (!isAdminUser) {
      return res.status(403).json({
        success: false,
        message: 'Acceso denegado. Solo administradores pueden enviar notificaciones por tipo.'
      });
    }

    // Validar datos requeridos
    if (!subscriptionType || !title || !body) {
      return res.status(400).json({
        success: false,
        message: 'subscriptionType, title y body son requeridos'
      });
    }

    // Buscar todos los usuarios con suscripciones activas del tipo especificado
    // Usar $elemMatch para buscar en el array de suscripciones
    const users = await User.find({
      subscriptions: {
        $elemMatch: {
          active: true,
          type: subscriptionType
        }
      }
    });
    
    console.log(`Usuarios encontrados con suscripción tipo ${subscriptionType}:`, users.length);

    if (users.length === 0) {
      console.log(`⚠️ No se encontraron usuarios con suscripción activa del tipo: ${subscriptionType}`);
      // Debug: verificar si hay usuarios con suscripciones en general
      const allUsersWithSubs = await User.find({ 'subscriptions.0': { $exists: true } });
      console.log(`Usuarios con suscripciones (cualquier tipo): ${allUsersWithSubs.length}`);
      if (allUsersWithSubs.length > 0) {
        allUsersWithSubs.forEach(u => {
          console.log(`Usuario ${u._id} tiene ${u.subscriptions?.length || 0} suscripciones:`, 
            u.subscriptions?.map(s => `${s.type} (${s.active ? 'activa' : 'inactiva'})`).join(', '));
        });
      }
      
      return res.json({
        success: true,
        message: `No se encontraron suscripciones activas del tipo: ${subscriptionType}`,
        sent: 0,
        failed: 0,
        total: 0,
        subscriptionType
      });
    }

    let sentCount = 0;
    let failedCount = 0;
    const results = [];

    // Enviar notificación a cada suscripción del tipo especificado
    for (const user of users) {
      console.log(`📤 Procesando usuario ${user._id} (${user.name || user.telefono})`);
      const matchingSubscriptions = user.subscriptions.filter(
        sub => sub.active && sub.type === subscriptionType
      );
      console.log(`  Suscripciones encontradas del tipo ${subscriptionType}: ${matchingSubscriptions.length}`);

      for (const subData of matchingSubscriptions) {
        try {
          // Validar que la suscripción tenga la estructura correcta
          if (!subData.subscription || !subData.subscription.endpoint) {
            console.warn(`⚠️ Suscripción inválida para usuario ${user._id}: falta endpoint`);
            failedCount++;
            results.push({
              userId: user._id.toString(),
              endpoint: 'N/A',
              success: false,
              error: 'Suscripción sin endpoint válido',
              invalidSubscription: true
            });
            
            // Desactivar suscripción inválida
            subData.active = false;
            subData.updatedAt = new Date();
            await user.save();
            continue;
          }

          const subConfig = subData.config || {};
          
          // Crear payload personalizado según la configuración de la suscripción
          const payload = PushService.createNotificationPayload(
            title,
            body,
            {
              icon: icon || subConfig.icon || '/icons/ico1.ico',
              badge: subConfig.badge || '/icons/ico2.ico',
              url: url || '/',
              data: {
                subscriptionType,
                ...data,
                ...options?.data
              },
              requireInteraction: options?.requireInteraction !== undefined 
                ? options.requireInteraction 
                : subConfig.requireInteraction || false,
              vibrate: options?.vibrate || subConfig.vibrate || [200, 100, 200],
              tag: subscriptionType,
              ...options
            }
          );

          console.log(`📤 Enviando notificación a: ${subData.subscription.endpoint.substring(0, 50)}...`);
          const pushResult = await PushService.sendNotification(subData.subscription, payload);

          if (pushResult.success) {
            sentCount++;
            console.log(`✅ Notificación enviada exitosamente a usuario ${user._id}`);
            
            // Guardar notificación en la base de datos
            try {
              const notification = new Notification({
                user: user._id,
                title,
                body,
                icon: payload.icon || icon || '/icons/ico1.ico',
                url: payload.url || url || '/',
                type: subscriptionType,
                priority: options?.priority || 'normal',
                data: payload.data || {},
                sent: true,
                sentAt: new Date()
              });
              const savedNotification = await notification.save();
              console.log(`✅ Notificación guardada en MongoDB para usuario ${user._id}:`, savedNotification._id);
            } catch (saveError) {
              console.error(`❌ Error guardando notificación para usuario ${user._id}:`, saveError.message);
              console.error('Detalles del error:', saveError);
              // Continuar aunque falle el guardado
            }
          } else {
            failedCount++;
            const deviceType = pushResult.isIOS ? 'iOS/iPhone' : 'Otro';
            console.error(`❌ Error enviando a usuario ${user._id} (${deviceType}): ${pushResult.error} (${pushResult.statusCode || 'N/A'})`);
            
            // Solo desactivar si es realmente inválida (410, 404, o 400 con VAPID keys incorrectas)
            // NO desactivar por errores temporales (429, 413, 500, etc.) especialmente en iOS
            if (pushResult.invalidSubscription) {
              if (pushResult.isIOS) {
                console.log(`⚠️ Suscripción iOS marcada como inválida, pero verificando antes de desactivar...`);
                // Para iOS, ser más conservador - solo desactivar si es definitivamente inválida
                if (pushResult.statusCode === 410 || pushResult.statusCode === 404) {
                  console.log(`🗑️ Desactivando suscripción iOS inválida (${pushResult.statusCode}) para usuario ${user._id}`);
                  subData.active = false;
                  subData.updatedAt = new Date();
                  await user.save();
                } else {
                  console.log(`⚠️ Error ${pushResult.statusCode} en iOS - Manteniendo suscripción activa (puede ser temporal)`);
                }
              } else {
                console.log(`🗑️ Desactivando suscripción inválida para usuario ${user._id}`);
                subData.active = false;
                subData.updatedAt = new Date();
                await user.save();
              }
            } else {
              // No es inválida, solo un error temporal
              if (pushResult.isIOS) {
                console.log(`⚠️ Error temporal en iOS - Manteniendo suscripción activa para usuario ${user._id}`);
              }
            }
          }

          results.push({
            userId: user._id.toString(),
            endpoint: subData.subscription.endpoint,
            success: pushResult.success,
            error: pushResult.error,
            statusCode: pushResult.statusCode,
            invalidSubscription: pushResult.invalidSubscription
          });
        } catch (error) {
          failedCount++;
          console.error(`❌ Excepción enviando a usuario ${user._id}:`, error);
          results.push({
            userId: user._id.toString(),
            endpoint: subData?.subscription?.endpoint || 'N/A',
            success: false,
            error: error.message || 'Error desconocido',
            statusCode: error.statusCode || 500
          });
          
          // Solo desactivar en casos definitivos (410, 404) - NO desactivar por otros errores
          // Esto es especialmente importante para iOS que puede tener errores temporales
          const isIOS = subData?.subscription?.endpoint?.includes('push.apple.com') || 
                       subData?.subscription?.endpoint?.includes('apns');
          
          if (error.statusCode === 410 || error.statusCode === 404) {
            if (isIOS) {
              console.log(`⚠️ Desactivando suscripción iOS inválida (${error.statusCode}) para usuario ${user._id}`);
            } else {
              console.log(`🗑️ Desactivando suscripción inválida (${error.statusCode}) para usuario ${user._id}`);
            }
            subData.active = false;
            subData.updatedAt = new Date();
            await user.save();
          } else if (isIOS) {
            console.log(`⚠️ Error temporal en iOS (${error.statusCode}) - Manteniendo suscripción activa para usuario ${user._id}`);
          }
        }
      }
    }

    res.json({
      success: true,
      message: `Notificación enviada a suscripciones tipo: ${subscriptionType}`,
      subscriptionType,
      sent: sentCount,
      failed: failedCount,
      total: sentCount + failedCount,
      results
    });

  } catch (error) {
    console.error('Error enviando notificación por tipo:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
});

// Obtener estadísticas de suscripciones por tipo (SOLO ADMIN)
router.get('/admin/subscription-stats', async (req, res) => {
  try {
    const { adminTelefono } = req.query;

    // Verificar que sea admin
    const isAdminUser = adminTelefono && (isAdmin(adminTelefono) || await checkIsAdmin(adminTelefono));
    if (!isAdminUser) {
      return res.status(403).json({
        success: false,
        message: 'Acceso denegado. Solo administradores pueden ver estadísticas.'
      });
    }

    // Obtener todas las suscripciones agrupadas por tipo
    const users = await User.find({
      'subscriptions.active': true
    });

    const stats = {};
    let totalSubscriptions = 0;

    users.forEach(user => {
      user.subscriptions.forEach(sub => {
        if (sub.active) {
          const type = sub.type || 'default';
          if (!stats[type]) {
            stats[type] = {
              type,
              count: 0,
              users: new Set()
            };
          }
          stats[type].count++;
          stats[type].users.add(user._id.toString());
          totalSubscriptions++;
        }
      });
    });

    // Convertir Sets a arrays y contar usuarios únicos
    const formattedStats = Object.values(stats).map(stat => ({
      type: stat.type,
      subscriptions: stat.count,
      uniqueUsers: stat.users.size
    }));

    res.json({
      success: true,
      stats: formattedStats,
      totalSubscriptions,
      totalUsers: users.length
    });

  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
});

module.exports = router;
