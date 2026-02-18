import React, { useState, useRef } from 'react';
import { Upload, AlertCircle, Loader2 } from 'lucide-react';
import styles from './FileDropzone.module.css';

interface FileDropzoneProps {
    onFileSelect: (file: File) => void;
    uploading?: boolean;
    error?: string | null;
    accept?: string;
    maxSizeMB?: number;
}

export const FileDropzone: React.FC<FileDropzoneProps> = ({
    onFileSelect,
    uploading = false,
    error,
    accept = "image/*,application/pdf",
    maxSizeMB = 10
}) => {
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) handleFile(file);
    };

    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) handleFile(file);
    };

    const handleFile = (file: File) => {
        onFileSelect(file);
    };

    return (
        <div
            className={`${styles.dropzone} ${isDragging ? styles.dragging : ''} ${error ? styles.error : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
        >
            <input
                type="file"
                className={styles.hiddenInput}
                ref={fileInputRef}
                onChange={handleFileInput}
                accept={accept}
                disabled={uploading}
            />

            {uploading ? (
                <div className={styles.progressOverlay}>
                    <Loader2 className="animate-spin" size={32} color="var(--primary)" />
                    <p className={styles.progressText}>Securing Transmission...</p>
                </div>
            ) : (
                <>
                    <div className={styles.iconWrapper}>
                        {error ? <AlertCircle size={32} /> : <Upload size={32} />}
                    </div>
                    <div className={styles.textContainer}>
                        <p className={styles.title}>
                            {error ? 'Validation Failed' : 'Drag & drop sensitive files'}
                        </p>
                        <p className={styles.subtitle}>
                            {error ? error : `PDF, JPEG, or PNG (Max ${maxSizeMB}MB)`}
                        </p>
                    </div>
                </>
            )}

            {error && !uploading && (
                <p className={styles.errorText}>Please try another file</p>
            )}
        </div>
    );
};
