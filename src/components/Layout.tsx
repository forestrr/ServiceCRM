import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
    LayoutDashboard,
    Users,
    Settings,
    ClipboardList,
    Bell,
    CheckCircle2,
    Truck
} from 'lucide-react';
import styles from './Layout.module.css';

const Sidebar = () => {
    const location = useLocation();

    const menuItems = [
        { icon: <LayoutDashboard size={20} />, label: 'Dashboard', path: '/' },
        { icon: <Users size={20} />, label: 'Customers', path: '/customers' },
        { icon: <ClipboardList size={20} />, label: 'Applications', path: '/applications' },
        { icon: <Truck size={20} />, label: 'Service Providers', path: '/providers' },
        { icon: <Settings size={20} />, label: 'Service Settings', path: '/settings' },
    ];

    return (
        <div className={styles.sidebar}>
            <div className={styles.logo}>
                <div className={styles.logoIcon}>
                    <CheckCircle2 size={20} color="white" />
                </div>
                <h2 className={styles.logoText}>Service CRM</h2>
            </div>

            <nav className={styles.nav}>
                {menuItems.map((item, index) => {
                    const isActive = location.pathname === item.path;
                    return (
                        <Link
                            key={index}
                            to={item.path}
                            className={`${styles.navLink} ${isActive ? styles.navLinkActive : ''}`}
                        >
                            {item.icon}
                            <span className={styles.navLabel}>{item.label}</span>
                        </Link>
                    );
                })}
            </nav>

            <div className={styles.footer}>
                <div className={styles.notificationBtn}>
                    <Bell size={20} />
                    <span className={styles.navLabel}>Notifications</span>
                </div>
            </div>
        </div>
    );
};

export const Layout = ({ children }: { children: React.ReactNode }) => (
    <div className={styles.layoutRoot}>
        <Sidebar />
        <main className={styles.mainContent}>
            {children}
        </main>
    </div>
);
