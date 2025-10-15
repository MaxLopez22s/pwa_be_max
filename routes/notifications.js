const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const User = require('../models/User');
const PushService = require('../services/pushService');

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
      if (user && user.subscription) {
        const payload = PushService.createNotificationPayload(title, body, {
          icon: notification.icon,
          url: notification.url,
          data: { notificationId: notification._id, ...notification.data }
        });

        const pushResult = await PushService.sendNotification(user.subscription, payload);
        
        if (pushResult.success) {
          notification.sent = true;
          notification.sentAt = new Date();
          await notification.save();
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

module.exports = router;
