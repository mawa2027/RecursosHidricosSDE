import React from 'react';
import { Calendar, Activity } from 'lucide-react';

const RecentActivity = ({ activity = [] }) => {
  return (
    <div className="bg-white rounded-xl p-6 border border-gray-200 h-full dark:bg-slate-900 dark:border-slate-800">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 dark:text-gray-100">Actividad Reciente</h3>
      {activity.length > 0 ? (
        <div className="space-y-4">
          {activity.map((item) => (
            <div key={item.id} className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors dark:hover:bg-slate-800/70">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-600 to-teal-600 flex items-center justify-center text-white flex-shrink-0">
                <Activity className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate dark:text-gray-100">{item.titulo}</p>
                <p className="text-sm text-gray-500 truncate dark:text-gray-400">
                  {item.usuario_nombre} {item.usuario_apellido} — {item.entidad}
                </p>
                <div className="flex items-center text-xs text-gray-400 mt-1 dark:text-gray-500">
                  <Calendar className="w-3 h-3 mr-1" />
                  {new Date(item.fecha).toLocaleString('es-AR')}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="h-[300px] flex items-center justify-center text-gray-400 dark:text-gray-500">
          No hay actividad reciente
        </div>
      )}
    </div>
  );
};

export default RecentActivity;