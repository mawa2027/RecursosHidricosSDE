import React, { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import { useParams, useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import PlantMap from "@/components/plants/PlantMap";
import FileUpload from "@/components/plants/FileUpload";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { obrasAPI, archivosAPI } from "@/services/api";
import { useAuth } from "@/contexts/AuthContext";
import { puedeEditarObra, puedeEliminarArchivo } from "@/lib/permissions";
import {
  ArrowLeft,
  MapPin,
  User,
  Building2,
  FileText,
  Edit,
  Trash2,
} from "lucide-react";

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

const PlantDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, permisos } = useAuth();
  const [obra, setObra] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const canEdit = obra ? puedeEditarObra(user, obra) : false;
  const canDelete = permisos?.eliminarObra;
  const canUploadFiles = permisos?.subirArchivos;

  useEffect(() => {
    const loadObra = async () => {
      try {
        const data = await obrasAPI.getById(id);
        setObra(data.obra);
      } catch (err) {
        toast({
          title: "Error",
          description: "No se pudo cargar la obra",
          variant: "destructive",
        });
        navigate("/plantas");
      } finally {
        setLoading(false);
      }
    };
    loadObra();
  }, [id]);

  const handleDelete = async () => {
    try {
      await obrasAPI.delete(id);
      toast({
        title: "Obra eliminada",
        description: "La obra ha sido eliminada correctamente",
      });
      navigate("/plantas");
    } catch (err) {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  const handleFileUpload = async (files) => {
    try {
      for (const file of files) {
        await archivosAPI.upload(id, file);
      }
      // Recargar obra para obtener archivos actualizados
      const data = await obrasAPI.getById(id);
      setObra(data.obra);
      toast({
        title: "Archivos agregados",
        description: `Se han agregado ${files.length} archivo(s)`,
      });
    } catch (err) {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  const handleFileDelete = async (fileId) => {
    try {
      await archivosAPI.delete(fileId);
      const data = await obrasAPI.getById(id);
      setObra(data.obra);
      toast({
        title: "Archivo eliminado",
        description: "El archivo ha sido eliminado correctamente",
      });
    } catch (err) {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="text-center py-12 text-gray-500">Cargando obra...</div>
      </DashboardLayout>
    );
  }

  if (!obra) {
    return null;
  }

  const statusColors = {
    en_funcionamiento: "bg-green-100 text-green-800 border-green-200",
    en_reparacion: "bg-yellow-100 text-yellow-800 border-yellow-200",
    fuera_de_servicio: "bg-red-100 text-red-800 border-red-200",
    en_construccion: "bg-blue-100 text-blue-800 border-blue-200",
    en_estudio: "bg-purple-100 text-purple-800 border-purple-200",
  };

  return (
    <>
      <Helmet>
        <title>{obra.nombre} - Recursos Hidricos de SDE</title>
        <meta
          name="description"
          content={`Detalles de la obra hídrica ${obra.nombre}`}
        />
      </Helmet>

      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={() => navigate("/plantas")}
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Volver a Obras
            </Button>
            <div className="flex gap-2">
              {canDelete && (
                <Button
                  variant="destructive"
                  onClick={() => setShowDeleteDialog(true)}
                  className="gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Eliminar
                </Button>
              )}
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
          >
            <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  {obra.nombre}
                </h1>
                <div className="flex items-center gap-2 text-gray-600">
                  <MapPin className="w-4 h-4" />
                  <span>{obra.ubicacion}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <Badge className={statusColors[obra.estado] || 'bg-gray-100 text-gray-800'}>
                  {ESTADO_LABELS[obra.estado] || obra.estado}
                </Badge>
                <Badge variant="outline" className="capitalize">{obra.tipo}</Badge>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <User className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Responsable</p>
                    <p className="font-medium text-gray-900">{obra.responsable}</p>
                  </div>
                </div>
                {obra.empresa && (
                  <div className="flex items-start gap-3">
                    <Building2 className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500">Empresa</p>
                      <p className="font-medium text-gray-900">{obra.empresa}</p>
                    </div>
                  </div>
                )}
                {obra.localidad && (
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500">Localidad</p>
                      <p className="font-medium text-gray-900">{obra.localidad}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                {obra.latitud && obra.longitud && (
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500">Coordenadas</p>
                      <p className="font-medium text-gray-900">
                        {parseFloat(obra.latitud).toFixed(6)},{" "}
                        {parseFloat(obra.longitud).toFixed(6)}
                      </p>
                    </div>
                  </div>
                )}
                {ESTADOS_CON_AVANCE.includes(obra.estado) && obra.porcentaje_avance !== undefined && (
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Avance: {obra.porcentaje_avance}%</p>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div className="bg-gradient-to-r from-cyan-500 to-teal-500 rounded-full h-3" style={{ width: `${obra.porcentaje_avance}%` }} />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {obra.descripcion && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Descripción</h3>
                <p className="text-gray-600">{obra.descripcion}</p>
              </div>
            )}
          </motion.div>

          {obra.latitud && obra.longitud && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <PlantMap coordinates={{ lat: parseFloat(obra.latitud), lng: parseFloat(obra.longitud) }} name={obra.nombre} />
            </motion.div>
          )}

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <FileUpload
              plantId={obra.id}
              files={obra.archivos || []}
              onUpload={canUploadFiles ? handleFileUpload : null}
              onDelete={(fileId) => {
                const archivo = (obra.archivos || []).find(a => a.id === fileId);
                return puedeEliminarArchivo(user, archivo)
                  ? handleFileDelete(fileId)
                  : null;
              }}
              canUpload={canUploadFiles}
              canDeleteFile={(archivo) => puedeEliminarArchivo(user, archivo)}
            />
          </motion.div>
        </div>

        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Eliminar obra?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción eliminará permanentemente la obra <strong>"{obra.nombre}"</strong> y todos sus archivos asociados. Esta acción no se puede deshacer.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-red-600 hover:bg-red-700"
              >
                Sí, eliminar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DashboardLayout>
    </>
  );
};

export default PlantDetailPage;
