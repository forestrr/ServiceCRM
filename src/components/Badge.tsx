import React from 'react';
import styles from './Badge.module.css';

type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'purple' | 'neutral';

interface BadgeProps {
    children: React.ReactNode;
    variant?: BadgeVariant;
    icon?: React.ReactNode;
    pill?: boolean;
    className?: string;
}

export const Badge = ({
    children,
    variant = 'neutral',
    icon,
    pill = false,
    className = ''
}: BadgeProps) => (
    <span className={`${styles.badge} ${styles[variant]} ${pill ? styles.pill : ''} ${className}`}>
        {icon && <span className={styles.icon}>{icon}</span>}
        {children}
    </span>
);
