import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Upload, FileText, Download, Trash2 } from 'lucide-react';

const FileUpload = ({ plantId, files = [], onUpload, onDelete, canUpload = true, canDeleteFile }) => {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [fileToDelete, setFileToDelete] = useState(null);

  const handleFileChange = async (e) => {
    const selectedFiles = Array.from(e.target.files);
    if (selectedFiles.length === 0) return;

    setUploading(true);
    
    // Pasar los archivos reales al padre para que suba via API
    await onUpload(selectedFiles);
    setUploading(false);
    e.target.value = '';
  };

  const handleDelete = (fileId) => {
    if (onDelete) {
      onDelete(fileId);
    }
    setFileToDelete(null);
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <FileText className="w-5 h-5 text-cyan-600" />
          Documentos y Archivos
        </h3>
        {canUpload && onUpload && (
          <label htmlFor="file-upload">
            <Button
              type="button"
              disabled={uploading}
              className="bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-700 hover:to-teal-700"
              onClick={() => document.getElementById('file-upload').click()}
            >
              <Upload className="w-4 h-4 mr-2" />
              {uploading ? 'Subiendo...' : 'Subir Archivos'}
            </Button>
            <input
              id="file-upload"
              type="file"
              multiple
              onChange={handleFileChange}
              className="hidden"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
            />
          </label>
        )}
      </div>

      {files.length > 0 ? (
        <div className="space-y-2">
          {files.map((file) => (
            <div
              key={file.id}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <FileText className="w-5 h-5 text-cyan-600 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-gray-900 truncate">{file.nombre_original || file.name}</p>
                  <p className="text-sm text-gray-500">
                    {formatFileSize(file.tamano || file.size)} • {new Date(file.created_at || file.uploadedAt).toLocaleDateString('es-ES')}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const token = localStorage.getItem('token');
                    const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000';
                    window.open(`${apiBaseUrl}/api/archivos/download/${file.id}?token=${token}`, '_blank');
                  }}
                >
                  <Download className="w-4 h-4" />
                </Button>
                {canDeleteFile && canDeleteFile(file) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setFileToDelete(file)}
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-400">
          <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>No hay archivos adjuntos</p>
          <p className="text-sm">Sube certificados, reportes o documentos importantes</p>
        </div>
      )}

      <AlertDialog open={!!fileToDelete} onOpenChange={(open) => !open && setFileToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar archivo?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará el archivo <strong>"{fileToDelete?.nombre_original || fileToDelete?.name}"</strong>. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleDelete(fileToDelete?.id)}
              className="bg-red-600 hover:bg-red-700"
            >
              Sí, eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default FileUpload;