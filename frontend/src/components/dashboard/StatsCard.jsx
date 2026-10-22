import React from 'react';
import { motion } from 'framer-motion';

const StatsCard = ({ title, value, icon, color, bgColor, onClick }) => {
  return (
    <motion.button
      whileHover={{ y: -2 }}
      onClick={onClick}
      className={`${bgColor} rounded-xl p-6 border border-gray-200 hover:shadow-lg transition-all duration-300 cursor-pointer w-full text-left dark:text-gray-100 dark:hover:shadow-black/20`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 mb-1 dark:text-gray-300">{title}</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{value}</p>
        </div>
        <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${color} flex items-center justify-center text-white shadow-sm dark:shadow-black/20`}>
          {icon}
        </div>
      </div>
    </motion.button>
  );
};

export default StatsCard;