import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'hydroPlants';

const usePlants = () => {
  const [plants, setPlants] = useState([]);

  const loadPlants = useCallback(() => {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    setPlants(stored);
    return stored;
  }, []);

  useEffect(() => {
    loadPlants();
  }, [loadPlants]);

  const savePlants = useCallback((updatedPlants) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedPlants));
    setPlants(updatedPlants);
  }, []);

  const addPlant = useCallback((plantData) => {
    const newPlant = {
      ...plantData,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
    };
    const updated = [...plants, newPlant];
    savePlants(updated);
    return newPlant;
  }, [plants, savePlants]);

  const updatePlant = useCallback((plantId, plantData) => {
    const updated = plants.map((p) =>
      p.id === plantId ? { ...plantData, id: plantId } : p
    );
    savePlants(updated);
    return updated.find((p) => p.id === plantId);
  }, [plants, savePlants]);

  const deletePlant = useCallback((plantId) => {
    const updated = plants.filter((p) => p.id !== plantId);
    savePlants(updated);
  }, [plants, savePlants]);

  const getPlant = useCallback((plantId) => {
    return plants.find((p) => p.id === plantId) || null;
  }, [plants]);

  const addFilesToPlant = useCallback((plantId, files) => {
    const updated = plants.map((p) => {
      if (p.id === plantId) {
        return { ...p, files: [...(p.files || []), ...files] };
      }
      return p;
    });
    savePlants(updated);
    return updated.find((p) => p.id === plantId);
  }, [plants, savePlants]);

  const removeFileFromPlant = useCallback((plantId, fileId) => {
    const updated = plants.map((p) => {
      if (p.id === plantId) {
        return { ...p, files: (p.files || []).filter((f) => f.id !== fileId) };
      }
      return p;
    });
    savePlants(updated);
    return updated.find((p) => p.id === plantId);
  }, [plants, savePlants]);

  const getStats = useCallback(() => {
    const activeCount = plants.filter((p) => p.status === 'activo').length;
    const maintenanceCount = plants.filter((p) => p.status === 'mantenimiento').length;
    const inactiveCount = plants.filter((p) => p.status === 'inactivo').length;
    return {
      total: plants.length,
      active: activeCount,
      maintenance: maintenanceCount,
      inactive: inactiveCount,
    };
  }, [plants]);

  const exportToCSV = useCallback(() => {
    if (plants.length === 0) return null;

    const headers = ['Nombre', 'Ubicación', 'Estado', 'Responsable', 'Última Inspección', 'Latitud', 'Longitud', 'Descripción'];
    const rows = plants.map((p) => [
      p.name,
      p.location,
      p.status,
      p.responsible,
      p.lastInspection,
      p.coordinates?.lat,
      p.coordinates?.lng,
      p.description || '',
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `plantas_hidricas_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    return true;
  }, [plants]);

  return {
    plants,
    loadPlants,
    addPlant,
    updatePlant,
    deletePlant,
    getPlant,
    addFilesToPlant,
    removeFileFromPlant,
    getStats,
    exportToCSV,
  };
};

export default usePlants;
