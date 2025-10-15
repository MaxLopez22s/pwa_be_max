const express = require('express');
const router = express.Router();
const User = require('../models/User');

// Usuarios de prueba (compatible con el frontend)
const testUsers = [
  { telefono: '123456789', password: '123456', nombre: 'Usuario Demo', email: 'demo@test.com' },
  { telefono: '987654321', password: 'password', nombre: 'Admin', email: 'admin@test.com' },
  { telefono: '555555555', password: 'test123', nombre: 'Test User', email: 'test@test.com' }
];

// Login (compatible con el frontend)
router.post('/login', (req, res) => {
  const { telefono, password } = req.body;
  
  console.log(`Intento de login: ${telefono}`);
  
  // Buscar usuario en la lista de prueba
  const user = testUsers.find(u => u.telefono === telefono && u.password === password);
  
  if (user) {
    console.log(`Login exitoso para: ${user.nombre}`);
    res.json({
      success: true,
      user: {
        telefono: user.telefono,
        nombre: user.nombre,
        email: user.email
      },
      message: 'Login exitoso'
    });
  } else {
    console.log(`Login fallido para: ${telefono}`);
    res.status(401).json({
      success: false,
      message: 'Credenciales incorrectas'
    });
  }
});

// Registrar/Actualizar usuario
router.post('/register', async (req, res) => {
  try {
    const { email, name, avatar, preferences, subscription } = req.body;

    // Validar datos requeridos
    if (!email || !name) {
      return res.status(400).json({
        success: false,
        message: 'Email y nombre son requeridos'
      });
    }

    // Buscar usuario existente o crear uno nuevo
    let user = await User.findOne({ email });
    
    if (user) {
      // Actualizar usuario existente
      user.name = name;
      if (avatar) user.avatar = avatar;
      if (preferences) user.preferences = { ...user.preferences, ...preferences };
      if (subscription) user.subscription = subscription;
      user.lastActive = new Date();
      user.isOnline = true;
    } else {
      // Crear nuevo usuario
      user = new User({
        email,
        name,
        avatar,
        preferences: preferences || {},
        subscription,
        lastActive: new Date(),
        isOnline: true
      });
    }

    await user.save();

    res.json({
      success: true,
      message: 'Usuario registrado/actualizado correctamente',
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        preferences: user.preferences,
        lastActive: user.lastActive,
        isOnline: user.isOnline
      }
    });

  } catch (error) {
    console.error('Error en registro de usuario:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
});

// Obtener información del usuario
router.get('/profile/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findById(userId).select('-subscription');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    res.json({
      success: true,
      user
    });

  } catch (error) {
    console.error('Error obteniendo perfil:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
});

// Actualizar suscripción push
router.post('/subscription', async (req, res) => {
  try {
    const { userId, subscription } = req.body;

    if (!userId || !subscription) {
      return res.status(400).json({
        success: false,
        message: 'userId y subscription son requeridos'
      });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { 
        subscription,
        lastActive: new Date(),
        isOnline: true
      },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    res.json({
      success: true,
      message: 'Suscripción actualizada correctamente'
    });

  } catch (error) {
    console.error('Error actualizando suscripción:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
});

// Marcar usuario como offline
router.post('/offline', async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'userId es requerido'
      });
    }

    await User.findByIdAndUpdate(userId, {
      isOnline: false,
      lastActive: new Date()
    });

    res.json({
      success: true,
      message: 'Usuario marcado como offline'
    });

  } catch (error) {
    console.error('Error marcando usuario offline:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
});

module.exports = router;
