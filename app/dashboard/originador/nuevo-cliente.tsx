// Fragmento de los campos requeridos para Legajo Completo
const camposLegajo = [
  { id: 'nombre1', label: 'Primer Nombre', required: true },
  { id: 'nombre2', label: 'Segundo Nombre', required: false },
  { id: 'apellidoPaterno', label: 'Apellido Paterno', required: true },
  { id: 'apellidoMaterno', label: 'Apellido Materno', required: true },
  { id: 'dni', label: 'DNI / CUIL', required: true }, // Validación unique en backend
  { id: 'cbu', label: 'CBU / Alias', required: true },
  { id: 'banco', label: 'Banco del Cliente', required: true },
  { id: 'telLaboral', label: 'Teléfono Laboral', required: true },
  { id: 'direccion', label: 'Calle y Número', required: true },
  { id: 'cp', label: 'Código Postal', required: true },
];
