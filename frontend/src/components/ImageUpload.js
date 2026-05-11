import React, { useRef, useState } from 'react';
import { Button } from './ui/button';
import { toast } from 'sonner';
import axios from 'axios';
import { Upload, X, Image, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from '../context/AuthContext';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ImageUpload = ({ value, onChange, className }) => {
  const { token } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(value || null);
  const fileInputRef = useRef(null);

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Tipo de archivo no permitido. Usa JPG, PNG, GIF o WebP');
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('El archivo es muy grande. Máximo 5MB');
      return;
    }

    // Show preview immediately
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target.result);
    reader.readAsDataURL(file);

    // Upload to server
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await axios.post(`${API}/upload-image`, formData, {
        headers: { 'Content-Type': 'multipart/form-data', Authorization: `Bearer ${token}` }
      });

      const imageUrl = `${BACKEND_URL}${response.data.url}`;
      setPreview(imageUrl);
      onChange(imageUrl);
      toast.success('Imagen subida correctamente');
    } catch (error) {
      const message = error.response?.data?.detail || 'Error al subir imagen';
      toast.error(message);
      setPreview(null);
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    setPreview(null);
    onChange('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        onChange={handleFileSelect}
        className="hidden"
        data-testid="image-upload-input"
      />

      {preview ? (
        <div className="relative rounded-xl overflow-hidden border-2 border-slate-200 bg-slate-50">
          <img
            src={preview}
            alt="Preview del premio"
            className="w-full h-48 object-cover"
          />
          <button
            type="button"
            onClick={handleRemove}
            className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
            data-testid="remove-image-btn"
          >
            <X className="w-4 h-4" />
          </button>
          {uploading && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-white animate-spin" />
            </div>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="w-full h-48 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 hover:bg-slate-100 hover:border-orange-400 transition-all flex flex-col items-center justify-center gap-3 cursor-pointer"
          data-testid="upload-image-btn"
        >
          {uploading ? (
            <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
          ) : (
            <>
              <div className="w-14 h-14 bg-slate-200 rounded-full flex items-center justify-center">
                <Image className="w-7 h-7 text-slate-500" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-slate-700">
                  Haz clic para subir imagen
                </p>
                <p className="text-xs text-slate-500">
                  JPG, PNG, GIF o WebP (máx. 5MB)
                </p>
              </div>
            </>
          )}
        </button>
      )}
    </div>
  );
};

export default ImageUpload;
