import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { MapPin, Maximize2, Minimize2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

const SANTIAGO_DEL_ESTERO_BOUNDS = [
  [-24.8, -65.8],
  [-28.8, -61.5],
];

// Fix for default marker icon in react-leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

function MapResizeFix({ trigger }) {
  const map = useMap();

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      map.invalidateSize();
    }, 120);

    return () => window.clearTimeout(timeoutId);
  }, [map, trigger]);

  return null;
}

const MapView = ({
  coordinates,
  name,
  mapClassName = 'h-full w-full z-0',
  containerClassName = 'relative z-0 h-96 w-full',
  resizeTrigger = 0,
}) => {
  return (
    <div className={containerClassName}>
      <MapContainer
        center={[coordinates.lat, coordinates.lng]}
        zoom={13}
        minZoom={4}
        maxBounds={SANTIAGO_DEL_ESTERO_BOUNDS}
        maxBoundsViscosity={1.0}
        className={mapClassName}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapResizeFix trigger={resizeTrigger} />
        <Marker position={[coordinates.lat, coordinates.lng]}>
          <Popup>
            <b>{name}</b>
            <br />
            {coordinates.lat.toFixed(6)}, {coordinates.lng.toFixed(6)}
          </Popup>
        </Marker>
      </MapContainer>
    </div>
  );
};

const PlantMap = ({ coordinates, name }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden relative z-0">
      <div className="p-4 border-b border-gray-200 flex items-center justify-between gap-3">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <MapPin className="w-5 h-5 text-cyan-600" />
          Ubicación en el Mapa
        </h3>
        <button
          type="button"
          onClick={() => setIsExpanded(true)}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 shadow-sm transition hover:bg-gray-50 hover:text-cyan-600"
          title="Expandir mapa"
          aria-label="Expandir mapa"
        >
          <Maximize2 className="h-4 w-4" />
        </button>
      </div>
      <MapView coordinates={coordinates} name={name} />

      <Dialog open={isExpanded} onOpenChange={setIsExpanded}>
        <DialogContent className="max-w-7xl w-[95vw] h-[90vh] overflow-hidden p-0 sm:rounded-2xl">
          <div className="flex h-full min-h-0 flex-col">
            <DialogHeader className="px-6 pt-6 pb-4 pr-14 border-b border-gray-200 text-left">
              <DialogTitle className="flex items-center gap-2 text-xl font-semibold text-gray-900">
                <MapPin className="h-5 w-5 text-cyan-600" />
                Ubicación en el Mapa
              </DialogTitle>
              <p className="text-sm text-gray-500">
                Vista ampliada para revisar la ubicación con más espacio.
              </p>
            </DialogHeader>
            <div className="relative min-h-0 flex-1 p-4">
              <MapView
                coordinates={coordinates}
                name={name}
                containerClassName="relative z-0 h-full w-full"
                mapClassName="h-full w-full z-0"
                resizeTrigger={isExpanded ? 1 : 0}
              />
              <button
                type="button"
                onClick={() => setIsExpanded(false)}
                className="absolute top-7 right-7 z-[1001] inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white/95 text-gray-700 shadow-lg transition hover:bg-white hover:text-cyan-600"
                title="Volver a tamaño normal"
                aria-label="Volver a tamaño normal"
              >
                <Minimize2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PlantMap;