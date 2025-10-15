# PWA Backend

Backend para aplicación PWA con MongoDB Atlas y notificaciones push.

## 🚀 Características

- ✅ API REST completa
- ✅ MongoDB Atlas integrado
- ✅ Notificaciones Push con Web Push
- ✅ Autenticación de usuarios
- ✅ CORS configurado
- ✅ Rate limiting y seguridad
- ✅ Logs detallados

## 📋 API Endpoints

### Autenticación
- `POST /api/auth/login` - Login de usuario
- `POST /api/auth/register` - Registrar/actualizar usuario
- `GET /api/auth/profile/:userId` - Obtener perfil
- `POST /api/auth/subscription` - Actualizar suscripción push
- `POST /api/auth/offline` - Marcar usuario offline

### Notificaciones Push
- `POST /api/subscribe` - Suscribirse a notificaciones
- `POST /api/send-notification` - Enviar notificación
- `POST /api/test-notification` - Notificación de prueba
- `GET /api/subscriptions` - Estado de suscripciones
- `DELETE /api/subscriptions` - Limpiar suscripciones inválidas
- `GET /api/vapid-public-key` - Clave pública VAPID

### Datos
- `GET /api/data` - Obtener datos
- `POST /api/data` - Crear datos
- `PUT /api/data/:id` - Actualizar datos
- `DELETE /api/data/:id` - Eliminar datos

### Utilidades
- `GET /api/health` - Estado del servidor
- `GET /api/stats` - Estadísticas

## 🔧 Instalación

```bash
# Instalar dependencias
npm install

# Desarrollo
npm run dev

# Producción
npm start
```

## 🌍 Variables de Entorno

```bash
NODE_ENV=production
PORT=3001
MONGODB_URI=mongodb+srv://max:max.lopez.22@cluster0.fixejdk.mongodb.net/pwa-database?retryWrites=true&w=majority
VAPID_PUBLIC_KEY=BLbz7pe2pc9pZnoILf5q43dkshGp9Z-UA6lKpkZtqVaFyasrLTTrJjeNbFFCOBCGtB2KtWRIO8c04O2dXAhwdvA
VAPID_PRIVATE_KEY=NB_Sw6_NpRLOcmnqJD4gG404xsPdilVThhz6dCPFADI
FRONTEND_URL=https://tu-frontend-url.com
```

## 🚀 Deploy en Render

1. Conectar repositorio GitHub
2. **Build Command**: `npm install`
3. **Start Command**: `npm start`
4. Configurar variables de entorno
5. Deploy automático

## 👤 Usuarios de Prueba

| Teléfono    | Password   | Nombre       |
|-------------|------------|--------------|
| 123456789   | 123456     | Usuario Demo |
| 987654321   | password   | Admin        |
| 555555555   | test123    | Test User    |

## 📱 Notificaciones Push

El backend está configurado para:
- Recibir suscripciones de dispositivos
- Enviar notificaciones push personalizadas
- Manejar notificaciones de prueba
- Limpiar suscripciones inválidas automáticamente

## 🔒 Seguridad

- CORS configurado para frontend específico
- Rate limiting (100 requests/15 min)
- Helmet para headers de seguridad
- Validación de datos de entrada
- Manejo seguro de errores

## 📊 Base de Datos

**MongoDB Atlas** con modelos:
- **User**: Usuarios y suscripciones push
- **Data**: Datos de la aplicación
- **Notification**: Historial de notificaciones

## 🧪 Testing

```bash
# Health check
curl http://localhost:3001/api/health

# Login test
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"telefono":"123456789","password":"123456"}'

# Test notification
curl -X POST http://localhost:3001/api/test-notification
```