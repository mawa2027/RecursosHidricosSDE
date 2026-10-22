import React, { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { usuariosAPI, authAPI } from "@/services/api";
import { getRolLabel } from "@/lib/permissions";
import {
  Users,
  UserPlus,
  Search,
  ShieldCheck,
  ShieldOff,
  KeyRound,
  Mail,
  Calendar,
} from "lucide-react";

const ROLES = [
  { value: "administrador", label: "Administrador" },
  { value: "presidente", label: "Presidente" },
  { value: "inspector", label: "Inspector" },
  { value: "dpto_construccion", label: "Dpto. Construcción" },
  { value: "dpto_estudios", label: "Dpto. Estudios" },
  { value: "dpto_conservacion", label: "Dpto. Conservación" },
];

const ROL_COLORS = {
  administrador: "bg-purple-100 text-purple-800 border-purple-200",
  presidente: "bg-amber-100 text-amber-800 border-amber-200",
  inspector: "bg-cyan-100 text-cyan-800 border-cyan-200",
  dpto_construccion: "bg-blue-100 text-blue-800 border-blue-200",
  dpto_estudios: "bg-green-100 text-green-800 border-green-200",
  dpto_conservacion: "bg-teal-100 text-teal-800 border-teal-200",
};

const UsersPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user: currentUser, permisos } = useAuth();
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [rolFilter, setRolFilter] = useState("all");

  // Dialogs
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showRoleDialog, setShowRoleDialog] = useState(null); // usuario object
  const [showToggleDialog, setShowToggleDialog] = useState(null); // usuario object
  const [showResetDialog, setShowResetDialog] = useState(null); // usuario object

  // Create form
  const [newUser, setNewUser] = useState({
    nombre: "",
    apellido: "",
    correo: "",
    contrasena: "",
    rol: "inspector",
  });
  const [creating, setCreating] = useState(false);

  // Role change
  const [newRole, setNewRole] = useState("");

  // Reset password
  const [newPassword, setNewPassword] = useState("");

  // Redirect if not admin
  useEffect(() => {
    if (!permisos?.gestionarUsuarios) {
      navigate("/dashboard");
    }
  }, [permisos, navigate]);

  const fetchUsuarios = async () => {
    try {
      setLoading(true);
      const data = await usuariosAPI.list();
      setUsuarios(data.usuarios || []);
    } catch (err) {
      toast({
        title: "Error",
        description: "No se pudieron cargar los usuarios",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsuarios();
  }, []);

  const filteredUsuarios = usuarios.filter((u) => {
    const matchSearch =
      !searchTerm ||
      `${u.nombre} ${u.apellido}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.correo.toLowerCase().includes(searchTerm.toLowerCase());
    const matchRol = rolFilter === "all" || u.rol === rolFilter;
    return matchSearch && matchRol;
  });

  const handleCreate = async () => {
    if (!newUser.nombre || !newUser.apellido || !newUser.correo || !newUser.contrasena) {
      toast({ title: "Error", description: "Todos los campos son requeridos", variant: "destructive" });
      return;
    }
    setCreating(true);
    try {
      await authAPI.register(newUser);
      toast({ title: "¡Usuario creado!", description: `${newUser.nombre} ${newUser.apellido} ha sido registrado como ${getRolLabel(newUser.rol)}` });
      setShowCreateDialog(false);
      setNewUser({ nombre: "", apellido: "", correo: "", contrasena: "", rol: "inspector" });
      fetchUsuarios();
    } catch (err) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const handleChangeRole = async () => {
    if (!showRoleDialog || !newRole) return;
    try {
      await usuariosAPI.changeRole(showRoleDialog.id, newRole);
      toast({ title: "Rol actualizado", description: `${showRoleDialog.nombre} ahora es ${getRolLabel(newRole)}` });
      setShowRoleDialog(null);
      setNewRole("");
      fetchUsuarios();
    } catch (err) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleToggleActive = async () => {
    if (!showToggleDialog) return;
    try {
      const data = await usuariosAPI.toggleActive(showToggleDialog.id);
      toast({ title: data.message });
      setShowToggleDialog(null);
      fetchUsuarios();
    } catch (err) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleResetPassword = async () => {
    if (!showResetDialog || !newPassword) return;
    if (newPassword.length < 6) {
      toast({ title: "Error", description: "La contraseña debe tener al menos 6 caracteres", variant: "destructive" });
      return;
    }
    try {
      await authAPI.resetPassword(showResetDialog.id, newPassword);
      toast({ title: "Contraseña restablecida", description: `Se ha restablecido la contraseña de ${showResetDialog.nombre}` });
      setShowResetDialog(null);
      setNewPassword("");
    } catch (err) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  return (
    <>
      <Helmet>
        <title>Gestión de Usuarios - Recursos Hidricos de SDE</title>
      </Helmet>

      <DashboardLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Gestión de Usuarios
              </h1>
              <p className="text-gray-600 mt-1">
                Administra los usuarios del sistema y sus roles
              </p>
            </div>
            <Button
              onClick={() => setShowCreateDialog(true)}
              className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Nuevo Usuario
            </Button>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
              <Input
                placeholder="Buscar por nombre o correo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={rolFilter} onValueChange={setRolFilter}>
              <SelectTrigger className="w-full sm:w-56">
                <SelectValue placeholder="Filtrar por rol" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los roles</SelectItem>
                {ROLES.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
              <p className="text-2xl font-bold text-gray-900">{usuarios.length}</p>
              <p className="text-sm text-gray-500">Total Usuarios</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
              <p className="text-2xl font-bold text-green-600">{usuarios.filter(u => u.activo).length}</p>
              <p className="text-sm text-gray-500">Activos</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
              <p className="text-2xl font-bold text-red-600">{usuarios.filter(u => !u.activo).length}</p>
              <p className="text-sm text-gray-500">Inactivos</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
              <p className="text-2xl font-bold text-purple-600">{new Set(usuarios.map(u => u.rol)).size}</p>
              <p className="text-sm text-gray-500">Roles en uso</p>
            </div>
          </div>

          {/* Users List */}
          {loading ? (
            <div className="text-center py-12 text-gray-500">Cargando usuarios...</div>
          ) : filteredUsuarios.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                No se encontraron usuarios
              </h3>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Usuario
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Rol
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Estado
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Fecha de alta
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredUsuarios.map((usuario, index) => (
                      <motion.tr
                        key={usuario.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: index * 0.03 }}
                        className="hover:bg-gray-50"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold ${
                              usuario.rol === 'administrador' ? 'bg-gradient-to-br from-purple-600 to-indigo-600' :
                              usuario.rol === 'presidente' ? 'bg-gradient-to-br from-amber-500 to-orange-600' :
                              'bg-gradient-to-br from-cyan-600 to-teal-600'
                            }`}>
                              {usuario.nombre[0]}{usuario.apellido[0]}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">
                                {usuario.nombre} {usuario.apellido}
                              </p>
                              <p className="text-sm text-gray-500 flex items-center gap-1">
                                <Mail className="w-3 h-3" />
                                {usuario.correo}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge className={ROL_COLORS[usuario.rol] || "bg-gray-100 text-gray-800"}>
                            {getRolLabel(usuario.rol)}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {usuario.activo ? (
                            <Badge className="bg-green-100 text-green-800 border-green-200">
                              Activo
                            </Badge>
                          ) : (
                            <Badge className="bg-red-100 text-red-800 border-red-200">
                              Inactivo
                            </Badge>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(usuario.created_at).toLocaleDateString("es-ES")}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          {usuario.id !== currentUser?.id && (
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                title="Cambiar rol"
                                onClick={() => {
                                  setNewRole(usuario.rol);
                                  setShowRoleDialog(usuario);
                                }}
                              >
                                <ShieldCheck className="w-4 h-4 text-purple-600" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                title={usuario.activo ? "Desactivar" : "Activar"}
                                onClick={() => setShowToggleDialog(usuario)}
                              >
                                <ShieldOff className={`w-4 h-4 ${usuario.activo ? 'text-red-600' : 'text-green-600'}`} />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                title="Restablecer contraseña"
                                onClick={() => {
                                  setNewPassword("");
                                  setShowResetDialog(usuario);
                                }}
                              >
                                <KeyRound className="w-4 h-4 text-amber-600" />
                              </Button>
                            </div>
                          )}
                          {usuario.id === currentUser?.id && (
                            <span className="text-xs text-gray-400 italic">Tú</span>
                          )}
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* ─── Dialog: Crear usuario ─── */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Crear Nuevo Usuario</DialogTitle>
              <DialogDescription>
                Complete los datos para registrar un nuevo usuario en el sistema
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nombre">Nombre</Label>
                  <Input
                    id="nombre"
                    value={newUser.nombre}
                    onChange={(e) => setNewUser({ ...newUser, nombre: e.target.value })}
                    placeholder="Juan"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="apellido">Apellido</Label>
                  <Input
                    id="apellido"
                    value={newUser.apellido}
                    onChange={(e) => setNewUser({ ...newUser, apellido: e.target.value })}
                    placeholder="Pérez"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="correo">Correo Electrónico</Label>
                <Input
                  id="correo"
                  type="email"
                  value={newUser.correo}
                  onChange={(e) => setNewUser({ ...newUser, correo: e.target.value })}
                  placeholder="usuario@recursoshidricos.gob.ar"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contrasena">Contraseña</Label>
                <Input
                  id="contrasena"
                  type="password"
                  value={newUser.contrasena}
                  onChange={(e) => setNewUser({ ...newUser, contrasena: e.target.value })}
                  placeholder="Mínimo 6 caracteres"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rol">Rol</Label>
                <Select
                  value={newUser.rol}
                  onValueChange={(val) => setNewUser({ ...newUser, rol: val })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleCreate}
                disabled={creating}
                className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
              >
                {creating ? "Creando..." : "Crear Usuario"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ─── Dialog: Cambiar rol ─── */}
        <Dialog open={!!showRoleDialog} onOpenChange={(open) => !open && setShowRoleDialog(null)}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Cambiar Rol</DialogTitle>
              <DialogDescription>
                Cambiar el rol de <strong>{showRoleDialog?.nombre} {showRoleDialog?.apellido}</strong>
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Label>Nuevo Rol</Label>
              <Select value={newRole} onValueChange={setNewRole}>
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowRoleDialog(null)}>
                Cancelar
              </Button>
              <Button onClick={handleChangeRole} className="bg-purple-600 hover:bg-purple-700">
                Guardar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ─── Dialog: Toggle activo ─── */}
        <AlertDialog open={!!showToggleDialog} onOpenChange={(open) => !open && setShowToggleDialog(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {showToggleDialog?.activo ? "¿Desactivar usuario?" : "¿Activar usuario?"}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {showToggleDialog?.activo
                  ? `${showToggleDialog?.nombre} ${showToggleDialog?.apellido} no podrá iniciar sesión hasta que se reactive su cuenta.`
                  : `${showToggleDialog?.nombre} ${showToggleDialog?.apellido} podrá volver a iniciar sesión.`}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleToggleActive}
                className={showToggleDialog?.activo ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"}
              >
                {showToggleDialog?.activo ? "Sí, desactivar" : "Sí, activar"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* ─── Dialog: Reset password ─── */}
        <Dialog open={!!showResetDialog} onOpenChange={(open) => !open && setShowResetDialog(null)}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Restablecer Contraseña</DialogTitle>
              <DialogDescription>
                Nueva contraseña para <strong>{showResetDialog?.nombre} {showResetDialog?.apellido}</strong>
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-2">
              <Label>Nueva Contraseña</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowResetDialog(null)}>
                Cancelar
              </Button>
              <Button onClick={handleResetPassword} className="bg-amber-600 hover:bg-amber-700">
                Restablecer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DashboardLayout>
    </>
  );
};

export default UsersPage;
