import { useState, useEffect, useCallback } from 'react';
import { obrasAPI } from '@/services/api';

const useObras = () => {
  const [obras, setObras] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const notifyObrasChanged = useCallback(() => {
    window.dispatchEvent(new Event('obra:changed'));
  }, []);

  const loadObras = useCallback(async (params = {}) => {
    try {
      setLoading(true);
      setError(null);
      const data = await obrasAPI.list(params);
      setObras(data.obras || []);
      return data.obras || [];
    } catch (err) {
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadObras();
  }, [loadObras]);

  const addObra = useCallback(async (obraData) => {
    try {
      const data = await obrasAPI.create(obraData);
      await loadObras(); // Recargar lista
      notifyObrasChanged();
      return { success: true, obra: data.obra };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }, [loadObras, notifyObrasChanged]);

  const updateObra = useCallback(async (obraId, obraData) => {
    try {
      const data = await obrasAPI.update(obraId, obraData);
      await loadObras();
      notifyObrasChanged();
      return { success: true, obra: data.obra };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }, [loadObras, notifyObrasChanged]);

  const deleteObra = useCallback(async (obraId) => {
    try {
      await obrasAPI.delete(obraId);
      await loadObras();
      notifyObrasChanged();
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }, [loadObras, notifyObrasChanged]);

  const getObra = useCallback(async (obraId) => {
    try {
      const data = await obrasAPI.getById(obraId);
      return data.obra;
    } catch (err) {
      setError(err.message);
      return null;
    }
  }, []);

  const getStats = useCallback(() => {
    const enConstruccion = obras.filter((o) => o.estado === 'en_construccion').length;
    const operativa = obras.filter((o) => o.estado === 'operativa').length;
    const enEstudio = obras.filter((o) => o.estado === 'en_estudio').length;
    const suspendida = obras.filter((o) => o.estado === 'suspendida').length;
    const finalizada = obras.filter((o) => o.estado === 'finalizada').length;
    return {
      total: obras.length,
      enConstruccion,
      operativa,
      enEstudio,
      suspendida,
      finalizada,
    };
  }, [obras]);

  return {
    obras,
    loading,
    error,
    loadObras,
    addObra,
    updateObra,
    deleteObra,
    getObra,
    getStats,
  };
};

export default useObras;
