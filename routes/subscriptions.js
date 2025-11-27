const express = require('express');
const router = express.Router();
const User = require('../models/User');

// Modelo para suscripciones (si no existe en User)
// Podemos almacenar múltiples suscripciones por usuario

// Suscribirse a notificaciones push con tipo personalizado
router.post('/subscribe', async (req, res) => {
  try {
    const { subscription, type = 'default', config = {}, userId } = req.body;

    if (!subscription || !subscription.endpoint) {
      return res.status(400).json({
        success: false,
        message: 'Subscription es requerida'
      });
    }

    // Si hay userId, actualizar el usuario
    if (userId) {
      const user = await User.findById(userId);
      if (user) {
        // Guardar suscripción principal (para compatibilidad)
        user.subscription = subscription;
        
        // Guardar suscripciones múltiples en un array
        if (!user.subscriptions) {
          user.subscriptions = [];
        }
        
        // Verificar si ya existe una suscripción con este endpoint
        const existingIndex = user.subscriptions.findIndex(
          sub => sub.subscription.endpoint === subscription.endpoint
        );
        
        const subscriptionData = {
          subscription,
          type,
          config,
          active: true,
          createdAt: existingIndex >= 0 
            ? user.subscriptions[existingIndex].createdAt 
            : new Date(),
          updatedAt: new Date()
        };
        
        if (existingIndex >= 0) {
          user.subscriptions[existingIndex] = subscriptionData;
        } else {
          user.subscriptions.push(subscriptionData);
        }
        
        await user.save();
      }
    }

    res.json({
      success: true,
      message: `Suscripción ${type} registrada correctamente`,
      subscription: {
        type,
        config,
        endpoint: subscription.endpoint
      }
    });

  } catch (error) {
    console.error('Error registrando suscripción:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
});

// Desuscribirse de un tipo de notificación
router.post('/unsubscribe', async (req, res) => {
  try {
    const { endpoint, type, userId } = req.body;

    if (!endpoint) {
      return res.status(400).json({
        success: false,
        message: 'Endpoint es requerido'
      });
    }

    if (userId) {
      const user = await User.findById(userId);
      if (user && user.subscriptions) {
        // Desactivar suscripciones que coincidan
        user.subscriptions = user.subscriptions.map(sub => {
          if (sub.subscription.endpoint === endpoint) {
            if (type && sub.type !== type) {
              return sub; // No desactivar si el tipo no coincide
            }
            return {
              ...sub,
              active: false,
              updatedAt: new Date()
            };
          }
          return sub;
        });
        
        await user.save();
      }
    }

    res.json({
      success: true,
      message: 'Suscripción desactivada correctamente'
    });

  } catch (error) {
    console.error('Error desactivando suscripción:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
});

// Obtener suscripciones de un usuario
router.get('/subscriptions/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { activeOnly = true } = req.query;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    let subscriptions = user.subscriptions || [];
    
    if (activeOnly === 'true') {
      subscriptions = subscriptions.filter(sub => sub.active);
    }

    res.json({
      success: true,
      subscriptions
    });

  } catch (error) {
    console.error('Error obteniendo suscripciones:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
});

module.exports = router;

