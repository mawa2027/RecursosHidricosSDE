import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { MapPin, User, Building2, Edit, Trash2, Droplet, Waves } from 'lucide-react';

const ESTADO_LABELS = {
  en_funcionamiento: 'En Funcionamiento',
  en_reparacion: 'En Reparación',
  fuera_de_servicio: 'Fuera de Servicio',
  en_construccion: 'En Construcción',
  en_estudio: 'En Estudio',
  operativa: 'Operativa',
  suspendida: 'Suspendida',
  finalizada: 'Finalizada',
};

const ESTADOS_CON_AVANCE = ['en_reparacion', 'fuera_de_servicio', 'en_construccion'];

const PlantCard = ({ plant, onEdit, onDelete, onClick }) => {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const mostrarAvance = ESTADOS_CON_AVANCE.includes(plant.estado);

  const statusColors = {
    en_funcionamiento: 'bg-green-100 text-green-800 border-green-200',
    en_reparacion: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    fuera_de_servicio: 'bg-red-100 text-red-800 border-red-200',
    en_construccion: 'bg-blue-100 text-blue-800 border-blue-200',
    en_estudio: 'bg-purple-100 text-purple-800 border-purple-200',
    operativa: 'bg-green-100 text-green-800 border-green-200',
    suspendida: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    finalizada: 'bg-gray-100 text-gray-800 border-gray-200',
  };

  // Colores de fondo para las tarjetas según estado
  const backgroundColors = {
    en_funcionamiento: 'from-green-500 to-emerald-600',
    en_reparacion: 'from-amber-500 to-orange-600',
    fuera_de_servicio: 'from-red-500 to-rose-600',
    en_construccion: 'from-blue-500 to-cyan-600',
    en_estudio: 'from-purple-500 to-indigo-600',
    operativa: 'from-green-500 to-emerald-600',
    suspendida: 'from-amber-500 to-orange-600',
    finalizada: 'from-gray-500 to-slate-600',
  };

  // Icono según tipo de obra
  const getIconForType = () => {
    return plant.tipo === 'pozo' ? (
      <Droplet className="w-12 h-12 mx-auto opacity-70" />
    ) : (
      <Waves className="w-12 h-12 mx-auto opacity-70" />
    );
  };

  return (
    <motion.div
      whileHover={{ y: -4 }}
      className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer dark:bg-slate-900 dark:border-slate-800"
      onClick={onClick}
    >
      <div className={`h-48 bg-gradient-to-br ${backgroundColors[plant.estado] || 'from-cyan-500 to-blue-600'} relative overflow-hidden`}>
        <div className="absolute inset-0 bg-black bg-opacity-15 flex items-center justify-center">
          <div className="text-center text-white">
            {getIconForType()}
            <p className="text-sm mt-2 opacity-75 capitalize font-medium">{plant.tipo}</p>
          </div>
        </div>
        <Badge className={`absolute top-4 right-4 ${statusColors[plant.estado] || 'bg-gray-100 text-gray-800'}`}>
          {ESTADO_LABELS[plant.estado] || plant.estado}
        </Badge>
        {mostrarAvance && plant.porcentaje_avance !== undefined && plant.porcentaje_avance < 100 && (
          <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-40 px-4 py-2">
            <div className="flex justify-between text-white text-xs mb-1">
              <span>Avance</span>
              <span>{plant.porcentaje_avance}%</span>
            </div>
            <div className="w-full bg-white bg-opacity-30 rounded-full h-2">
              <div className="bg-white rounded-full h-2" style={{ width: `${plant.porcentaje_avance}%` }} />
            </div>
          </div>
        )}
      </div>

      <div className="p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-2 truncate dark:text-gray-100">{plant.nombre}</h3>
        
        <div className="space-y-2 mb-4">
          <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
            <MapPin className="w-4 h-4 mr-2 flex-shrink-0" />
            <span className="truncate">{plant.ubicacion}</span>
          </div>
          <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
            <User className="w-4 h-4 mr-2 flex-shrink-0" />
            <span className="truncate">{plant.responsable}</span>
          </div>
          {plant.empresa && (
            <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
              <Building2 className="w-4 h-4 mr-2 flex-shrink-0" />
              <span className="truncate">{plant.empresa}</span>
            </div>
          )}
        </div>

        {(onEdit || onDelete) && (
          <div className="flex gap-2 items-center mb-1" onClick={(e) => e.stopPropagation()}>
            {onEdit && (
              <Button
                variant="outline"
                size="sm"
                className="min-w-0 whitespace-nowrap"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(plant);
                }}
              >
                <Edit className="w-4 h-4 mr-1" />
                Editar
              </Button>
            )}
            {onDelete && (
              <Button
                variant="destructive"
                size="sm"
                className="min-w-0 whitespace-nowrap"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDeleteDialog(true);
                }}
              >
                <Trash2 className="w-4 h-4 mr-1" />
                Eliminar
              </Button>
            )}
          </div>
        )}
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará permanentemente la obra <strong>"{plant.nombre}"</strong>. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => onDelete(plant.id)}
              className="bg-red-600 hover:bg-red-700"
            >
              Sí, eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
};

export default PlantCard;