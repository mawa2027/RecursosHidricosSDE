import React, { useState } from "react";
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Mail, Lock } from "lucide-react";
import Logo from "../components/icons/logo.svg";

const LoginPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    correo: "",
    contrasena: "",
  });
  const [errors, setErrors] = useState({});

  const validate = () => {
    const newErrors = {};
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
    const result = await login(formData.correo, formData.contrasena);
    setLoading(false);

    if (result.success) {
      toast({
        title: "¡Bienvenido!",
        description: "Has iniciado sesión correctamente",
      });
      navigate("/dashboard");
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
        <title>Iniciar Sesión - Recursos Hidricos de SDE</title>
        <meta
          name="description"
          content="Accede a tu cuenta de Recursos Hidricos de SDE para gestionar tus plantas hídricas"
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
                <div
                  style={{ display: "flex", alignItems: "center", gap: "10px" }}
                >
                  <img src={Logo} alt="Logo" width={64} height={64} />
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-600 to-teal-600 bg-clip-text text-transparent">
                    Recursos Hidricos de SDE
                  </h1>
                </div>
              </div>
              <h1 className="text-2xl font-bold text-gray-900">
                Iniciar Sesión
              </h1>
              <p className="text-gray-600 mt-2">Accede a tu cuenta</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
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
                    placeholder="••••••••"
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

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-700 hover:to-teal-700"
              >
                {loading ? "Iniciando sesión..." : "Iniciar Sesión"}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-gray-600">
                ¿Tienes problemas para iniciar sesion? {" "}
                <Link
                  to="/NotFoundPage"
                  className="text-cyan-600 hover:text-cyan-700 font-semibold"
                >
                  <br />Contacta con un administrador para obtener ayuda
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

export default LoginPage;
