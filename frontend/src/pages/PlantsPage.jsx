import React, { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import PlantCard from "@/components/plants/PlantCard";
import PlantDialog from "@/components/plants/PlantDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { puedeEditarObra } from "@/lib/permissions";
import useObras from "@/hooks/useObras";
import { reportesAPI } from "@/services/api";
import { Plus, Search, Droplets, Download } from "lucide-react";

// Helper function to normalize tipo values
const normalizeTipo = (tipo) => {
  if (!tipo) return null;
  return tipo === "planta_potabilizadora" ? "planta" : tipo;
};

const PlantsPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const { user, permisos } = useAuth();
  const { obras, loading, addObra, updateObra, deleteObra } = useObras();
  const [filteredObras, setFilteredObras] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState(searchParams.get('estado') || "all");
  const [tipoFilter, setTipoFilter] = useState(searchParams.get('tipo') || "all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingObra, setEditingObra] = useState(null);
  const [cols, setCols] = useState(() => {
    try {
      const saved = localStorage.getItem('obras_grid_cols');
      if (!saved) return 3;
      const n = Number(saved);
      return n === 5 ? 5 : 3;
    } catch (e) {
      return 3;
    }
  });
  const [effectiveCols, setEffectiveCols] = useState(cols);

  useEffect(() => {
    const updateCols = () => {
      const w = window.innerWidth;
      if (w < 640) setEffectiveCols(1);
      else if (w < 768) setEffectiveCols(Math.min(2, cols));
      else setEffectiveCols(cols);
    };
    updateCols();
    window.addEventListener('resize', updateCols);
    return () => window.removeEventListener('resize', updateCols);
  }, [cols]);

  useEffect(() => {
    filterObras();
  }, [obras, searchTerm, statusFilter, tipoFilter]);

  const filterObras = () => {
    let filtered = [...obras];

    if (searchTerm) {
      filtered = filtered.filter(
        (obra) =>
          obra.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
          obra.ubicacion.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (obra.responsable && obra.responsable.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((obra) => obra.estado === statusFilter);
    }

    if (tipoFilter !== "all") {
      filtered = filtered.filter((obra) => normalizeTipo(obra.tipo) === tipoFilter);
    }

    setFilteredObras(filtered);
  };

  const handleSaveObra = async (obraData) => {
    let result;
    if (editingObra) {
      result = await updateObra(editingObra.id, obraData);
      if (result.success) {
        toast({
          title: "¡Obra actualizada!",
          description: "Los cambios se han guardado correctamente",
        });
      }
    } else {
      result = await addObra(obraData);
      if (result.success) {
        toast({
          title: "¡Obra creada!",
          description: "La nueva obra se ha agregado correctamente",
        });
      }
    }

    if (!result.success) {
      toast({
        title: "Error",
        description: result.error,
        variant: "destructive",
      });
      return;
    }

    setIsDialogOpen(false);
    setEditingObra(null);
  };

  const handleDeleteObra = async (obraId) => {
    const result = await deleteObra(obraId);
    if (result.success) {
      toast({
        title: "Obra eliminada",
        description: "La obra ha sido eliminada correctamente",
      });
    } else {
      toast({
        title: "Error",
        description: result.error,
        variant: "destructive",
      });
    }
  };

  const handleEditObra = (obra) => {
    setEditingObra(obra);
    setIsDialogOpen(true);
  };

  return (
    <>
      <Helmet>
        <title>Obras Hídricas - Recursos Hidricos de SDE</title>
        <meta
          name="description"
          content="Gestiona todas las obras hídricas"
        />
      </Helmet>

      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Obras Hídricas
              </h1>
              <p className="text-gray-600 mt-1">
                Gestiona todas las instalaciones
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  const params = {};
                  if (statusFilter !== 'all') params.estado = statusFilter;
                  reportesAPI.downloadCSV(params).then(() => {
                    toast({ title: 'Exportación completada', description: 'El archivo CSV se descargó correctamente' });
                  }).catch(() => {
                    toast({ title: 'Error', description: 'No se pudo exportar', variant: 'destructive' });
                  });
                }}
                className="border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                <Download className="w-4 h-4 mr-2" />
                Exportar CSV
              </Button>
              <div className="flex items-center gap-2">
                <Button
                  variant={cols === 5 ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setCols(5);
                    try { localStorage.setItem('obras_grid_cols', '5'); } catch(e){}
                  }}
                >
                  Compacto
                </Button>
                <Button
                  variant={cols === 3 ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setCols(3);
                    try { localStorage.setItem('obras_grid_cols', '3'); } catch(e){}
                  }}
                >
                  Medio
                </Button>
              </div>
              {permisos?.crearObra && (
                <Button
                  onClick={() => {
                    setEditingObra(null);
                    setIsDialogOpen(true);
                  }}
                  className="bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-700 hover:to-teal-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Nueva Obra
                </Button>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
              <Input
                placeholder="Buscar por nombre, ubicación o responsable..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={tipoFilter} onValueChange={setTipoFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Filtrar por tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los tipos</SelectItem>
                <SelectItem value="pozo">Pozo</SelectItem>
                <SelectItem value="planta">Planta</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filtrar por estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="en_funcionamiento">En Funcionamiento</SelectItem>
                <SelectItem value="en_construccion">En Construcción</SelectItem>
                <SelectItem value="en_reparacion">En Reparación</SelectItem>
                <SelectItem value="fuera_de_servicio">Fuera de Servicio</SelectItem>
                <SelectItem value="en_estudio">En Estudio</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="text-center py-12 text-gray-500">Cargando obras...</div>
          ) : filteredObras.length === 0 ? (
            <div className="text-center py-12">
              <Droplets className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {obras.length === 0
                  ? "No hay obras registradas"
                  : "No se encontraron resultados"}
              </h3>
              <p className="text-gray-600 mb-6">
                {obras.length === 0
                  ? "Comienza agregando la primera obra hídrica"
                  : "Intenta con otros términos de búsqueda"}
              </p>
              {obras.length === 0 && permisos?.crearObra && (
                <Button
                  onClick={() => setIsDialogOpen(true)}
                  className="bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-700 hover:to-teal-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Agregar Primera Obra
                </Button>
              )}
            </div>
          ) : (
            <div className="grid gap-6" style={{ gridTemplateColumns: `repeat(${effectiveCols}, minmax(0, 1fr))` }}>
              {filteredObras.map((obra, index) => (
                <motion.div
                  key={obra.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                >
                  <PlantCard
                    plant={obra}
                    onEdit={puedeEditarObra(user, obra) ? handleEditObra : null}
                    onDelete={permisos?.eliminarObra ? handleDeleteObra : null}
                    onClick={() => navigate(`/plantas/${obra.id}`)}
                  />
                </motion.div>
              ))}
            </div>
          )}
        </div>

        <PlantDialog
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          plant={editingObra}
          onSave={handleSaveObra}
        />
      </DashboardLayout>
    </>
  );
};

export default PlantsPage;
