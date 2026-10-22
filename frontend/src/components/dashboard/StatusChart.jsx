import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

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

const ESTADO_COLORS = {
  en_funcionamiento: '#10b981',
  en_reparacion: '#f59e0b',
  fuera_de_servicio: '#ef4444',
  en_construccion: '#3b82f6',
  en_estudio: '#8b5cf6',
  operativa: '#10b981',
  suspendida: '#f59e0b',
  finalizada: '#6b7280',
};

const StatusChart = ({ chartData }) => {
  const data = chartData?.distribucionEstados?.map(item => ({
    name: ESTADO_LABELS[item.estado] || item.estado,
    value: parseInt(item.count),
    color: ESTADO_COLORS[item.estado] || '#94a3b8',
  })) || [];

  const hasData = data.some(d => d.value > 0);

  return (
    <div className="bg-white rounded-xl p-6 border border-gray-200 h-full dark:bg-slate-900 dark:border-slate-800">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 dark:text-gray-100">Distribución por Estado</h3>
      {hasData ? (
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-[300px] flex items-center justify-center text-gray-400 dark:text-gray-500">
          No hay datos para mostrar
        </div>
      )}
    </div>
  );
};

export default StatusChart;