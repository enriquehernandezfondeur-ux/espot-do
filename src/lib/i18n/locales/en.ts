export default {
  // Navigation
  nav: {
    dashboard: 'Dashboard',
    spaces: 'My Spaces',
    bookings: 'Bookings',
    marketplace: 'Marketplace',
    profile: 'Profile',
    logout: 'Logout',
  },

  // Dashboard
  dashboard: {
    welcome: 'Welcome to your dashboard',
    stats: {
      totalBookings: 'Total Bookings',
      activeBookings: 'Active Bookings',
      totalRevenue: 'Total Revenue',
      pendingPayments: 'Pending Payments',
    },
    recentBookings: 'Recent Bookings',
    noBookings: 'You have no recent bookings',
  },

  // Spaces
  spaces: {
    title: 'My Spaces',
    addNew: 'Add Space',
    edit: 'Edit',
    delete: 'Delete',
    publish: 'Publish',
    unpublish: 'Unpublish',
    noSpaces: 'You have no registered spaces',
    categories: {
      salon: 'Hall',
      restaurante: 'Restaurant',
      rooftop: 'Rooftop',
      bar: 'Bar',
      estudio: 'Studio',
      coworking: 'Coworking',
      hotel: 'Hotel',
      terraza: 'Terrace',
      lounge: 'Lounge',
      villa: 'Villa',
      jardin: 'Garden',
      otro: 'Other',
    },
  },

  // Bookings
  bookings: {
    title: 'Bookings',
    status: {
      pending: 'Pending',
      accepted: 'Accepted',
      confirmed: 'Confirmed',
      completed: 'Completed',
      cancelled_guest: 'Cancelled by guest',
      cancelled_host: 'Cancelled by host',
      quote_requested: 'Quote requested',
    },
    actions: {
      accept: 'Accept',
      reject: 'Reject',
      confirm: 'Confirm',
      cancel: 'Cancel',
      viewDetails: 'View Details',
    },
  },

  // Common forms
  forms: {
    save: 'Save',
    cancel: 'Cancel',
    loading: 'Loading...',
    error: 'Error',
    success: 'Success',
    required: 'Required field',
    email: 'Email',
    phone: 'Phone',
    name: 'Name',
    description: 'Description',
  },

  // Errors and messages
  messages: {
    networkError: 'Connection error. Check your internet.',
    sessionExpired: 'Your session has expired. Please log in again.',
    unauthorized: 'You do not have permissions for this action.',
    notFound: 'Page not found',
    serverError: 'Server error. Try again later.',
    bookingSuccess: 'Booking confirmed successfully!',
    paymentSuccess: 'Payment processed correctly.',
    spacePublished: 'Space published on marketplace.',
  },

  // PWA
  pwa: {
    installTitle: 'Install Espot',
    installDescription: 'Install the app for faster access and offline work',
    install: 'Install',
    later: 'Later',
    updateAvailable: 'Update available',
    updateDescription: 'A new version is available.',
    update: 'Update',
  },

  // Footer and legal
  footer: {
    about: 'About Espot',
    contact: 'Contact',
    privacy: 'Privacy',
    terms: 'Terms',
    support: 'Support',
  },
} as const