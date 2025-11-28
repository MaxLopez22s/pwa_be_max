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
      console.log(`📝 Guardando suscripción tipo ${type} para userId: ${userId}`);
      const user = await User.findById(userId);
      if (user) {
        console.log(`✅ Usuario encontrado: ${user.name} (${user.telefono})`);
        // Guardar suscripción principal (para compatibilidad)
        user.subscription = subscription;
        
        // Guardar suscripciones múltiples en un array
        if (!user.subscriptions) {
          user.subscriptions = [];
        }
        
        // Verificar si ya existe una suscripción con este endpoint Y tipo
        const existingIndex = user.subscriptions.findIndex(
          sub => sub.subscription.endpoint === subscription.endpoint && sub.type === type
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
          // Actualizar suscripción existente del mismo tipo
          user.subscriptions[existingIndex] = subscriptionData;
          console.log(`🔄 Actualizando suscripción existente tipo ${type} para usuario ${userId}`);
        } else {
          // Agregar nueva suscripción (puede ser mismo endpoint pero diferente tipo)
          user.subscriptions.push(subscriptionData);
          console.log(`➕ Agregando nueva suscripción tipo ${type} para usuario ${userId}`);
        }
        
        await user.save();
        console.log(`✅ Suscripción ${type} guardada para usuario ${userId}:`, {
          endpoint: subscription.endpoint,
          type,
          active: true
        });
      } else {
        console.warn(`⚠️ Usuario ${userId} no encontrado al intentar guardar suscripción`);
      }
    } else {
      console.warn('⚠️ No se proporcionó userId al suscribirse');
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
        // Desactivar suscripciones que coincidan con el tipo
        let updated = false;
        user.subscriptions = user.subscriptions.map(sub => {
          if (!sub) return sub;
          
          // Verificar si la suscripción está activa (true o undefined)
          const isActive = sub.active === true || sub.active === undefined;
          
          // Si se especifica un tipo, solo desactivar suscripciones de ese tipo
          if (type) {
            // Verificar que coincida el tipo Y el endpoint (si se proporciona)
            const typeMatches = sub.type === type;
            const endpointMatches = !endpoint || (sub.subscription && sub.subscription.endpoint === endpoint);
            
            if (typeMatches && endpointMatches && isActive) {
              updated = true;
              console.log(`🔴 Desactivando suscripción tipo ${type} para usuario ${userId}`);
              return {
                ...sub,
                active: false,
                updatedAt: new Date()
              };
            }
          } else {
            // Si no se especifica tipo, desactivar todas las que coincidan con el endpoint
            if (sub.subscription && sub.subscription.endpoint === endpoint && isActive) {
              updated = true;
              console.log(`🔴 Desactivando suscripción por endpoint para usuario ${userId}`);
              return {
                ...sub,
                active: false,
                updatedAt: new Date()
              };
            }
          }
          return sub;
        });
        
        if (updated) {
          await user.save();
          console.log(`✅ Suscripción desactivada y guardada para usuario ${userId}`);
        } else {
          console.log(`⚠️ No se encontró suscripción activa para desactivar (tipo: ${type}, endpoint: ${endpoint})`);
        }
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
      // Solo incluir suscripciones que están explícitamente activas
      // (active === true o active === undefined, pero NO active === false)
      subscriptions = subscriptions.filter(sub => 
        sub && (sub.active === true || sub.active === undefined)
      );
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

