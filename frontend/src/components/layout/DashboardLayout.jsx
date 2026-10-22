import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { getRolLabel } from "@/lib/permissions";
import { notificacionesAPI } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LayoutDashboard, Droplet, Menu, X, LogOut, Users, ShieldCheck, MapPin, User, Shield, Bell, AlertTriangle, CheckCircle, MoonStar, SunMedium } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Logo from "../icons/logo.svg";

const SEEN_NOTIFICATION_KEY = 'dashboard:seenNotificationIds';

const DashboardLayout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, permisos, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificaciones, setNotificaciones] = useState([]);
  const [notificacionesAbiertas, setNotificacionesAbiertas] = useState(false);
  const [seenNotificationIds, setSeenNotificationIds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(SEEN_NOTIFICATION_KEY) || '[]');
    } catch {
      return [];
    }
  });

  const loadNotifs = useCallback(async () => {
    try {
      const data = await notificacionesAPI.get();
      const alertas = [...(data.alertas || [])].sort(
        (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
      );
      const storedSeenIds = new Set(seenNotificationIds.map((id) => String(id)));
      const filtered = alertas.filter((alert) => !storedSeenIds.has(String(alert.id)));
      setNotificaciones(filtered);
    } catch (e) {
      // silencioso
    }
  }, [seenNotificationIds]);

  const seenNotificationSet = useMemo(() => new Set(seenNotificationIds.map((id) => String(id))), [seenNotificationIds]);
  const unreadNotifications = notificaciones.filter((notificacion) => !seenNotificationSet.has(String(notificacion.id)));
  const totalAlertas = unreadNotifications.length;

  const markNotificationAsSeen = useCallback((notificationId) => {
    const nextSeenIds = Array.from(new Set([...seenNotificationIds, String(notificationId)]));
    setSeenNotificationIds(nextSeenIds);
    localStorage.setItem(SEEN_NOTIFICATION_KEY, JSON.stringify(nextSeenIds));
  }, [seenNotificationIds]);

  const markAllNotificationsAsSeen = useCallback(() => {
    const allNotificationIds = notificaciones.map((notificacion) => String(notificacion.id));
    const nextSeenIds = Array.from(new Set([...seenNotificationIds, ...allNotificationIds]));
    setSeenNotificationIds(nextSeenIds);
    localStorage.setItem(SEEN_NOTIFICATION_KEY, JSON.stringify(nextSeenIds));
    setNotificacionesAbiertas(false);
  }, [notificaciones, seenNotificationIds]);

  // Actualizar notificaciones cuando cambian las vistas
  useEffect(() => {
    loadNotifs();
  }, [seenNotificationIds]);

  // Cargar notificaciones al montar y cada 60s
  useEffect(() => {
    const interval = setInterval(loadNotifs, 60000); // cada 60s
    return () => clearInterval(interval);
  }, [loadNotifs]);

  useEffect(() => {
    const handleObraChange = () => {
      loadNotifs();
    };

    window.addEventListener('obra:changed', handleObraChange);
    return () => window.removeEventListener('obra:changed', handleObraChange);
  }, [loadNotifs]);

  const toggleNotifications = () => {
    setNotificacionesAbiertas((value) => {
      return !value;
    });
  };

  const handleNotificationClick = (notificacion) => {
    markNotificationAsSeen(notificacion.id);
    navigate(`/auditoria?highlight=${notificacion.id}`);
    setNotificacionesAbiertas(false);
  };

  // Menú dinámico según permisos
  const menuItems = [
    {
      icon: <LayoutDashboard className="w-5 h-5" />,
      label: "Dashboard",
      path: "/dashboard",
      visible: true,
    },
    {
      icon: <Droplet className="w-5 h-5" />,
      label: "Obras",
      path: "/plantas",
      visible: true,
    },
    {
      icon: <MapPin className="w-5 h-5" />,
      label: "Mapa",
      path: "/mapa",
      visible: true,
    },
    {
      icon: <User className="w-5 h-5" />,
      label: "Mi Perfil",
      path: "/perfil",
      visible: true,
    },
    {
      icon: <Users className="w-5 h-5" />,
      label: "Usuarios",
      path: "/usuarios",
      visible: permisos?.gestionarUsuarios,
    },
    {
      icon: <Shield className="w-5 h-5" />,
      label: "Auditoría",
      path: "/auditoria",
      visible: permisos?.verAuditoria,
    },
  ].filter(item => item.visible);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const getInitials = (name) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950">
      <nav className="bg-white border-b border-gray-200 fixed w-full z-50 dark:bg-slate-900 dark:border-slate-800">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              >
                {sidebarOpen ? (
                  <X className="w-6 h-6" />
                ) : (
                  <Menu className="w-6 h-6" />
                )}
              </button>
              <div className="flex items-center space-x-2 ml-2 lg:ml-0">
                <button
                  type="button"
                  onClick={() => navigate('/dashboard')}
                  className="flex items-center gap-2.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/70 rounded-md"
                  aria-label="Ir al dashboard"
                >
                  <img src={Logo} alt="Logo" width={32} height={32} />
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-600 to-teal-600 bg-clip-text text-transparent dark:from-cyan-300 dark:to-teal-200">
                    Recursos Hidricos de SDE
                  </h1>
                </button>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {/* Notification bell */}
              <div className="relative">
                <button
                  onClick={toggleNotifications}
                  className="relative p-2 rounded-full text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors dark:text-gray-300 dark:hover:text-white dark:hover:bg-slate-800"
                  title={`${totalAlertas} alerta(s)`}
                >
                  <Bell className="w-5 h-5" />
                  {!notificacionesAbiertas && totalAlertas > 0 && (
                    <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full">
                      {totalAlertas}
                    </span>
                  )}
                </button>

                <AnimatePresence>
                  {notificacionesAbiertas && (
                    <motion.div
                      initial={{ opacity: 0, y: -8, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.98 }}
                      transition={{ duration: 0.18 }}
                      className="absolute right-0 top-full mt-3 w-96 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl z-50 dark:border-slate-700 dark:bg-slate-900"
                    >
                      <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-4 py-3">
                        <div>
                          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Notificaciones</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                              {unreadNotifications.length > 0
                                ? `${unreadNotifications.length} alerta(s) sin leer`
                              : 'No hay notificaciones nuevas'}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          {unreadNotifications.length > 0 && (
                            <button
                              onClick={markAllNotificationsAsSeen}
                              className="rounded-lg border border-cyan-200 px-2.5 py-1 text-xs font-medium text-cyan-700 hover:bg-cyan-50 dark:border-cyan-900/60 dark:text-cyan-200 dark:hover:bg-cyan-950/40"
                            >
                              Marcar todas como leídas
                            </button>
                          )}
                          <button
                            onClick={() => setNotificacionesAbiertas(false)}
                            className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-500 dark:hover:bg-slate-800 dark:hover:text-gray-200"
                            aria-label="Cerrar notificaciones"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="max-h-96 overflow-y-auto">
                        {unreadNotifications.length === 0 ? (
                            <div className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                            Todo está al día por ahora.
                          </div>
                        ) : (
                          unreadNotifications.map((notificacion, index) => {
                            const iconoPorTipo = {
                              danger: AlertTriangle,
                              warning: AlertTriangle,
                              success: CheckCircle,
                              info: Bell,
                            };
                            const Icono = iconoPorTipo[notificacion.tipo] || Bell;
                            const fondoPorTipo = {
                              danger: 'bg-red-50 text-red-600',
                              warning: 'bg-amber-50 text-amber-600',
                              success: 'bg-emerald-50 text-emerald-600',
                              info: 'bg-cyan-50 text-cyan-600',
                            };

                            const isUnread = !seenNotificationSet.has(String(notificacion.id));

                            return (
                              <button
                                key={`${notificacion.id}-${index}`}
                                type="button"
                                onClick={() => handleNotificationClick(notificacion)}
                                className={`flex w-full gap-3 border-b border-gray-100 px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-gray-50 dark:border-slate-800 dark:hover:bg-slate-800/70 ${isUnread ? 'bg-cyan-50/40 dark:bg-cyan-950/20' : ''}`}
                              >
                                <div className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${fondoPorTipo[notificacion.tipo] || 'bg-gray-100 text-gray-600'}`}>
                                  <Icono className="w-5 h-5" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{notificacion.titulo}</p>
                                  <p className="text-sm text-gray-600 dark:text-gray-300">{notificacion.mensaje}</p>
                                  {notificacion.detalle && (
                                    <p className="mt-1 text-xs leading-5 text-gray-500 dark:text-gray-400">{notificacion.detalle}</p>
                                  )}
                                </div>
                              </button>
                            );
                          })
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="relative h-10 w-10 rounded-full"
                  >
                    <Avatar>
                      <AvatarFallback className="bg-gradient-to-br from-cyan-600 to-teal-600 text-white">
                        {getInitials(user?.nombre_completo || user?.nombre || "U")}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 dark:border-slate-700 dark:bg-slate-900">
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium dark:text-gray-100">{user?.nombre} {user?.apellido}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{user?.correo}</p>
                      <div className="flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3 text-cyan-600" />
                        <p className="text-xs text-cyan-600 font-semibold dark:text-cyan-300">
                          {getRolLabel(user?.rol)}
                        </p>
                      </div>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={toggleTheme}
                    className="cursor-pointer dark:text-gray-100 dark:focus:bg-slate-800 dark:focus:text-gray-100"
                  >
                    {theme === 'dark' ? (
                      <>
                        <SunMedium className="w-4 h-4 mr-2" />
                        Modo claro
                      </>
                    ) : (
                      <>
                        <MoonStar className="w-4 h-4 mr-2" />
                        Modo oscuro
                      </>
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate('/perfil')}>
                    <User className="w-4 h-4 mr-2" />
                    Mi Perfil
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="w-4 h-4 mr-2" />
                    Cerrar Sesión
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </nav>

      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      <aside
        className={`fixed left-0 top-16 h-[calc(100vh-4rem)] w-64 bg-white border-r border-gray-200 z-40 transform transition-transform duration-300 ease-in-out dark:bg-slate-900 dark:border-slate-800 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0`}
      >
        <nav className="p-4 space-y-2">
          {menuItems.map((item) => (
            <button
              key={item.path}
              onClick={() => {
                navigate(item.path);
                setSidebarOpen(false);
              }}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                location.pathname === item.path
                  ? "bg-gradient-to-r from-cyan-600 to-teal-600 text-white shadow-md"
                    : "text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-slate-800"
              }`}
            >
              {item.icon}
              <span className="font-medium flex-1 text-left">{item.label}</span>
              {item.badge && (
                <span className={`${item.badgeColor || 'bg-red-500'} text-white text-xs font-bold min-w-[20px] h-5 flex items-center justify-center rounded-full px-1.5`}>
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 dark:border-slate-800">
          <div className="flex items-center space-x-3 px-4 py-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ${
              permisos?.gestionarUsuarios ? 'bg-gradient-to-br from-purple-600 to-indigo-600' :
              permisos?.eliminarObra ? 'bg-gradient-to-br from-amber-500 to-orange-600' :
              'bg-gradient-to-br from-cyan-600 to-teal-600'
            }`}>
              {getInitials(user?.nombre_completo || user?.nombre || "U")}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate dark:text-gray-100">{user?.nombre} {user?.apellido}</p>
              <p className={`text-xs font-semibold ${
                permisos?.gestionarUsuarios ? 'text-purple-600' :
                permisos?.eliminarObra ? 'text-amber-600' :
                'text-cyan-600'
              } dark:text-cyan-300`}>
                {getRolLabel(user?.rol)}
              </p>
            </div>
          </div>
        </div>
      </aside>

      <main className="lg:pl-64 pt-16 dark:bg-slate-950">
        <div className="p-4 sm:p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
};

export default DashboardLayout;
