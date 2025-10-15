const express = require('express');
const router = express.Router();
const Data = require('../models/Data');

// Obtener todos los datos de un usuario
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { type, archived, completed, limit = 50, page = 1 } = req.query;

    // Construir filtros
    const filters = { user: userId };
    if (type) filters.type = type;
    if (archived !== undefined) filters.isArchived = archived === 'true';
    if (completed !== undefined) filters.completed = completed === 'true';

    // Calcular paginación
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const data = await Data.find(filters)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip)
      .lean();

    const total = await Data.countDocuments(filters);

    res.json({
      success: true,
      data,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Error obteniendo datos:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
});

// Crear nuevo dato
router.post('/', async (req, res) => {
  try {
    const { userId, type, title, content, metadata, tags, isPublic, priority, dueDate } = req.body;

    if (!userId || !type || !title) {
      return res.status(400).json({
        success: false,
        message: 'userId, type y title son requeridos'
      });
    }

    const data = new Data({
      user: userId,
      type,
      title,
      content: content || '',
      metadata: metadata || {},
      tags: tags || [],
      isPublic: isPublic || false,
      priority: priority || 3,
      dueDate: dueDate || null
    });

    await data.save();

    res.status(201).json({
      success: true,
      message: 'Dato creado correctamente',
      data
    });

  } catch (error) {
    console.error('Error creando dato:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
});

// Actualizar dato
router.put('/:dataId', async (req, res) => {
  try {
    const { dataId } = req.params;
    const updateData = req.body;

    // No permitir actualizar el usuario
    delete updateData.user;

    const data = await Data.findByIdAndUpdate(
      dataId,
      updateData,
      { new: true, runValidators: true }
    );

    if (!data) {
      return res.status(404).json({
        success: false,
        message: 'Dato no encontrado'
      });
    }

    res.json({
      success: true,
      message: 'Dato actualizado correctamente',
      data
    });

  } catch (error) {
    console.error('Error actualizando dato:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
});

// Eliminar dato
router.delete('/:dataId', async (req, res) => {
  try {
    const { dataId } = req.params;

    const data = await Data.findByIdAndDelete(dataId);

    if (!data) {
      return res.status(404).json({
        success: false,
        message: 'Dato no encontrado'
      });
    }

    res.json({
      success: true,
      message: 'Dato eliminado correctamente'
    });

  } catch (error) {
    console.error('Error eliminando dato:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
});

// Marcar como completado
router.post('/:dataId/complete', async (req, res) => {
  try {
    const { dataId } = req.params;
    const { completed = true } = req.body;

    const data = await Data.findByIdAndUpdate(
      dataId,
      { 
        completed,
        completedAt: completed ? new Date() : null
      },
      { new: true }
    );

    if (!data) {
      return res.status(404).json({
        success: false,
        message: 'Dato no encontrado'
      });
    }

    res.json({
      success: true,
      message: `Dato marcado como ${completed ? 'completado' : 'pendiente'}`,
      data
    });

  } catch (error) {
    console.error('Error actualizando estado:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
});

// Archivar/desarchivar dato
router.post('/:dataId/archive', async (req, res) => {
  try {
    const { dataId } = req.params;
    const { archived = true } = req.body;

    const data = await Data.findByIdAndUpdate(
      dataId,
      { isArchived: archived },
      { new: true }
    );

    if (!data) {
      return res.status(404).json({
        success: false,
        message: 'Dato no encontrado'
      });
    }

    res.json({
      success: true,
      message: `Dato ${archived ? 'archivado' : 'desarchivado'} correctamente`,
      data
    });

  } catch (error) {
    console.error('Error archivando dato:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
});

module.exports = router;
