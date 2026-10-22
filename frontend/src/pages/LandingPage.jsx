import React from "react";
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Logo from "@/components/icons/logo.svg";
import {
  Droplets,
  Shield,
  BarChart3,
  MapPin,
  FileText,
  Users,
} from "lucide-react";

const LandingPage = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: <Droplets className="w-8 h-8" />,
      title: "Gestión Centralizada",
      description: "Administra todas las plantas hídricas desde un solo lugar",
    },
    {
      icon: <MapPin className="w-8 h-8" />,
      title: "Mapa Interactivo",
      description:
        "Visualiza la ubicación exacta de cada planta en tiempo real",
    },
    {
      icon: <BarChart3 className="w-8 h-8" />,
      title: "Análisis y Reportes",
      description:
        "Gráficos detallados del estado operativo de las instalaciones",
    },
    {
      icon: <FileText className="w-8 h-8" />,
      title: "Documentación",
      description: "Posibilidad de adjuntar certificados, reportes y archivos importantes",
    },
    {
      icon: <Users className="w-8 h-8" />,
      title: "Control de Acceso",
      description: "Roles diferenciados para administradores y técnicos",
    },
    {
      icon: <Shield className="w-8 h-8" />,
      title: "Seguridad",
      description: "Datos protegidos con los más altos estándares",
    },
  ];

  return (
    <>
      <Helmet>
        <title>
          Recursos Hidricos de SDE - Gestión Profesional de Plantas Hídricas
        </title>
        <meta
          name="description"
          content="Sistema profesional para administrar y organizar datos de plantas hídricas. Gestión centralizada, mapas interactivos y análisis en tiempo real."
        />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-blue-50 to-teal-50">
        <nav className="bg-white/80 backdrop-blur-md border-b border-cyan-100 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center space-x-2">
                <img src={Logo} alt="Logo" width={32} height={32} />
                <span className="text-2xl font-bold bg-gradient-to-r from-cyan-600 to-teal-600 bg-clip-text text-transparent">
                  Recursos Hidricos de SDE
                </span>
              </div>
              <div className="flex items-center space-x-4">
                <Button 
                className="bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-700 hover:to-teal-700" 
                onClick={() => navigate("/login")}>
                  Iniciar Sesión
                </Button>
                
              </div>
            </div>
          </div>
        </nav>

        <section className="relative overflow-hidden py-20 px-4">
          <div className="max-w-7xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="text-center"
            >
              <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
                Gestión Inteligente de
                <span className="block bg-gradient-to-r from-cyan-600 to-teal-600 bg-clip-text text-transparent">
                  Plantas Hídricas
                </span>
              </h1>
              <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
                Plataforma profesional para administrar, monitorear y optimizar
                todas las instalaciones hídricas desde un solo lugar
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  size="lg"
                  onClick={() => navigate("/login")}
                  className="bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-700 hover:to-teal-700 text-lg px-8"
                >
                  Acceso al Sistema
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => navigate("/login")}
                  className="text-lg px-8 border-cyan-600 text-cyan-600 hover:bg-cyan-50"
                >
                  Ver Demo
                </Button>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="mt-16"
            >
              <img
                className="rounded-2xl shadow-2xl w-full max-w-5xl mx-auto"
                alt="Dashboard de gestión de plantas hídricas"
                src="https://images.unsplash.com/photo-1686061593213-98dad7c599b9"
              />
            </motion.div>
          </div>
        </section>

        <section className="py-20 px-4 bg-white">
          <div className="max-w-7xl mx-auto">
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <h2 className="text-4xl font-bold text-gray-900 mb-4">
                Modulos incluidos en la plataforma
              </h2>
              <p className="text-xl text-gray-600">
                Herramientas profesionales para una gestión eficiente
              </p>
            </motion.div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {features.map((feature, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  className="bg-gradient-to-br from-cyan-50 to-teal-50 p-6 rounded-xl border border-cyan-100 hover:shadow-lg transition-all duration-300"
                >
                  <div className="w-16 h-16 bg-gradient-to-br from-cyan-600 to-teal-600 rounded-lg flex items-center justify-center text-white mb-4">
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600">{feature.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20 px-4 bg-gradient-to-br from-cyan-600 to-teal-600 text-white">
          <div className="max-w-4xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
            >
              <h2 className="text-4xl font-bold mb-6">
                Portal de acceso
              </h2>
              <p className="text-xl mb-8 text-cyan-50">
                Inicia sesion para empezar a gestionar
              </p>
              <Button
                size="lg"
                onClick={() => navigate("/register")}
                className="bg-white text-cyan-600 hover:bg-gray-100 text-lg px-8"
              >
                Iniciar Sesión
              </Button>
            </motion.div>
          </div>
        </section>

        <footer className="bg-gray-900 text-gray-300 py-12 px-4">
          <div className="max-w-7xl mx-auto text-center">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <Droplets className="w-6 h-6 text-cyan-400" />
              <span className="text-xl font-bold text-white">
                Recursos Hidricos de SDE
              </span>
            </div>
            <p className="text-sm">
              © {new Date().getFullYear()} Recursos Hidricos de SDE. Gestión profesional de plantas
              hídricas.
            </p>
          </div>
        </footer>
      </div>
    </>
  );
};

export default LandingPage;
