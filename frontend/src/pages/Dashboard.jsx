import React, { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import StatsCard from "@/components/dashboard/StatsCard";
import StatusChart from "@/components/dashboard/StatusChart";
import RecentActivity from "@/components/dashboard/RecentActivity";
import { dashboardAPI } from "@/services/api";
import { useAuth } from "@/contexts/AuthContext";
import { getRolLabel } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { Droplets, AlertTriangle, CheckCircle, Wrench, Plus, ArrowRight, HardHat, Building2, ShieldCheck } from "lucide-react";

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, permisos } = useAuth();
  const [stats, setStats] = useState(null);
  const [chartData, setChartData] = useState(null);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const promises = [
          dashboardAPI.stats(),
          dashboardAPI.chartData(),
        ];
        // Solo cargar actividad para roles con verAuditoria
        if (permisos?.verAuditoria) {
          promises.push(dashboardAPI.activity(10));
        }
        const results = await Promise.all(promises);
        setStats(results[0].stats);
        setChartData(results[1]);
        if (results[2]) {
          setActivity(results[2].activity || []);
        }
      } catch (err) {
        console.error('Error cargando dashboard:', err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [permisos]);

  const handleStatClick = (estado) => {
    if (estado === 'total') {
      navigate('/plantas');
    } else {
      navigate(`/plantas?estado=${estado}`);
    }
  };

  const statCards = stats ? [
    {
      title: "Total de Obras",
      value: stats.totalObras,
      icon: <Droplets className="w-6 h-6" />,
      color: "from-cyan-500 to-blue-500",
      bgColor: "bg-cyan-50 dark:bg-cyan-950/55 dark:border-cyan-800/80",
      estado: 'total',
    },
    {
      title: "En Funcionamiento",
      value: stats.enFuncionamiento,
      icon: <CheckCircle className="w-6 h-6" />,
      color: "from-green-500 to-emerald-500",
      bgColor: "bg-green-50 dark:bg-emerald-950/55 dark:border-emerald-800/80",
      estado: 'en_funcionamiento',
    },
    {
      title: "En Reparación",
      value: stats.enReparacion,
      icon: <Wrench className="w-6 h-6" />,
      color: "from-orange-500 to-yellow-500",
      bgColor: "bg-orange-50 dark:bg-orange-950/55 dark:border-orange-800/80",
      estado: 'en_reparacion',
    },
    {
      title: "En Construcción",
      value: stats.enConstruccion,
      icon: <HardHat className="w-6 h-6" />,
      color: "from-yellow-500 to-orange-500",
      bgColor: "bg-yellow-50 dark:bg-amber-950/55 dark:border-amber-800/80",
      estado: 'en_construccion',
    },
    {
      title: "Fuera de Servicio",
      value: stats.fueraDeServicio,
      icon: <AlertTriangle className="w-6 h-6" />,
      color: "from-red-500 to-pink-500",
      bgColor: "bg-red-50 dark:bg-rose-950/55 dark:border-rose-800/80",
      estado: 'fuera_de_servicio',
    },
  ] : [];

  return (
    <>
      <Helmet>
        <title>Dashboard - Recursos Hidricos de SDE</title>
        <meta
          name="description"
          content="Panel de control para gestionar tus plantas hídricas"
        />
      </Helmet>

      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-gray-600 mt-1">
                Bienvenido/a, <span className="font-semibold">{user?.nombre} {user?.apellido}</span>
              </p>
              <div className="flex items-center gap-2 mt-1">
                <ShieldCheck className="w-4 h-4 text-cyan-600" />
                <span className="text-sm text-cyan-700 font-medium">{getRolLabel(user?.rol)}</span>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12 text-gray-500">Cargando datos...</div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {statCards.map((stat, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                  >
                    <StatsCard 
                      {...stat}
                      onClick={() => handleStatClick(stat.estado)}
                    />
                  </motion.div>
                ))}
              </div>

              <div className={`grid grid-cols-1 ${permisos?.verAuditoria ? 'lg:grid-cols-2' : ''} gap-6`}>
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.4 }}
                >
                  <StatusChart chartData={chartData} />
                </motion.div>

                {permisos?.verAuditoria && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, delay: 0.4 }}
                  >
                    <RecentActivity activity={activity} />
                  </motion.div>
                )}
              </div>

              {stats && stats.totalObras === 0 && permisos?.crearObra && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.6 }}
                  className="bg-gradient-to-br from-cyan-50 to-teal-50 rounded-xl border border-cyan-200 p-8 text-center"
                >
                  <Droplets className="w-16 h-16 text-cyan-400 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    ¡Bienvenido! Empieza a gestionar las obras
                  </h3>
                  <p className="text-gray-600 mb-6 max-w-md mx-auto">
                    Aún no hay obras registradas. Agrega la primera obra hídrica para comenzar a visualizar estadísticas y reportes.
                  </p>
                  <Button
                    onClick={() => navigate("/plantas")}
                    className="bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-700 hover:to-teal-700 gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Agregar primera obra
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </motion.div>
              )}
            </>
          )}
        </div>
      </DashboardLayout>
    </>
  );
};

export default Dashboard;
