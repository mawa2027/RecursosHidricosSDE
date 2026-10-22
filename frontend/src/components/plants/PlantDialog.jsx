import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Search } from 'lucide-react';
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

const ARGENTINA_BOUNDS = [
  [-55.5, -73.6],
  [-21.8, -53.6],
];

const SANTIAGO_DEL_ESTERO_CENTER = [-27.7951, -64.2615];
const LOCATION_PICKER_ZOOM = 11;

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const defaultForm = {
  tipo: 'pozo',
  nombre: '',
  ubicacion: '',
  empresa: '',
  responsable: '',
  estado: 'en_construccion',
  anio: new Date().getFullYear(),
  latitud: '',
  longitud: '',
  descripcion: '',
  porcentaje_avance: 0,
  localidad: '',
  // Campos específicos de pozo
  profundidad: '',
  caudal: '',
  tipo_bomba: '',
  altura_tanque: '',
  capacidad_tanque: '',
  diametro_pozo: '',
  contaminantes: '',
  // Campos específicos de planta
  tratamiento: '',
  capacidad: '',
  fuente: '',
  volumen_represa: '',
};

const ESTADOS_CON_AVANCE = ['en_reparacion', 'fuera_de_servicio', 'en_construccion'];

const parseNumberInput = (value) => (value === '' ? '' : Number(value));

function buildAddressQuery(ubicacion, localidad) {
  return [ubicacion, localidad, 'Argentina']
    .map((value) => String(value || '').trim())
    .filter(Boolean)
    .join(', ');
}

function formatLocalidad(address = {}) {
  return (
    address.city ||
    address.town ||
    address.village ||
    address.municipality ||
    address.suburb ||
    address.county ||
    ''
  );
}

function formatStreetAddress(address = {}, fallback = '') {
  const street = [address.road, address.house_number].filter(Boolean).join(' ').trim();
  const locality = formatLocalidad(address);
  if (street && locality) return `${street}, ${locality}`;
  if (street) return street;
  return fallback;
}

async function searchArgentinaAddresses(ubicacion, localidad) {
  const query = buildAddressQuery(ubicacion, localidad);

  if (query.length < 4) {
    return [];
  }

  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&addressdetails=1&countrycodes=ar&q=${encodeURIComponent(query)}`,
    {
      headers: {
        Accept: 'application/json',
      },
    }
  );

  if (!response.ok) {
    throw new Error('No se pudo consultar el servicio de autocompletado.');
  }

  const results = await response.json();
  return Array.isArray(results)
    ? results.map((result) => ({
        label: result.display_name,
        ubicacion: formatStreetAddress(result.address, result.display_name),
        localidad: formatLocalidad(result.address),
        latitud: Number(result.lat),
        longitud: Number(result.lon),
      }))
    : [];
}

async function geocodeArgentinaAddress(formData) {
  const query = buildAddressQuery(formData.ubicacion, formData.localidad);

  if (!formData.ubicacion?.trim()) {
    throw new Error('Escribí una calle y altura para buscar la ubicación.');
  }

  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&addressdetails=1&countrycodes=ar&q=${encodeURIComponent(query)}`,
    {
      headers: {
        Accept: 'application/json',
      },
    }
  );

  if (!response.ok) {
    throw new Error('No se pudo consultar el servicio de geocodificación.');
  }

  const results = await response.json();
  if (!Array.isArray(results) || results.length === 0) {
    return null;
  }

  return {
    latitud: Number(results[0].lat),
    longitud: Number(results[0].lon),
    direccion: results[0].display_name,
    ubicacion: formatStreetAddress(results[0].address, results[0].display_name),
    localidad: formatLocalidad(results[0].address),
  };
}

async function reverseGeocodeArgentina(latitud, longitud) {
  const response = await fetch(
    `https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&countrycodes=ar&lat=${encodeURIComponent(latitud)}&lon=${encodeURIComponent(longitud)}`,
    {
      headers: {
        Accept: 'application/json',
      },
    }
  );

  if (!response.ok) {
    throw new Error('No se pudo consultar la ubicación desde el mapa.');
  }

  const result = await response.json();
  if (!result || !result.display_name) {
    return null;
  }

  return {
    direccion: result.display_name,
    ubicacion: formatStreetAddress(result.address, result.display_name),
    localidad: formatLocalidad(result.address),
  };
}

function LocationPickerEvents({ position, onPickLocation }) {
  const map = useMap();

  useEffect(() => {
    if (Number.isFinite(position[0]) && Number.isFinite(position[1])) {
      map.setView(position, 14, { animate: true });
    }
  }, [map, position[0], position[1]]);

  useMapEvents({
    click(event) {
      onPickLocation(event.latlng.lat, event.latlng.lng);
    },
  });

  return null;
}

function LocationPickerMap({ position, onPickLocation }) {
  const hasPosition = Number.isFinite(position[0]) && Number.isFinite(position[1]);
  const markerPosition = hasPosition ? position : SANTIAGO_DEL_ESTERO_CENTER;

  return (
    <MapContainer
      center={markerPosition}
      zoom={hasPosition ? 14 : LOCATION_PICKER_ZOOM}
      minZoom={4}
      maxBounds={ARGENTINA_BOUNDS}
      maxBoundsViscosity={1.0}
      scrollWheelZoom={true}
      className="h-80 w-full"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <LocationPickerEvents position={markerPosition} onPickLocation={onPickLocation} />
      <Marker
        position={markerPosition}
        draggable
        eventHandlers={{
          dragend: (event) => {
            const latlng = event.target.getLatLng();
            onPickLocation(latlng.lat, latlng.lng);
          },
        }}
      />
    </MapContainer>
  );
}

const PlantDialog = ({ open, onOpenChange, plant, onSave, initialCoordinates = null }) => {
  const [formData, setFormData] = useState(defaultForm);
  const [saving, setSaving] = useState(false);
  const [searchingLocation, setSearchingLocation] = useState(false);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [addressSuggestions, setAddressSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const mostrarCampoAvance = ESTADOS_CON_AVANCE.includes(formData.estado);
  const { toast } = useToast();

  useEffect(() => {
    if (plant) {
      setFormData({
        ...defaultForm,
        ...plant,
        latitud: plant.latitud ?? defaultForm.latitud,
        longitud: plant.longitud ?? defaultForm.longitud,
        // Datos específicos que vienen del sub-objeto
        profundidad: plant.pozo?.profundidad || plant.profundidad || '',
        caudal: plant.pozo?.caudal || plant.caudal || '',
        tipo_bomba: plant.pozo?.tipo_bomba || plant.tipo_bomba || '',
        contaminantes: plant.pozo?.contaminantes || plant.contaminantes || '',
        altura_tanque: plant.pozo?.altura_tanque || plant.altura_tanque || '',
        capacidad_tanque: plant.pozo?.capacidad_tanque || plant.capacidad_tanque || '',
        diametro_pozo: plant.pozo?.diametro_pozo || plant.diametro_pozo || '',
        tratamiento: plant.planta?.tratamiento || plant.tratamiento || '',
        capacidad: plant.planta?.capacidad || plant.capacidad || '',
        fuente: plant.planta?.fuente || plant.fuente || '',
        volumen_represa: plant.planta?.volumen_represa || plant.volumen_represa || '',
      });
    } else {
      setFormData({
        ...defaultForm,
        latitud: Number.isFinite(initialCoordinates?.lat) ? initialCoordinates.lat : defaultForm.latitud,
        longitud: Number.isFinite(initialCoordinates?.lng) ? initialCoordinates.lng : defaultForm.longitud,
      });
    }
  }, [plant, open, initialCoordinates]);

  useEffect(() => {
    if (!open || plant || !Number.isFinite(initialCoordinates?.lat) || !Number.isFinite(initialCoordinates?.lng)) {
      return;
    }

    let cancelled = false;

    const applyCoordinates = async () => {
      try {
        const result = await reverseGeocodeArgentina(initialCoordinates.lat, initialCoordinates.lng);
        if (cancelled) return;

        if (result) {
          setFormData((current) => ({
            ...current,
            latitud: initialCoordinates.lat,
            longitud: initialCoordinates.lng,
            ubicacion: result.ubicacion || current.ubicacion,
            localidad: result.localidad || current.localidad,
          }));
        }
      } catch (error) {
        if (cancelled) return;
        setFormData((current) => ({
          ...current,
          latitud: initialCoordinates.lat,
          longitud: initialCoordinates.lng,
        }));
      }
    };

    applyCoordinates();

    return () => {
      cancelled = true;
    };
  }, [open, plant, initialCoordinates]);

  useEffect(() => {
    if (!open) {
      setAddressSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const query = buildAddressQuery(formData.ubicacion, formData.localidad);
    if (query.length < 4) {
      setAddressSuggestions([]);
      return;
    }

    let cancelled = false;
    const timeoutId = setTimeout(async () => {
      try {
        setSuggestionsLoading(true);
        const suggestions = await searchArgentinaAddresses(formData.ubicacion, formData.localidad);
        if (!cancelled) {
          setAddressSuggestions(suggestions);
        }
      } catch (error) {
        if (!cancelled) {
          setAddressSuggestions([]);
        }
      } finally {
        if (!cancelled) {
          setSuggestionsLoading(false);
        }
      }
    }, 350);

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [formData.ubicacion, formData.localidad, open]);

  const updateCoordinatesFromMap = async (latitud, longitud) => {
    setSearchingLocation(true);
    setFormData((current) => ({
      ...current,
      latitud,
      longitud,
    }));

    try {
      const result = await reverseGeocodeArgentina(latitud, longitud);
      if (result) {
        setFormData((current) => ({
          ...current,
          latitud,
          longitud,
          ubicacion: result.ubicacion || current.ubicacion,
          localidad: result.localidad || current.localidad,
        }));
        setAddressSuggestions([]);
        setShowSuggestions(false);
        toast({
          title: 'Ubicación actualizada',
          description: result.direccion,
        });
      }
    } catch (error) {
      toast({
        title: 'Ubicación actualizada',
        description: 'Se guardaron las coordenadas del mapa.',
      });
    } finally {
      setSearchingLocation(false);
    }
  };

  const handleSelectSuggestion = (suggestion) => {
    setFormData((current) => ({
      ...current,
      ubicacion: suggestion.ubicacion,
      localidad: suggestion.localidad || current.localidad,
      latitud: suggestion.latitud,
      longitud: suggestion.longitud,
    }));
    setAddressSuggestions([]);
    setShowSuggestions(false);
    toast({
      title: 'Dirección seleccionada',
      description: suggestion.label,
    });
  };

  const handleSearchLocation = async () => {
    try {
      setSearchingLocation(true);
      const result = await geocodeArgentinaAddress(formData);

      if (!result) {
        toast({
          title: 'No se encontró la dirección',
          description: 'Probá agregando más datos o completá latitud y longitud manualmente.',
          variant: 'destructive',
        });
        return;
      }

      setFormData((current) => ({
        ...current,
        latitud: result.latitud,
        longitud: result.longitud,
        ubicacion: result.ubicacion || current.ubicacion,
        localidad: result.localidad || current.localidad,
      }));
      setAddressSuggestions([]);
      setShowSuggestions(false);

      toast({
        title: 'Ubicación encontrada',
        description: result.direccion,
      });
    } catch (error) {
      toast({
        title: 'No se pudo buscar la ubicación',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSearchingLocation(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      let payload = { ...formData };

      if ((!payload.latitud || !payload.longitud) && payload.ubicacion?.trim()) {
        const result = await geocodeArgentinaAddress(payload);
        if (result) {
          payload = {
            ...payload,
            latitud: result.latitud,
            longitud: result.longitud,
          };
        }
      }

      await onSave(payload);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{plant ? 'Editar Obra' : 'Nueva Obra Hídrica'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tipo">Tipo de Obra *</Label>
              <Select value={formData.tipo} onValueChange={(value) => setFormData({ ...formData, tipo: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pozo">Pozo</SelectItem>
                  <SelectItem value="planta">Planta</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="nombre">Nombre *</Label>
              <Input
                id="nombre"
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ubicacion">Ubicación / dirección *</Label>
              <div className="space-y-2">
                <div className="flex gap-2 relative">
                  <div className="relative flex-1">
                    <Input
                      id="ubicacion"
                      value={formData.ubicacion}
                      onChange={(e) => {
                        setFormData({ ...formData, ubicacion: e.target.value });
                        setShowSuggestions(true);
                      }}
                      onFocus={() => setShowSuggestions(true)}
                      onBlur={() => {
                        window.setTimeout(() => setShowSuggestions(false), 150);
                      }}
                      placeholder="Calle y altura, barrio o referencia"
                      required
                    />
                    {showSuggestions && (suggestionsLoading || addressSuggestions.length > 0) && (
                      <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-64 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg">
                        {suggestionsLoading ? (
                          <div className="flex items-center gap-2 px-3 py-2 text-sm text-gray-500">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Buscando direcciones...
                          </div>
                        ) : (
                          addressSuggestions.map((suggestion) => (
                            <button
                              key={`${suggestion.latitud}-${suggestion.longitud}-${suggestion.label}`}
                              type="button"
                              onMouseDown={(event) => {
                                event.preventDefault();
                                handleSelectSuggestion(suggestion);
                              }}
                              className="block w-full border-b border-gray-100 px-3 py-2 text-left text-sm last:border-b-0 hover:bg-cyan-50"
                            >
                              <div className="font-medium text-gray-900">{suggestion.ubicacion || suggestion.label}</div>
                              <div className="text-xs text-gray-500">{suggestion.label}</div>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleSearchLocation}
                    disabled={searchingLocation || !formData.ubicacion?.trim()}
                    className="shrink-0"
                  >
                    {searchingLocation ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Search className="w-4 h-4" />
                    )}
                    Buscar
                  </Button>
                </div>
              <p className="text-xs text-gray-500">
                Escribí una dirección como calle y altura. Podés elegir una sugerencia o marcar la ubicación en el mapa.
              </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="localidad">Localidad</Label>
              <Input
                id="localidad"
                value={formData.localidad}
                onChange={(e) => setFormData({ ...formData, localidad: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="estado">Estado *</Label>
              <Select value={formData.estado} onValueChange={(value) => setFormData({ ...formData, estado: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en_construccion">En Construcción</SelectItem>
                  <SelectItem value="en_funcionamiento">En Funcionamiento</SelectItem>
                  <SelectItem value="en_reparacion">En Reparación</SelectItem>
                  <SelectItem value="fuera_de_servicio">Fuera de Servicio</SelectItem>
                  <SelectItem value="en_estudio">En Estudio</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="responsable">Nombre del operario *</Label>
              <Input
                id="responsable"
                value={formData.responsable}
                onChange={(e) => setFormData({ ...formData, responsable: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="empresa">Empresa</Label>
              <Input
                id="empresa"
                value={formData.empresa}
                onChange={(e) => setFormData({ ...formData, empresa: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="anio">Año</Label>
              <Input
                id="anio"
                type="number"
                value={formData.anio}
                onChange={(e) => setFormData({ ...formData, anio: parseNumberInput(e.target.value) })}
              />
            </div>

            {mostrarCampoAvance && (
              <div className="space-y-2">
                <Label htmlFor="porcentaje_avance">% Avance</Label>
                <Input
                  id="porcentaje_avance"
                  type="number"
                  min="0"
                  max="100"
                  value={formData.porcentaje_avance}
                  onChange={(e) => setFormData({ ...formData, porcentaje_avance: parseNumberInput(e.target.value) })}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="latitud">Latitud</Label>
              <Input
                id="latitud"
                type="number"
                step="any"
                value={formData.latitud}
                onChange={(e) => setFormData({ ...formData, latitud: parseNumberInput(e.target.value) })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="longitud">Longitud</Label>
              <Input
                id="longitud"
                type="number"
                step="any"
                value={formData.longitud}
                onChange={(e) => setFormData({ ...formData, longitud: parseNumberInput(e.target.value) })}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <div className="flex items-center justify-between gap-3">
                <Label>Ubicación en el mapa</Label>
                <span className="text-xs text-gray-500">Hacé clic o arrastrá el pin para ajustar la obra</span>
              </div>
              <div className="overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
                <LocationPickerMap
                  position={[
                    Number.isFinite(Number(formData.latitud)) ? Number(formData.latitud) : SANTIAGO_DEL_ESTERO_CENTER[0],
                    Number.isFinite(Number(formData.longitud)) ? Number(formData.longitud) : SANTIAGO_DEL_ESTERO_CENTER[1],
                  ]}
                  onPickLocation={updateCoordinatesFromMap}
                />
              </div>
            </div>
          </div>

          {/* Campos específicos de Pozo */}
          {formData.tipo === 'pozo' && (
            <div className="border-t pt-4">
              <h4 className="font-semibold text-gray-900 mb-3">Datos del Pozo</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="profundidad">Profundidad (m)</Label>
                  <Input
                    id="profundidad"
                    type="number"
                    step="any"
                    value={formData.profundidad}
                    onChange={(e) => setFormData({ ...formData, profundidad: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="caudal">Caudal (m³/h)</Label>
                  <Input
                    id="caudal"
                    type="number"
                    step="any"
                    value={formData.caudal}
                    onChange={(e) => setFormData({ ...formData, caudal: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tipo_bomba">Tipo de Bomba</Label>
                  <Input
                    id="tipo_bomba"
                    value={formData.tipo_bomba}
                    onChange={(e) => setFormData({ ...formData, tipo_bomba: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contaminantes">Contaminantes</Label>
                  <Input
                    id="contaminantes"
                    value={formData.contaminantes}
                    onChange={(e) => setFormData({ ...formData, contaminantes: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="altura_tanque">Altura del tanque (m)</Label>
                  <Input
                    id="altura_tanque"
                    type="number"
                    step="any"
                    value={formData.altura_tanque}
                    onChange={(e) => setFormData({ ...formData, altura_tanque: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="capacidad_tanque">Capacidad del tanque (m³)</Label>
                  <Input
                    id="capacidad_tanque"
                    type="number"
                    step="any"
                    value={formData.capacidad_tanque}
                    onChange={(e) => setFormData({ ...formData, capacidad_tanque: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="diametro_pozo">Diámetro del pozo (m)</Label>
                  <Input
                    id="diametro_pozo"
                    type="number"
                    step="any"
                    value={formData.diametro_pozo}
                    onChange={(e) => setFormData({ ...formData, diametro_pozo: e.target.value })}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Campos específicos de Planta */}
          {formData.tipo === 'planta' && (
            <div className="border-t pt-4">
              <h4 className="font-semibold text-gray-900 mb-3">Datos de la Planta</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tratamiento">Tratamiento</Label>
                  <Input
                    id="tratamiento"
                    value={formData.tratamiento}
                    onChange={(e) => setFormData({ ...formData, tratamiento: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="capacidad">Capacidad (m³/h)</Label>
                  <Input
                    id="capacidad"
                    type="number"
                    step="any"
                    value={formData.capacidad}
                    onChange={(e) => setFormData({ ...formData, capacidad: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fuente">Represa de la que se abastece</Label>
                  <Input
                    id="fuente"
                    value={formData.fuente}
                    onChange={(e) => setFormData({ ...formData, fuente: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="volumen_represa">Volumen de la represa (m³)</Label>
                  <Input
                    id="volumen_represa"
                    type="number"
                    step="any"
                    value={formData.volumen_represa}
                    onChange={(e) => setFormData({ ...formData, volumen_represa: e.target.value })}
                  />
                </div>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="descripcion">Descripción</Label>
            <Textarea
              id="descripcion"
              value={formData.descripcion}
              onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
              rows={4}
              placeholder="Descripción detallada de la obra..."
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-700 hover:to-teal-700"
            >
              {saving ? 'Guardando...' : plant ? 'Guardar Cambios' : 'Crear Obra'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default PlantDialog;