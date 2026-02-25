export const ESQUEMA_ROLES = {
  GERENTE_GENERAL: {
    verTodo: true,
    liquidar: true,
    editarTasas: true,
    gestionarUsuarios: true,
    sucursalLimitada: false
  },
  SUPERVISOR_SUCURSAL: {
    verTodo: false, // Solo ve su sucursal
    liquidar: true,
    editarTasas: false,
    gestionarUsuarios: true,
    sucursalLimitada: true
  },
  VENDEDOR: {
    verTodo: false,
    liquidar: false,
    editarTasas: false,
    gestionarUsuarios: false,
    sucursalLimitada: true
  }
};
