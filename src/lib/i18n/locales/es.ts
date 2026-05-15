export default {
  // Navegación
  nav: {
    dashboard: 'Dashboard',
    spaces: 'Mis Espacios',
    bookings: 'Reservas',
    marketplace: 'Marketplace',
    profile: 'Perfil',
    logout: 'Cerrar Sesión',
  },

  // Dashboard
  dashboard: {
    welcome: 'Bienvenido a tu dashboard',
    stats: {
      totalBookings: 'Reservas Totales',
      activeBookings: 'Reservas Activas',
      totalRevenue: 'Ingresos Totales',
      pendingPayments: 'Pagos Pendientes',
    },
    recentBookings: 'Reservas Recientes',
    noBookings: 'No tienes reservas recientes',
  },

  // Espacios
  spaces: {
    title: 'Mis Espacios',
    addNew: 'Agregar Espacio',
    edit: 'Editar',
    delete: 'Eliminar',
    publish: 'Publicar',
    unpublish: 'Despublicar',
    noSpaces: 'No tienes espacios registrados',
    categories: {
      salon: 'Salón',
      restaurante: 'Restaurante',
      rooftop: 'Rooftop',
      bar: 'Bar',
      estudio: 'Estudio',
      coworking: 'Coworking',
      hotel: 'Hotel',
      terraza: 'Terraza',
      lounge: 'Lounge',
      villa: 'Villa',
      jardin: 'Jardín',
      otro: 'Otro',
    },
  },

  // Reservas
  bookings: {
    title: 'Reservas',
    status: {
      pending: 'Pendiente',
      accepted: 'Aceptada',
      confirmed: 'Confirmada',
      completed: 'Completada',
      cancelled_guest: 'Cancelada por cliente',
      cancelled_host: 'Cancelada por anfitrión',
      quote_requested: 'Cotización solicitada',
    },
    actions: {
      accept: 'Aceptar',
      reject: 'Rechazar',
      confirm: 'Confirmar',
      cancel: 'Cancelar',
      viewDetails: 'Ver Detalles',
    },
  },

  // Formularios comunes
  forms: {
    save: 'Guardar',
    cancel: 'Cancelar',
    loading: 'Cargando...',
    error: 'Error',
    success: 'Éxito',
    required: 'Campo requerido',
    email: 'Correo electrónico',
    phone: 'Teléfono',
    name: 'Nombre',
    description: 'Descripción',
  },

  // Errores y mensajes
  messages: {
    networkError: 'Error de conexión. Verifica tu internet.',
    sessionExpired: 'Tu sesión ha expirado. Inicia sesión nuevamente.',
    unauthorized: 'No tienes permisos para esta acción.',
    notFound: 'Página no encontrada',
    serverError: 'Error del servidor. Inténtalo más tarde.',
    bookingSuccess: '¡Reserva confirmada exitosamente!',
    paymentSuccess: 'Pago procesado correctamente.',
    spacePublished: 'Espacio publicado en el marketplace.',
  },

  // PWA
  pwa: {
    installTitle: 'Instalar Espot',
    installDescription: 'Instala la app para acceder más rápido y trabajar offline',
    install: 'Instalar',
    later: 'Después',
    updateAvailable: 'Actualización disponible',
    updateDescription: 'Hay una nueva versión disponible.',
    update: 'Actualizar',
  },

  // Footer y legales
  footer: {
    about: 'Sobre Espot',
    contact: 'Contacto',
    privacy: 'Privacidad',
    terms: 'Términos',
    support: 'Soporte',
  },
} as const