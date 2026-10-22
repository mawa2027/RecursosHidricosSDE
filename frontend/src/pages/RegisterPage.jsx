import React, { useState } from "react";
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { Droplets, Mail, Lock, User, Briefcase } from "lucide-react";

const RegisterPage = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nombre: "",
    apellido: "",
    correo: "",
    contrasena: "",
    rol: "inspector",
  });
  const [errors, setErrors] = useState({});

  const validate = () => {
    const newErrors = {};
    if (!formData.nombre || formData.nombre.trim().length < 2) {
      newErrors.nombre = "El nombre debe tener al menos 2 caracteres";
    }
    if (!formData.apellido || formData.apellido.trim().length < 2) {
      newErrors.apellido = "El apellido debe tener al menos 2 caracteres";
    }
    if (!formData.correo) {
      newErrors.correo = "El email es requerido";
    } else if (!/\S+@\S+\.\S+/.test(formData.correo)) {
      newErrors.correo = "El email no es válido";
    }
    if (!formData.contrasena) {
      newErrors.contrasena = "La contraseña es requerida";
    } else if (formData.contrasena.length < 6) {
      newErrors.contrasena = "La contraseña debe tener al menos 6 caracteres";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    const result = await register(formData);
    setLoading(false);

    if (result.success) {
      toast({
        title: "¡Cuenta creada!",
        description: "Tu cuenta ha sido creada exitosamente. Ya puedes iniciar sesión.",
      });
      navigate("/login");
    } else {
      toast({
        title: "Error",
        description: result.error,
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <Helmet>
        <title>Registrarse - Recursos Hidricos de SDE</title>
        <meta
          name="description"
          content="Crea tu cuenta en Recursos Hidricos de SDE y comienza a gestionar tus plantas hídricas"
        />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-blue-50 to-teal-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-cyan-100">
            <div className="text-center mb-8">
              <div className="flex items-center justify-center space-x-2 mb-4">
                <Droplets className="w-10 h-10 text-cyan-600" />
                <span className="text-3xl font-bold bg-gradient-to-r from-cyan-600 to-teal-600 bg-clip-text text-transparent">
                  Recursos Hidricos de SDE
                </span>
              </div>
              <h1 className="text-2xl font-bold text-gray-900">Crear Cuenta</h1>
              <p className="text-gray-600 mt-2">
                Únete a Recursos Hidricos de SDE
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <Input
                    id="nombre"
                    type="text"
                    placeholder="Juan"
                    value={formData.nombre}
                    onChange={(e) => {
                      setFormData({ ...formData, nombre: e.target.value });
                      if (errors.nombre) setErrors({ ...errors, nombre: "" });
                    }}
                    className={`pl-10 ${errors.nombre ? "border-red-500" : ""}`}
                    required
                  />
                </div>
                {errors.nombre && <p className="text-sm text-red-500">{errors.nombre}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="apellido">Apellido</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <Input
                    id="apellido"
                    type="text"
                    placeholder="Pérez"
                    value={formData.apellido}
                    onChange={(e) => {
                      setFormData({ ...formData, apellido: e.target.value });
                      if (errors.apellido) setErrors({ ...errors, apellido: "" });
                    }}
                    className={`pl-10 ${errors.apellido ? "border-red-500" : ""}`}
                    required
                  />
                </div>
                {errors.apellido && <p className="text-sm text-red-500">{errors.apellido}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="correo">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <Input
                    id="correo"
                    type="email"
                    placeholder="tu@email.com"
                    value={formData.correo}
                    onChange={(e) => {
                      setFormData({ ...formData, correo: e.target.value });
                      if (errors.correo) setErrors({ ...errors, correo: "" });
                    }}
                    className={`pl-10 ${errors.correo ? "border-red-500" : ""}`}
                    required
                  />
                </div>
                {errors.correo && <p className="text-sm text-red-500">{errors.correo}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="contrasena">Contraseña</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <Input
                    id="contrasena"
                    type="password"
                    placeholder="Mínimo 6 caracteres"
                    value={formData.contrasena}
                    onChange={(e) => {
                      setFormData({ ...formData, contrasena: e.target.value });
                      if (errors.contrasena) setErrors({ ...errors, contrasena: "" });
                    }}
                    className={`pl-10 ${errors.contrasena ? "border-red-500" : ""}`}
                    required
                  />
                </div>
                {errors.contrasena && <p className="text-sm text-red-500">{errors.contrasena}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="rol">Rol</Label>
                <Select
                  value={formData.rol}
                  onValueChange={(value) =>
                    setFormData({ ...formData, rol: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="inspector">Inspector</SelectItem>
                    <SelectItem value="dpto_construccion">Dpto. Construcción</SelectItem>
                    <SelectItem value="dpto_estudios">Dpto. Estudios</SelectItem>
                    <SelectItem value="dpto_conservacion">Dpto. Conservación</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-700 hover:to-teal-700"
              >
                {loading ? "Creando cuenta..." : "Crear Cuenta"}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-gray-600">
                ¿Ya tienes cuenta?{" "}
                <Link
                  to="/login"
                  className="text-cyan-600 hover:text-cyan-700 font-semibold"
                >
                  Inicia sesión
                </Link>
              </p>
            </div>

            <div className="mt-4 text-center">
              <Link
                to="/"
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                ← Volver al inicio
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </>
  );
};

export default RegisterPage;
