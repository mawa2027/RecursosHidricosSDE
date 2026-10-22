import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Filter, Layers, X, Maximize2, Minimize2, Building2, Droplets, Plus } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import DashboardLayout from '../components/layout/DashboardLayout';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Button } from '../components/ui/button';
import PlantDialog from '../components/plants/PlantDialog';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/ui/use-toast';
import { obrasAPI } from '../services/api';

// Colores por estado para los markers
const ESTADO_COLORS = {
  en_funcionamiento: '#22c55e',
  operativa: '#22c55e',
  en_construccion: '#f59e0b',
  en_reparacion: '#f97316',
  fuera_de_servicio: '#ef4444',
  planificada: '#6366f1',
};

const ESTADO_LABELS = {
  en_construccion: 'En construcción',
  en_funcionamiento: 'En funcionamiento',
  en_reparacion: 'En reparación',
  fuera_de_servicio: 'Fuera de servicio',
};

const ESTADOS_CON_AVANCE = ['en_reparacion', 'fuera_de_servicio', 'en_construccion'];

const TIPO_LABELS = {
  pozo: 'Pozo',
  planta: 'Planta',
};

const ARGENTINA_BOUNDS = [
  [-55.5, -73.6],
  [-21.8, -53.6],
];

const SANTIAGO_DEL_ESTERO_CENTER = [-27.7951, -64.2615];

const LOCATION_PICKER_ZOOM = 6;

function normalizeTipo(tipo) {
  const normalized = String(tipo || '').toLowerCase();
  if (normalized === 'planta_potabilizadora') return 'planta';
  return normalized;
}

// Crear icono SVG custom por color y tipo
function createColoredIcon(color, tipo = 'otro') {
  const normalizedType = normalizeTipo(tipo);
  const isPozo = normalizedType.includes('pozo');
  const iconColor = isPozo ? '#38bdf8' : '#22c55e';
  const iconSvg = isPozo
    ? `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16">
        <path d="M12 2C8.5 6 6 9.2 6 12.5A6 6 0 0 0 18 12.5C18 9.2 15.5 6 12 2Z" fill="#fff" stroke="${iconColor}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />
        <path d="M8.5 13.5c.6 1.4 1.8 2.2 3.5 2.2s2.9-.8 3.5-2.2" fill="none" stroke="${iconColor}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    `
    : `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16">
        <rect x="5" y="9" width="14" height="8" rx="1.5" fill="#fff" stroke="${iconColor}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />
        <path d="M7 9V6h7l3 3" fill="#fff" stroke="${iconColor}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />
        <path d="M8 12h8" fill="none" stroke="${iconColor}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />
        <path d="M8 15h8" fill="none" stroke="${iconColor}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    `;
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 36" width="30" height="44">
      <path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 24 12 24s12-15 12-24C24 5.4 18.6 0 12 0z" fill="${color}" stroke="#fff" stroke-width="1.5"/>
      <circle cx="12" cy="12" r="6.6" fill="rgba(255,255,255,0.22)" stroke="rgba(255,255,255,0.65)" stroke-width="0.8"/>
      <g transform="translate(4 4)">${iconSvg}</g>
    </svg>
  `;
  return L.divIcon({
    html: svg,
    className: '',
    iconSize: [30, 44],
    iconAnchor: [15, 44],
    popupAnchor: [0, -44],
  });
}

function LocationPickerEvents({ position, onPickLocation }) {
  const map = useMap();

  useEffect(() => {
    if (position && Number.isFinite(position[0]) && Number.isFinite(position[1])) {
      map.setView(position, 14, { animate: true });
    }
  }, [map, position?.[0], position?.[1]]);

  useMapEvents({
    click(event) {
      onPickLocation(event.latlng.lat, event.latlng.lng);
    },
  });

  return null;
}

function LocationSelectionMap({ position, onPickLocation }) {
  const hasPosition = position && Number.isFinite(position[0]) && Number.isFinite(position[1]);
  const markerPosition = hasPosition ? position : null;

  return (
    <MapContainer
      center={SANTIAGO_DEL_ESTERO_CENTER}
      zoom={LOCATION_PICKER_ZOOM}
      minZoom={4}
      maxBounds={ARGENTINA_BOUNDS}
      maxBoundsViscosity={1.0}
      scrollWheelZoom={true}
      className="h-[60vh] w-full"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <LocationPickerEvents position={markerPosition} onPickLocation={onPickLocation} />
      {hasPosition && (
        <Marker
          position={markerPosition}
          draggable
          icon={createColoredIcon('#0ea5e9', 'planta')}
          eventHandlers={{
            dragend: (event) => {
              const latlng = event.target.getLatLng();
              onPickLocation(latlng.lat, latlng.lng);
            },
          }}
        />
      )}
    </MapContainer>
  );
}

// Componente para ajustar la vista del mapa a los markers
function FitBounds({ obras }) {
  const map = useMap();
  useEffect(() => {
    if (obras.length > 0) {
      const bounds = obras
        .filter((o) => o.latitud && o.longitud)
        .map((o) => [parseFloat(o.latitud), parseFloat(o.longitud)]);
      if (bounds.length > 0) {
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
      }
    }
  }, [obras, map]);
  return null;
}

function ObrasMapContent({ obrasEnMapa, defaultCenter }) {
  return (
    <>
      <MapContainer
        center={defaultCenter}
        zoom={4}
        minZoom={4}
        maxBounds={ARGENTINA_BOUNDS}
        maxBoundsViscosity={1.0}
        className="h-full w-full"
        zoomControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/">OSM</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds obras={obrasEnMapa} />

        {obrasEnMapa.map((obra) => (
          <Marker
            key={obra.id}
            position={[parseFloat(obra.latitud), parseFloat(obra.longitud)]}
            icon={createColoredIcon(ESTADO_COLORS[obra.estado] || '#6b7280', obra.tipo)}
          >
            <Popup maxWidth={280}>
              <div className="min-w-[200px]">
                <h3 className="font-bold text-base text-gray-900 mb-1">{obra.nombre}</h3>
                <div className="space-y-1 text-sm">
                  <p className="flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-gray-400" />
                    <span className="text-gray-600">{TIPO_LABELS[obra.tipo] || obra.tipo}</span>
                  </p>
                  <p className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-gray-400" />
                    <span className="text-gray-600">{obra.localidad || obra.ubicacion || '—'}</span>
                  </p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span
                      className="inline-block w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: ESTADO_COLORS[obra.estado] }}
                    />
                    <span className="font-medium" style={{ color: ESTADO_COLORS[obra.estado] }}>
                      {ESTADO_LABELS[obra.estado] || obra.estado}
                    </span>
                  </div>
                  {ESTADOS_CON_AVANCE.includes(obra.estado) && obra.porcentaje_avance != null && (
                    <div className="mt-2">
                      <div className="flex justify-between text-xs text-gray-500 mb-0.5">
                        <span>Avance</span>
                        <span>{obra.porcentaje_avance}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-blue-500"
                          style={{ width: `${obra.porcentaje_avance}%` }}
                        />
                      </div>
                    </div>
                  )}
                  <a
                    href={`/plantas/${obra.id}`}
                    className="inline-block mt-2 text-xs text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Ver detalle →
                  </a>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur rounded-lg shadow-lg border border-gray-200 p-3 z-[1000]">
        <div className="space-y-1">
          {[
            ['en_funcionamiento', 'En funcionamiento'],
            ['en_construccion', 'En construcción'],
            ['en_reparacion', 'En reparación'],
            ['fuera_de_servicio', 'Fuera de servicio'],
          ].map(([key, label]) => (
            <div key={key} className="flex items-center gap-2 text-xs text-gray-600">
              <span
                className="w-3 h-3 rounded-full border border-white shadow-sm flex-shrink-0"
                style={{ backgroundColor: ESTADO_COLORS[key] }}
              />
              {label}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function ObrasMapPanel({ obrasEnMapa, defaultCenter, loading, onExpand, showExpandButton = true, panelClassName = '' }) {
  return (
    <div className={`flex-1 rounded-xl overflow-hidden border border-gray-200 shadow-sm relative ${panelClassName}`}>
      {loading ? (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50 z-10">
          <div className="text-center">
            <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-gray-500">Cargando mapa...</p>
          </div>
        </div>
      ) : (
        <>
          <ObrasMapContent obrasEnMapa={obrasEnMapa} defaultCenter={defaultCenter} />
          {showExpandButton && onExpand && (
            <button
              type="button"
              onClick={onExpand}
              className="absolute top-3 right-3 z-[1001] inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white/95 text-gray-700 shadow-lg transition hover:bg-white hover:text-blue-600"
              title="Expandir mapa"
              aria-label="Expandir mapa"
            >
              <Maximize2 className="h-4 w-4" />
            </button>
          )}
        </>
      )}
    </div>
  );
}

export default function MapPage() {
  const { permisos } = useAuth();
  const { toast } = useToast();
  const [obras, setObras] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterEstado, setFilterEstado] = useState('all');
  const [filterTipo, setFilterTipo] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [mapExpanded, setMapExpanded] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [locationPickerOpen, setLocationPickerOpen] = useState(false);
  const [draftCoordinates, setDraftCoordinates] = useState(null);

  useEffect(() => {
    loadObras();
  }, []);

  const loadObras = async () => {
    try {
      setLoading(true);
      const data = await obrasAPI.list();
      setObras(data.obras || data);
    } catch (err) {
      console.error('Error cargando obras:', err);
    } finally {
      setLoading(false);
    }
  };

  // Obras con coordenadas y filtros aplicados
  const obrasEnMapa = useMemo(() => {
    return obras.filter((o) => {
      if (!o.latitud || !o.longitud) return false;
      if (filterEstado !== 'all' && o.estado !== filterEstado) return false;
      if (filterTipo !== 'all' && normalizeTipo(o.tipo) !== filterTipo) return false;
      return true;
    });
  }, [obras, filterEstado, filterTipo]);

  const obrasSinCoords = obras.filter((o) => !o.latitud || !o.longitud).length;

  // Contar por estado
  const conteoEstados = useMemo(() => {
    const c = {};
    obras.filter((o) => o.latitud && o.longitud).forEach((o) => {
      c[o.estado] = (c[o.estado] || 0) + 1;
    });
    return c;
  }, [obras]);

  // Centro default: Argentina
  const defaultCenter = SANTIAGO_DEL_ESTERO_CENTER;

  const handleOpenNewObra = () => {
    setDraftCoordinates(null);
    setLocationPickerOpen(true);
  };

  const handlePickLocation = (lat, lng) => {
    setDraftCoordinates({ lat, lng });
  };

  const handleConfirmLocation = () => {
    if (!draftCoordinates) return;
    setLocationPickerOpen(false);
    setCreateDialogOpen(true);
  };

  const handleSaveObra = async (obraData) => {
    try {
      await obrasAPI.create(obraData);
      await loadObras();
      setCreateDialogOpen(false);
      setDraftCoordinates(null);
      toast({
        title: '¡Obra creada!',
        description: 'La nueva obra se agregó correctamente.',
      });
    } catch (error) {
      toast({
        title: 'Error al crear la obra',
        description: error.message,
        variant: 'destructive',
      });
      throw error;
    }
  };

  return (
    <DashboardLayout>
      <div className="h-[calc(100vh-4rem)] flex flex-col">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between px-1 pb-4 flex-shrink-0"
        >
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <MapPin className="w-6 h-6 text-blue-600" /> Mapa de Obras Hídricas
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {obrasEnMapa.length} obra{obrasEnMapa.length !== 1 ? 's' : ''} en el mapa
              {obrasSinCoords > 0 && <span className="text-amber-600 ml-2">• {obrasSinCoords} sin coordenadas</span>}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {permisos?.crearObra && (
              <Button
                onClick={handleOpenNewObra}
                className="bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-700 hover:to-teal-700"
              >
                <Plus className="mr-2 h-4 w-4" />
                Nueva obra
              </Button>
            )}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                showFilters ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Filter className="w-4 h-4" />
              Filtros
              {(filterEstado !== 'all' || filterTipo !== 'all') && (
                <span className="w-2 h-2 rounded-full bg-blue-600" />
              )}
            </button>
          </div>
        </motion.div>

        {/* Filtros */}
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex flex-wrap gap-3 px-1 pb-4 flex-shrink-0"
          >
            <div>
              <label className="block text-xs text-gray-500 mb-1">Estado</label>
              <select
                value={filterEstado}
                onChange={(e) => setFilterEstado(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              >
                <option value="all">Todos los estados</option>
                {Object.entries(ESTADO_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v} ({conteoEstados[k] || 0})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Tipo</label>
              <select
                value={filterTipo}
                onChange={(e) => setFilterTipo(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              >
                <option value="all">Todos los tipos</option>
                {Object.entries(TIPO_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            {(filterEstado !== 'all' || filterTipo !== 'all') && (
              <button
                onClick={() => { setFilterEstado('all'); setFilterTipo('all'); }}
                className="self-end flex items-center gap-1 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <X className="w-3.5 h-3.5" /> Limpiar
              </button>
            )}
          </motion.div>
        )}

        {/* Mapa */}
        <ObrasMapPanel
          obrasEnMapa={obrasEnMapa}
          defaultCenter={defaultCenter}
          loading={loading}
          onExpand={() => setMapExpanded(true)}
        />
      </div>

      <Dialog open={mapExpanded} onOpenChange={setMapExpanded}>
        <DialogContent className="max-w-7xl w-[95vw] h-[90vh] overflow-hidden p-0 sm:rounded-2xl">
          <div className="flex h-full min-h-0 flex-col">
            <DialogHeader className="px-6 pt-6 pb-4 pr-14 border-b border-gray-200 text-left">
              <DialogTitle className="flex items-center gap-2 text-xl font-semibold text-gray-900">
                <MapPin className="h-5 w-5 text-blue-600" />
                Mapa de Obras Hídricas
              </DialogTitle>
              <p className="text-sm text-gray-500">
                Vista ampliada para explorar el mapa con más espacio.
              </p>
            </DialogHeader>
            <div className="relative min-h-0 flex-1 p-4">
              <ObrasMapPanel
                obrasEnMapa={obrasEnMapa}
                defaultCenter={defaultCenter}
                loading={loading}
                showExpandButton={false}
                panelClassName="h-full"
              />
              {!loading && (
                <button
                  type="button"
                  onClick={() => setMapExpanded(false)}
                  className="absolute top-7 right-7 z-[1001] inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white/95 text-gray-700 shadow-lg transition hover:bg-white hover:text-blue-600"
                  title="Volver a tamaño normal"
                  aria-label="Volver a tamaño normal"
                >
                  <Minimize2 className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={locationPickerOpen} onOpenChange={setLocationPickerOpen}>
        <DialogContent className="max-w-6xl w-[95vw] max-h-[90vh] overflow-hidden p-0 sm:rounded-2xl">
          <div className="flex h-full min-h-0 flex-col">
            <DialogHeader className="px-6 pt-6 pb-4 pr-14 border-b border-gray-200 text-left">
              <DialogTitle className="flex items-center gap-2 text-xl font-semibold text-gray-900">
                <Plus className="h-5 w-5 text-blue-600" />
                Nueva obra
              </DialogTitle>
              <p className="text-sm text-gray-500">
                Primero marcá la ubicación en el mapa. Después se abrirá el formulario con el pin ya colocado.
              </p>
            </DialogHeader>
            <div className="flex min-h-0 flex-1 flex-col gap-4 p-4">
              <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
                <LocationSelectionMap position={draftCoordinates ? [draftCoordinates.lat, draftCoordinates.lng] : [null, null]} onPickLocation={handlePickLocation} />
                <div className="pointer-events-none absolute left-4 top-4 z-[1000] rounded-lg bg-white/95 px-3 py-2 text-sm text-gray-700 shadow-lg backdrop-blur">
                  Hacé clic en el mapa para fijar la ubicación.
                  {draftCoordinates && (
                    <div className="mt-1 text-xs text-gray-500">
                      {draftCoordinates.lat.toFixed(5)}, {draftCoordinates.lng.toFixed(5)}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 border-t border-gray-200 pt-4">
                <Button variant="outline" onClick={() => setLocationPickerOpen(false)}>
                  Cancelar
                </Button>
                <Button
                  onClick={handleConfirmLocation}
                  disabled={!draftCoordinates}
                  className="bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-700 hover:to-teal-700"
                >
                  Continuar
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <PlantDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        plant={null}
        initialCoordinates={draftCoordinates}
        onSave={handleSaveObra}
      />
    </DashboardLayout>
  );
}
