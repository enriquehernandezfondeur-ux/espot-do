# Espot Host Dashboard

Una plataforma SaaS moderna para gestión de espacios en República Dominicana, construida con Next.js 16, React 19 y Supabase.

## 🚀 Características Implementadas

### ✅ Testing y Calidad de Código
- **Jest + React Testing Library**: Tests unitarios y de integración
- **Configuración completa**: Jest configurado para Next.js con TypeScript
- **CI/CD con GitHub Actions**: Tests automáticos en push/PR
- **Cobertura de código**: Reportes de cobertura integrados

### ✅ Monitoreo y Observabilidad
- **Winston Logger**: Logging estructurado con rotación diaria
- **Sentry**: Error tracking y monitoring de rendimiento
- **Health Check API**: Endpoint `/api/health` para monitoreo
- **Logging de acciones**: Tracking de operaciones críticas

### ✅ Seguridad
- **Headers de seguridad**: CSP, HSTS, X-Frame-Options
- **Rate limiting**: Protección contra abuso de APIs
- **Validación estricta**: Sanitización de inputs
- **CORS configurado**: Solo dominios autorizados

### ✅ Rendimiento
- **Imágenes optimizadas**: Componente `OptimizedImage` con lazy loading
- **Sistema de cache inteligente**: Cache en memoria con TTL y LRU
- **Lazy loading**: Hooks personalizados para carga diferida
- **Optimización de bundles**: Code splitting y tree shaking
- **Next.js optimizado**: Configuración avanzada de imágenes y webpack

### ✅ Experiencia de Usuario
- **Sistema de notificaciones**: Toasts con Sonner para feedback
- **Loading states**: Skeletons y spinners mejorados
- **Modo offline**: Detección de conexión y manejo de errores
- **Responsive design**: Optimizado para móvil y desktop
- **Accesibilidad**: ARIA labels y navegación por teclado

## 🛠️ Stack Tecnológico

- **Frontend**: Next.js 16, React 19, TypeScript
- **Styling**: Tailwind CSS v4
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **Testing**: Jest, React Testing Library
- **Monitoring**: Sentry, Winston
- **Payments**: Azul Payment Gateway
- **Maps**: Leaflet con clustering
- **Email**: Resend

## 📁 Estructura del Proyecto

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   ├── dashboard/         # Dashboard pages
│   └── auth/              # Authentication
├── components/            # React components
│   ├── ui/               # Reusable UI components
│   ├── dashboard/        # Dashboard-specific components
│   └── marketplace/      # Marketplace components
├── lib/                   # Utilities and configurations
│   ├── actions/          # Server actions
│   ├── supabase/         # Database client
│   ├── email/            # Email utilities
│   ├── payments/         # Payment processing
│   ├── logger.ts         # Logging system
│   ├── cache.ts          # Caching system
│   └── notifications.ts  # Notification system
├── hooks/                 # Custom React hooks
│   ├── performance.ts    # Performance hooks
│   └── ux.ts            # UX enhancement hooks
└── types/                # TypeScript definitions
```

## 🚀 Inicio Rápido

1. **Instalar dependencias**:
   ```bash
   npm install
   ```

2. **Configurar variables de entorno**:
   ```bash
   cp .env.example .env.local
   # Editar .env.local con tus valores
   ```

3. **Configurar base de datos**:
   ```bash
   # Ejecutar migraciones en Supabase
   # Los archivos están en supabase/migrations/
   ```

4. **Ejecutar tests**:
   ```bash
   npm test
   ```

5. **Desarrollo**:
   ```bash
   npm run dev
   ```

6. **Build de producción**:
   ```bash
   npm run build
   npm start
   ```

## 🧪 Testing

```bash
# Ejecutar todos los tests
npm test

# Tests con watch mode
npm run test:watch

# Cobertura de código
npm run test:coverage
```

## 📊 Monitoreo

- **Health Check**: `GET /api/health`
- **Logs**: `./logs/` directory
- **Sentry**: Configurado para error tracking
- **Analytics**: Vercel Analytics integrado

## 🔒 Seguridad

- Rate limiting en APIs críticas
- Headers de seguridad configurados
- Validación de inputs en server actions
- CORS restrictivo
- Logging de actividades sospechosas

## 📈 Rendimiento

- Imágenes optimizadas con WebP/AVIF
- Code splitting automático
- Cache inteligente para datos
- Lazy loading de componentes
- Optimización de bundles

## 🎨 UX/UI

- Sistema de notificaciones toast
- Loading states con skeletons
- Modo offline detection
- Responsive design
- Animaciones suaves con Framer Motion

## 📝 Scripts Disponibles

- `npm run dev` - Desarrollo
- `npm run build` - Build de producción
- `npm run start` - Servidor de producción
- `npm run lint` - Linting con ESLint
- `npm test` - Ejecutar tests
- `npm run test:watch` - Tests en modo watch
- `npm run test:coverage` - Tests con cobertura

## 🌐 Despliegue

La aplicación está optimizada para despliegue en Vercel:

1. Conectar repositorio a Vercel
2. Configurar variables de entorno
3. Deploy automático en cada push

## 🤝 Contribución

1. Fork el proyecto
2. Crear rama para feature (`git checkout -b feature/AmazingFeature`)
3. Commit cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abrir Pull Request

## 📄 Licencia

Este proyecto es privado y propiedad de Espot.

## 📞 Soporte

Para soporte técnico, contactar al equipo de desarrollo.
