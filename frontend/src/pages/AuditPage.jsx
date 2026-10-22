import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Shield,
  Search,
  ChevronLeft,
  ChevronRight,
  X,
  Activity,
  Clock,
  Globe,
  Eye,
  FileText,
} from 'lucide-react';
import DashboardLayout from '../components/layout/DashboardLayout';
import { useAuth } from '../contexts/AuthContext';
import { auditoriaAPI } from '../services/api';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../components/ui/dialog';

const ENTIDAD_LABELS = {
  obra: 'Obra',
  archivo: 'Archivo',
  usuario: 'Usuario',
};

const ACCION_COLORS = {
  CREAR_OBRA: 'bg-green-100 text-green-700',
  EDITAR_OBRA: 'bg-blue-100 text-blue-700',
  ELIMINAR_OBRA: 'bg-red-100 text-red-700',
  SUBIR_ARCHIVO: 'bg-indigo-100 text-indigo-700',
  ELIMINAR_ARCHIVO: 'bg-red-100 text-red-700',
  CREAR_USUARIO: 'bg-emerald-100 text-emerald-700',
  CAMBIAR_ROL: 'bg-purple-100 text-purple-700',
  TOGGLE_ACTIVO: 'bg-yellow-100 text-yellow-700',
  RESETEAR_CONTRASENA: 'bg-orange-100 text-orange-700',
  CAMBIAR_CONTRASENA: 'bg-amber-100 text-amber-700',
  LOGIN: 'bg-cyan-100 text-cyan-700',
};

const ROL_COLORS = {
  administrador: 'text-red-600',
  presidente: 'text-purple-600',
  inspector: 'text-blue-600',
  dpto_construccion: 'text-orange-600',
  dpto_estudios: 'text-cyan-600',
  dpto_conservacion: 'text-green-600',
};

export default function AuditPage() {
  const { permisos } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const highlightId = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const value = params.get('highlight');
    return value ? Number(value) : null;
  }, [location.search]);

  const [registros, setRegistros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');
  const [filterEntidad, setFilterEntidad] = useState('all');
  const [selectedRegistro, setSelectedRegistro] = useState(null);

  // Redirect si no tiene permiso
  useEffect(() => {
    if (permisos && !permisos.verAuditoria) {
      navigate('/dashboard');
    }
  }, [permisos, navigate]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setSearchDebounced(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  // Reset page on filter change
  useEffect(() => {
    setPage(1);
  }, [searchDebounced, filterEntidad]);

  // Cargar datos
  useEffect(() => {
    loadAuditoria();
  }, [page, searchDebounced, filterEntidad]);

  useEffect(() => {
    if (!highlightId || loading || registros.length === 0) return;

    const row = document.getElementById(`audit-row-${highlightId}`);
    if (row) {
      row.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [highlightId, loading, registros]);

  const loadAuditoria = async () => {
    try {
      setLoading(true);
      const params = { page, limit: 20 };
      if (searchDebounced) params.search = searchDebounced;
      if (filterEntidad !== 'all') params.entidad = filterEntidad;

      const data = await auditoriaAPI.list(params);
      setRegistros(data.registros);
      setTotalPages(data.totalPages);
      setTotal(data.total);
    } catch (err) {
      console.error('Error cargando auditoría:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatFecha = (fecha) => {
    const d = new Date(fecha);
    return d.toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const parseContexto = (contexto) => {
    try {
      return typeof contexto === 'string' ? JSON.parse(contexto) : contexto;
    } catch {
      return null;
    }
  };

  const formatValue = (value) => {
    if (value === null || value === undefined || value === '') return '—';
    if (typeof value === 'object') {
      try {
        return JSON.stringify(value, null, 2);
      } catch {
        return '[Objeto no serializable]';
      }
    }
    return String(value);
  };

  const safeStringify = (value) => {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return 'No fue posible mostrar el detalle de este valor.';
    }
  };

  const getDetallePrincipal = (reg, ctx) => {
    if (!ctx) return 'Sin información adicional disponible.';

    if (Array.isArray(ctx.cambios) && ctx.cambios.length > 0) {
      return `Se detectaron ${ctx.cambios.length} cambio${ctx.cambios.length !== 1 ? 's' : ''} en este registro.`;
    }

    if (ctx.resumen?.estado || ctx.resumen?.porcentaje_avance !== undefined) {
      const partes = [];
      if (ctx.resumen?.estado) partes.push(`estado: ${ctx.resumen.estado}`);
      if (ctx.resumen?.porcentaje_avance !== undefined) partes.push(`avance: ${ctx.resumen.porcentaje_avance}%`);
      return `Actualización con ${partes.join(' y ')}.`;
    }

    if (ctx.nombre || ctx.correo || ctx.filename || ctx.body?.nombre) {
      return [ctx.nombre, ctx.correo, ctx.filename, ctx.body?.nombre].find(Boolean);
    }

    return reg.titulo?.replace(/_/g, ' ') || 'Cambio registrado';
  };

  const selectedContext = selectedRegistro ? parseContexto(selectedRegistro.contexto) : null;
  const selectedUserName = selectedRegistro
    ? `${selectedRegistro.usuario_nombre || ''} ${selectedRegistro.usuario_apellido || ''}`.trim()
    : '';
  const selectedRole = selectedRegistro?.usuario_rol?.replace(/_/g, ' ');

  const selectedDetails = useMemo(() => {
    if (!selectedRegistro) return null;

    try {
      const ctx = parseContexto(selectedRegistro.contexto) || {};
      const cambiosRaw = Array.isArray(ctx.cambios) ? ctx.cambios : [];
      const cambios = cambiosRaw.slice(0, 5).map((cambio, index) => ({
        key: `${index}-${String(cambio?.campo ?? 'campo')}`,
        campo: formatValue(cambio?.campo),
        anterior: formatValue(cambio?.anterior),
        nuevo: formatValue(cambio?.nuevo),
      }));

      let resumen = 'Cambio registrado.';
      if (cambiosRaw.length > 0) {
        resumen = `Se detectaron ${cambiosRaw.length} cambio${cambiosRaw.length !== 1 ? 's' : ''}.`;
      } else if (ctx.resumen?.estado || ctx.resumen?.porcentaje_avance !== undefined) {
        const partes = [];
        if (ctx.resumen?.estado) partes.push(`estado: ${formatValue(ctx.resumen.estado)}`);
        if (ctx.resumen?.porcentaje_avance !== undefined) partes.push(`avance: ${formatValue(ctx.resumen.porcentaje_avance)}%`);
        resumen = `Actualización con ${partes.join(' y ')}.`;
      } else if (ctx.nombre || ctx.correo || ctx.filename || ctx.body?.nombre) {
        resumen = [ctx.nombre, ctx.correo, ctx.filename, ctx.body?.nombre].find(Boolean) || resumen;
      }

      return {
        titulo: selectedRegistro.titulo?.replace(/_/g, ' ') || 'Cambio registrado',
        resumen,
        usuario: selectedUserName || '—',
        rol: selectedRole || '—',
        entidad: ENTIDAD_LABELS[selectedRegistro.entidad] || selectedRegistro.entidad || '—',
        entidadId: formatValue(selectedRegistro.entidad_id),
        fecha: formatFecha(selectedRegistro.fecha),
        ip: selectedRegistro.ip_address || '—',
        cambios,
        totalCambios: cambiosRaw.length,
      };
    } catch {
      return {
        titulo: selectedRegistro.titulo?.replace(/_/g, ' ') || 'Cambio registrado',
        resumen: 'No fue posible mostrar todos los detalles de este registro.',
        usuario: selectedUserName || '—',
        rol: selectedRole || '—',
        entidad: ENTIDAD_LABELS[selectedRegistro.entidad] || selectedRegistro.entidad || '—',
        entidadId: formatValue(selectedRegistro.entidad_id),
        fecha: formatFecha(selectedRegistro.fecha),
        ip: selectedRegistro.ip_address || '—',
        cambios: [],
        totalCambios: 0,
      };
    }
  }, [selectedRegistro]);

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        >
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2 dark:text-gray-100">
              <Shield className="w-6 h-6 text-blue-600 dark:text-cyan-400" /> Registro de Auditoría
            </h1>
            <p className="text-sm text-gray-500 mt-1 dark:text-gray-400">
              {total} registro{total !== 1 ? 's' : ''} de actividad del sistema
            </p>
          </div>
        </motion.div>

        {/* Filtros */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex flex-wrap gap-3"
        >
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por acción o usuario..."
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none dark:bg-slate-900 dark:border-slate-700 dark:text-gray-100 dark:placeholder:text-gray-500"
            />
          </div>
          <select
            value={filterEntidad}
            onChange={(e) => setFilterEntidad(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none dark:bg-slate-900 dark:border-slate-700 dark:text-gray-100"
          >
            <option value="all">Todas las entidades</option>
            <option value="obra">Obras</option>
            <option value="archivo">Archivos</option>
            <option value="usuario">Usuarios</option>
          </select>
          {(search || filterEntidad !== 'all') && (
            <button
              onClick={() => { setSearch(''); setFilterEntidad('all'); }}
              className="flex items-center gap-1 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors dark:text-red-300 dark:hover:bg-red-950/30"
            >
              <X className="w-3.5 h-3.5" /> Limpiar
            </button>
          )}
        </motion.div>

        {/* Tabla */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden dark:bg-slate-900 dark:border-slate-800"
        >
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
            </div>
          ) : registros.length === 0 ? (
            <div className="text-center py-20 text-gray-500 dark:text-gray-400">
              <Activity className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
              <p className="font-medium">No se encontraron registros</p>
              <p className="text-sm mt-1">Probá con otros filtros</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/60 dark:border-slate-800 dark:bg-slate-800/70">
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3 dark:text-gray-300">Fecha</th>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3 dark:text-gray-300">Usuario</th>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3 dark:text-gray-300">Acción</th>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3 dark:text-gray-300">Entidad</th>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3 dark:text-gray-300">Detalles</th>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3 dark:text-gray-300">IP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-slate-800">
                  {registros.map((reg) => {
                    const ctx = parseContexto(reg.contexto);
                    const isHighlighted = highlightId === reg.id;
                    return (
                      <tr
                        id={`audit-row-${reg.id}`}
                        key={reg.id}
                        onClick={() => setSelectedRegistro(reg)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setSelectedRegistro(reg);
                          }
                        }}
                        className={`cursor-pointer transition-colors ${isHighlighted ? 'bg-cyan-50 ring-1 ring-cyan-200 dark:bg-cyan-950/30 dark:ring-cyan-900' : 'hover:bg-gray-50/50 dark:hover:bg-slate-800/80'}`}
                      >
                        <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap dark:text-gray-300">
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
                            {formatFecha(reg.fecha)}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-xs font-medium text-gray-600 dark:bg-slate-700 dark:text-gray-200">
                              {reg.usuario_nombre?.[0]}{reg.usuario_apellido?.[0]}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                {reg.usuario_nombre} {reg.usuario_apellido}
                              </p>
                              <p className={`text-xs ${ROL_COLORS[reg.usuario_rol] || 'text-gray-500'} dark:!text-cyan-300`}>
                                {reg.usuario_rol?.replace('_', ' ')}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${ACCION_COLORS[reg.titulo] || 'bg-gray-100 text-gray-600'} dark:border dark:border-slate-700 dark:bg-slate-800 dark:text-gray-100`}>
                            {reg.titulo?.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                          {ENTIDAD_LABELS[reg.entidad] || reg.entidad}
                          {reg.entidad_id && <span className="text-gray-400 ml-1 dark:text-gray-500">#{reg.entidad_id}</span>}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500 max-w-[300px] align-top dark:text-gray-300">
                          <div className="flex flex-col items-start gap-2 max-w-full">
                            <div className="space-y-1 max-w-full">
                              {reg.titulo === 'ACTUALIZAR_OBRA' && ctx?.cambios && Array.isArray(ctx.cambios) && ctx.cambios.length > 0 ? (
                                <>
                                  {ctx.cambios.slice(0, 2).map((cambio, i) => (
                                    <div key={i} className="text-xs leading-4 break-words">
                                      <span className="font-medium text-gray-700 dark:text-gray-200">{cambio.campo}:</span>
                                      <span className="text-gray-500 dark:text-gray-400"> {cambio.anterior} → {cambio.nuevo}</span>
                                    </div>
                                  ))}
                                  {ctx.cambios.length > 2 && (
                                    <div className="text-xs text-gray-400 dark:text-gray-500">+{ctx.cambios.length - 2} más</div>
                                  )}
                                </>
                              ) : (
                                <span className="max-w-full break-words leading-5 text-gray-600 dark:text-gray-300">
                                  {ctx?.nombre || ctx?.correo || ctx?.filename || '—'}
                                </span>
                              )}
                            </div>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedRegistro(reg);
                              }}
                                className="inline-flex shrink-0 items-center gap-1 rounded-md border border-cyan-200 bg-cyan-50 px-2 py-1 text-xs font-medium text-cyan-700 hover:bg-cyan-100 dark:border-cyan-900/60 dark:bg-cyan-950/30 dark:text-cyan-200 dark:hover:bg-cyan-900/40"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              Ver más
                            </button>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap dark:text-gray-500">
                          <div className="flex items-center gap-1">
                            <Globe className="w-3 h-3" />
                            {reg.ip_address || '—'}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Paginación */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50/40 dark:border-slate-800 dark:bg-slate-900/70">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Página {page} de {totalPages} ({total} registros)
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-1.5 rounded-lg hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors dark:hover:bg-slate-800"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (page <= 3) {
                    pageNum = i + 1;
                  } else if (page >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = page - 2 + i;
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                        page === pageNum ? 'bg-blue-600 text-white' : 'hover:bg-gray-200 text-gray-600 dark:text-gray-300 dark:hover:bg-slate-800'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-1.5 rounded-lg hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors dark:hover:bg-slate-800"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </motion.div>

        <Dialog open={Boolean(selectedRegistro)} onOpenChange={(open) => !open && setSelectedRegistro(null)}>
          <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto border-cyan-100 dark:border-slate-700 dark:bg-slate-900">
            {selectedRegistro && (
              <>
                <DialogHeader className="text-left">
                  <DialogTitle className="flex items-center gap-2 text-2xl text-gray-900 dark:text-gray-100">
                    <Shield className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
                    Detalle de auditoría
                  </DialogTitle>
                  <DialogDescription className="text-gray-600 dark:text-gray-400">
                    Resumen simple del cambio para revisar rápido qué pasó.
                  </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl border border-cyan-100 bg-cyan-50/60 p-4 dark:border-cyan-900/50 dark:bg-cyan-950/25">
                    <p className="text-xs font-semibold uppercase tracking-wide text-cyan-700 dark:text-cyan-300">Acción</p>
                    <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-gray-100">{selectedDetails?.titulo || '—'}</p>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{selectedDetails?.resumen || '—'}</p>
                  </div>

                  <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Usuario</p>
                    <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-gray-100">{selectedDetails?.usuario || '—'}</p>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{selectedDetails?.rol || '—'}</p>
                  </div>

                  <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Entidad</p>
                    <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-gray-100">
                      {selectedDetails?.entidad || '—'}
                    </p>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">ID: {selectedDetails?.entidadId || '—'}</p>
                  </div>

                  <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Fecha e IP</p>
                    <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-gray-100">{selectedDetails?.fecha || '—'}</p>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{selectedDetails?.ip || '—'}</p>
                  </div>
                </div>

                {selectedDetails?.cambios?.length > 0 && (
                  <div className="rounded-2xl border border-cyan-100 bg-cyan-50/50 p-4 dark:border-cyan-900/50 dark:bg-cyan-950/20">
                    <div className="mb-3 flex items-center gap-2">
                      <FileText className="h-4 w-4 text-cyan-700 dark:text-cyan-300" />
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Cambios detectados</p>
                    </div>
                    <div className="space-y-3">
                      {selectedDetails.cambios.map((cambio, index) => (
                        <div key={cambio.key} className="rounded-xl border border-cyan-100 bg-white p-3 dark:border-slate-700 dark:bg-slate-800">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="font-semibold text-gray-900 dark:text-gray-100">{cambio.campo}</p>
                            <span className="text-xs text-gray-400 dark:text-gray-500">Cambio {index + 1}</span>
                          </div>
                          <div className="mt-2 grid gap-2 md:grid-cols-2">
                            <div className="rounded-lg bg-red-50 p-2 dark:bg-red-950/30">
                              <p className="text-xs font-semibold uppercase tracking-wide text-red-700 dark:text-red-300">Antes</p>
                              <p className="mt-1 whitespace-pre-wrap break-words text-sm text-gray-700 dark:text-gray-200">{cambio.anterior}</p>
                            </div>
                            <div className="rounded-lg bg-emerald-50 p-2 dark:bg-emerald-950/30">
                              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">Después</p>
                              <p className="mt-1 whitespace-pre-wrap break-words text-sm text-gray-700 dark:text-gray-200">{cambio.nuevo}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                      {selectedDetails.totalCambios > selectedDetails.cambios.length && (
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Se muestran los primeros {selectedDetails.cambios.length} cambios de {selectedDetails.totalCambios}.
                        </p>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedRegistro(null)}
                    className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-slate-700 dark:text-gray-200 dark:hover:bg-slate-800"
                  >
                    Cerrar
                  </button>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
