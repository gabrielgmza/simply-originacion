export type RolUsuario = 
  | 'MASTER_PAYSUR'
  | 'GERENTE_GENERAL'
  | 'GERENTE_SUCURSAL'
  | 'VENDEDOR'
  | 'LIQUIDADOR'
  | 'COBRANZAS';

export interface Entidad {
  id: string;
  razonSocial: string;
  nombreFantasia: string;
  cuit: string;
  contacto: {
    email: string;
    telefono: string;
  };
  configuracion: {
    tasaInteresBase: number;
    gastosOtorgamiento: number;
    logoUrl?: string;
    colorPrimario: string;
    moduloAdelantos: boolean;
    moduloCuad: boolean;
    moduloPrivados: boolean;
  };
  fechaCreacion: any;
}

export interface UsuarioApp {
  uid: string;
  email: string;
  nombre: string;
  rol: RolUsuario;
  entidadId: string;
  sucursalId?: string;
  activo: boolean;
}

export type TipoCredito = 'ADELANTO' | 'CUAD' | 'PRIVADO';

export interface Operacion {
  id?: string;
  entidadId: string;
  vendedorId: string;
  tipo: TipoCredito;
  estado: 'PENDIENTE_DOCS' | 'EN_REVISION' | 'APROBADO' | 'LIQUIDADO' | 'RECHAZADO' | 'MORA' | 'FINALIZADO';
  cliente: {
    dni: string;
    cuil: string;
    nombre: string;
    scoreBcra?: number;
  };
  financiero: {
    montoSolicitado: number;
    cuotas: number;
    cft: number;
    fechaVencimiento: any;
  };
  legajo: {
    firmaUrl?: string;
    dniFrenteUrl?: string;
    dniDorsoUrl?: string;
    cadUrl?: string;
    contratoFinalPdf?: string;
  };
  seguridad: {
    ipAddress?: string;
    userAgent?: string;
    deviceFingerprint?: string;
    hashOperacion?: string;
  };
  fechaCreacion: any;
  fechaActualizacion: any;
}
