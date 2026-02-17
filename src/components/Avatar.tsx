import React from 'react';
import styles from './Avatar.module.css';

type AvatarSize = 'sm' | 'md' | 'lg';
type AvatarColor = 'primary' | 'blue' | 'neutral';

interface AvatarProps {
    name: string;
    size?: AvatarSize;
    color?: AvatarColor;
    icon?: React.ReactNode;
    className?: string;
}

const getInitials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').toUpperCase();

export const Avatar = ({
    name,
    size = 'md',
    color = 'primary',
    icon,
    className = ''
}: AvatarProps) => (
    <div className={`${styles.avatar} ${styles[size]} ${styles[color]} ${className}`}>
        {icon || getInitials(name)}
    </div>
);
