import { useState } from 'react';
import { supabase } from '../lib/supabase';

interface UploadOptions {
    bucket: string;
    path: string;
    onProgress?: (progress: number) => void;
    maxSizeMB?: number;
    allowedTypes?: string[];
}

export const useFileUpload = () => {
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const uploadFile = async (file: File, options: UploadOptions) => {
        setUploading(true);
        setError(null);

        // 1. Client-side Validation (Safe & Fast)
        if (options.maxSizeMB && file.size > options.maxSizeMB * 1024 * 1024) {
            const err = `File size exceeds ${options.maxSizeMB}MB limit.`;
            setError(err);
            setUploading(false);
            throw new Error(err);
        }

        if (options.allowedTypes && !options.allowedTypes.includes(file.type)) {
            const err = `File type ${file.type} is not allowed.`;
            setError(err);
            setUploading(false);
            throw new Error(err);
        }

        try {
            // 2. Performance: Direct Upload with metadata
            const { data, error: uploadError } = await supabase.storage
                .from(options.bucket)
                .upload(options.path, file, {
                    cacheControl: '3600',
                    upsert: true
                });

            if (uploadError) throw uploadError;

            return data;
        } catch (err: any) {
            const message = err.message || 'Upload failed';
            setError(message);
            throw err;
        } finally {
            setUploading(false);
        }
    };

    const deleteFile = async (bucket: string, path: string) => {
        try {
            const { error: deleteError } = await supabase.storage
                .from(bucket)
                .remove([path]);
            if (deleteError) throw deleteError;
        } catch (err: any) {
            console.error('File cleanup failed:', err);
        }
    };

    return { uploadFile, deleteFile, uploading, error };
};
