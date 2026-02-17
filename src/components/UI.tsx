import React from 'react';
import { motion } from 'framer-motion';
import styles from './UI.module.css';

export const Card = ({ children, className = '', style = {} }: { children: React.ReactNode, className?: string, style?: React.CSSProperties }) => (
    <div className={`${styles.card} ${className}`} style={style}>
        {children}
    </div>
);

export const Button = ({
    children,
    variant = 'primary',
    onClick,
    className = '',
    disabled = false,
    icon: Icon,
    style = {},
    title
}: {
    children?: React.ReactNode,
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost',
    onClick?: (e?: any) => void,
    className?: string,
    disabled?: boolean,
    icon?: any,
    style?: React.CSSProperties,
    title?: string
}) => {
    const variantClass = {
        primary: styles.btnPrimary,
        secondary: styles.btnSecondary,
        outline: styles.btnOutline,
        ghost: styles.btnGhost
    }[variant];

    return (
        <button
            onClick={onClick}
            disabled={disabled}
            title={title}
            className={`${styles.btn} ${variantClass} ${className}`}
            style={style}
        >
            {Icon && <Icon size={18} />}
            {children}
        </button>
    );
};

export const Input = ({
    label,
    type = 'text',
    placeholder,
    value,
    onChange,
    className = '',
    style = {}
}: {
    label?: string,
    type?: string,
    placeholder?: string,
    value?: string,
    onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void,
    className?: string,
    style?: React.CSSProperties
}) => (
    <div className={`${styles.inputWrapper} ${className}`} style={style}>
        {label && <label className={styles.inputLabel}>{label}</label>}
        <input
            type={type}
            placeholder={placeholder}
            value={value}
            onChange={onChange}
            className={styles.input}
        />
    </div>
);

export const Modal = ({
    isOpen,
    onClose,
    title,
    children,
    maxWidth = '500px',
    padding = '32px',
    showHeader = true
}: {
    isOpen: boolean,
    onClose: () => void,
    title?: string,
    children: React.ReactNode,
    maxWidth?: string,
    padding?: string,
    showHeader?: boolean
}) => {
    if (!isOpen) return null;

    return (
        <div className={styles.modalOverlay}>
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className={styles.modalContent}
                style={{ maxWidth, padding }}
            >
                {showHeader && (
                    <div className={styles.modalHeader}>
                        <h2 className={styles.modalTitle}>{title}</h2>
                        <button onClick={onClose} className={styles.modalCloseBtn}>
                            &times;
                        </button>
                    </div>
                )}
                {children}
            </motion.div>
        </div>
    );
};
