import React from "react";
import { Droplets } from "lucide-react";

const LoadingSpinner = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-blue-50 to-teal-50 flex items-center justify-center">
      <div className="text-center">
        <Droplets className="w-12 h-12 text-cyan-600 mx-auto mb-4 animate-bounce" />
        <p className="text-gray-600 font-medium">Cargando...</p>
      </div>
    </div>
  );
};

export default LoadingSpinner;
