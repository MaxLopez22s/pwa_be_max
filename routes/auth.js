const express = require('express');
const router = express.Router();
const User = require('../models/User');

// Usuarios de prueba (compatible con el frontend)
const testUsers = [
  { telefono: '123456789', password: '123456', nombre: 'Usuario Demo', email: 'demo@test.com', isAdmin: false },
  { telefono: '987654321', password: 'password', nombre: 'Admin', email: 'admin@test.com', isAdmin: true },
  { telefono: '555555555', password: 'test123', nombre: 'Test User', email: 'test@test.com', isAdmin: false }
];

// Función helper para verificar si un usuario es admin
const isAdmin = (telefono) => {
  const user = testUsers.find(u => u.telefono === telefono);
  return user && user.isAdmin === true;
};

// Login (compatible con el frontend y MongoDB)
router.post('/login', async (req, res) => {
  try {
    const { telefono, password } = req.body;
    
    console.log(`Intento de login: ${telefono}`);
    
    // Primero buscar en MongoDB (si está disponible)
    let user = null;
    try {
      user = await User.findOne({ telefono }).select('+password');
    } catch (dbError) {
      console.warn('MongoDB no disponible, usando usuarios de prueba:', dbError.message);
    }
    
    // Si no existe en MongoDB, buscar en usuarios de prueba (compatibilidad)
    if (!user) {
      const testUser = testUsers.find(u => u.telefono === telefono && u.password === password);
      if (testUser) {
        console.log(`Login exitoso (test user): ${testUser.nombre}`);
        return res.json({
          success: true,
          user: {
            telefono: testUser.telefono,
            nombre: testUser.nombre,
            email: testUser.email,
            isAdmin: testUser.isAdmin || false
          },
          message: 'Login exitoso'
        });
      }
    }
    
    // Verificar contraseña si existe en MongoDB
    if (user) {
      if (user.password === password) {
        // Actualizar última actividad
        user.lastActive = new Date();
        user.isOnline = true;
        await user.save();
        
        console.log(`Login exitoso: ${user.name}`);
        return res.json({
          success: true,
          user: {
            telefono: user.telefono,
            nombre: user.name,
            email: user.email,
            id: user._id,
            isAdmin: user.isAdmin || false
          },
          message: 'Login exitoso'
        });
      }
    }
    
    console.log(`Login fallido para: ${telefono}`);
    res.status(401).json({
      success: false,
      message: 'Credenciales incorrectas'
    });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({
      success: false,
      message: `Error al iniciar sesión: ${error.message}`,
      error: process.env.NODE_ENV === 'development' ? error.stack : error.message
    });
  }
});

// Registrar nuevo usuario (público)
router.post('/register', async (req, res) => {
  try {
    const { telefono, password, name, email } = req.body;

    // Validar datos requeridos
    if (!telefono || !password || !name) {
      return res.status(400).json({
        success: false,
        message: 'Teléfono, contraseña y nombre son requeridos'
      });
    }

    // Verificar si MongoDB está disponible
    try {
      await User.findOne({ telefono });
    } catch (dbError) {
      return res.status(503).json({
        success: false,
        message: 'Base de datos no disponible. Por favor, contacta al administrador.',
        error: 'MongoDB connection error'
      });
    }

    // Validar que el teléfono no exista
    const existingUser = await User.findOne({ telefono });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Este teléfono ya está registrado'
      });
    }

    // Validar email único si se proporciona
    if (email) {
      const existingEmail = await User.findOne({ email });
      if (existingEmail) {
        return res.status(400).json({
          success: false,
          message: 'Este email ya está registrado'
        });
      }
    }

    // Crear nuevo usuario (no admin por defecto)
    const user = new User({
      telefono,
      password,
      name,
      email: email || null,
      isAdmin: false
    });

    await user.save();

    res.status(201).json({
      success: true,
      message: 'Usuario registrado correctamente',
      user: {
        id: user._id,
        telefono: user.telefono,
        name: user.name,
        email: user.email,
        isAdmin: false
      }
    });

  } catch (error) {
    console.error('Error en registro de usuario:', error);
    
    // Manejar errores específicos de MongoDB
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        success: false,
        message: `Este ${field === 'telefono' ? 'teléfono' : 'email'} ya está registrado`
      });
    }
    
    res.status(500).json({
      success: false,
      message: `Error al registrar usuario: ${error.message}`,
      error: process.env.NODE_ENV === 'development' ? error.stack : error.message
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

// ========== RUTAS DE ADMINISTRACIÓN ==========

// Obtener todos los usuarios (SOLO ADMIN)
router.get('/admin/users', async (req, res) => {
  try {
    const { adminTelefono } = req.query;

    // Verificar que sea admin
    if (!adminTelefono || !isAdmin(adminTelefono)) {
      // También verificar en MongoDB
      const adminUser = await User.findOne({ telefono: adminTelefono });
      if (!adminUser || !adminUser.isAdmin) {
        return res.status(403).json({
          success: false,
          message: 'Acceso denegado. Solo administradores pueden ver usuarios.'
        });
      }
    }

    const users = await User.find().select('-password -subscription').sort({ createdAt: -1 });

    res.json({
      success: true,
      users,
      total: users.length
    });

  } catch (error) {
    console.error('Error obteniendo usuarios:', error);
    res.status(500).json({
      success: false,
      message: `Error al obtener usuarios: ${error.message}`,
      error: process.env.NODE_ENV === 'development' ? error.stack : error.message
    });
  }
});

// Crear usuario (SOLO ADMIN)
router.post('/admin/users', async (req, res) => {
  try {
    const { adminTelefono, telefono, password, name, email, isAdmin: makeAdmin } = req.body;

    // Verificar que sea admin
    let isAdminUser = false;
    if (adminTelefono) {
      isAdminUser = isAdmin(adminTelefono);
      if (!isAdminUser) {
        const adminUser = await User.findOne({ telefono: adminTelefono });
        isAdminUser = adminUser && adminUser.isAdmin;
      }
    }

    if (!isAdminUser) {
      return res.status(403).json({
        success: false,
        message: 'Acceso denegado. Solo administradores pueden crear usuarios.'
      });
    }

    // Validar datos requeridos
    if (!telefono || !password || !name) {
      return res.status(400).json({
        success: false,
        message: 'Teléfono, contraseña y nombre son requeridos'
      });
    }

    // Validar que el teléfono no exista
    const existingUser = await User.findOne({ telefono });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Este teléfono ya está registrado'
      });
    }

    // Validar email único si se proporciona
    if (email) {
      const existingEmail = await User.findOne({ email });
      if (existingEmail) {
        return res.status(400).json({
          success: false,
          message: 'Este email ya está registrado'
        });
      }
    }

    // Crear nuevo usuario
    const user = new User({
      telefono,
      password,
      name,
      email: email || null,
      isAdmin: makeAdmin === true || makeAdmin === 'true'
    });

    await user.save();

    res.status(201).json({
      success: true,
      message: 'Usuario creado correctamente',
      user: {
        id: user._id,
        telefono: user.telefono,
        name: user.name,
        email: user.email,
        isAdmin: user.isAdmin
      }
    });

  } catch (error) {
    console.error('Error creando usuario:', error);
    
    // Manejar errores específicos de MongoDB
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        success: false,
        message: `Este ${field === 'telefono' ? 'teléfono' : 'email'} ya está registrado`
      });
    }
    
    res.status(500).json({
      success: false,
      message: `Error al crear usuario: ${error.message}`,
      error: process.env.NODE_ENV === 'development' ? error.stack : error.message
    });
  }
});

// Actualizar usuario (SOLO ADMIN)
router.put('/admin/users/:userId', async (req, res) => {
  try {
    const { adminTelefono } = req.body;
    const { userId } = req.params;
    const { name, email, password, isAdmin: makeAdmin } = req.body;

    // Verificar que sea admin
    let isAdminUser = false;
    if (adminTelefono) {
      isAdminUser = isAdmin(adminTelefono);
      if (!isAdminUser) {
        const adminUser = await User.findOne({ telefono: adminTelefono });
        isAdminUser = adminUser && adminUser.isAdmin;
      }
    }

    if (!isAdminUser) {
      return res.status(403).json({
        success: false,
        message: 'Acceso denegado. Solo administradores pueden actualizar usuarios.'
      });
    }

    const updateData = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (password) updateData.password = password;
    if (makeAdmin !== undefined) updateData.isAdmin = makeAdmin === true || makeAdmin === 'true';

    const user = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    res.json({
      success: true,
      message: 'Usuario actualizado correctamente',
      user
    });

  } catch (error) {
    console.error('Error actualizando usuario:', error);
    
    // Manejar errores específicos de MongoDB
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        success: false,
        message: `Este ${field === 'telefono' ? 'teléfono' : 'email'} ya está en uso`
      });
    }
    
    res.status(500).json({
      success: false,
      message: `Error al actualizar usuario: ${error.message}`,
      error: process.env.NODE_ENV === 'development' ? error.stack : error.message
    });
  }
});

// Eliminar usuario (SOLO ADMIN)
router.delete('/admin/users/:userId', async (req, res) => {
  try {
    const { adminTelefono } = req.query;

    // Verificar que sea admin
    let isAdminUser = false;
    if (adminTelefono) {
      isAdminUser = isAdmin(adminTelefono);
      if (!isAdminUser) {
        const adminUser = await User.findOne({ telefono: adminTelefono });
        isAdminUser = adminUser && adminUser.isAdmin;
      }
    }

    if (!isAdminUser) {
      return res.status(403).json({
        success: false,
        message: 'Acceso denegado. Solo administradores pueden eliminar usuarios.'
      });
    }

    const { userId } = req.params;
    const user = await User.findByIdAndDelete(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    res.json({
      success: true,
      message: 'Usuario eliminado correctamente'
    });

  } catch (error) {
    console.error('Error eliminando usuario:', error);
    res.status(500).json({
      success: false,
      message: `Error al eliminar usuario: ${error.message}`,
      error: process.env.NODE_ENV === 'development' ? error.stack : error.message
    });
  }
});

// Función helper mejorada para verificar admin (MongoDB + testUsers)
const checkIsAdmin = async (telefono) => {
  // Primero verificar en testUsers
  if (isAdmin(telefono)) return true;
  
  // Luego verificar en MongoDB
  try {
    const user = await User.findOne({ telefono });
    return user && user.isAdmin === true;
  } catch (error) {
    return false;
  }
};

// Exportar función isAdmin para uso en otras rutas
module.exports.isAdmin = isAdmin;
module.exports.checkIsAdmin = checkIsAdmin;
module.exports = router;
