import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
    LayoutDashboard,
    Users,
    Settings,
    ClipboardList,
    Bell,
    CheckCircle2,
    Truck,
    LogOut,
    User
} from 'lucide-react';
import styles from './Layout.module.css';
import { useAuth } from '../contexts/AuthContext';
import { ThemeToggle } from './ThemeToggle';

const Sidebar = () => {
    const location = useLocation();
    const { user, profile, signOut } = useAuth();

    const menuItems = [
        { icon: <LayoutDashboard size={20} />, label: 'Dashboard', path: '/' },
        { icon: <Users size={20} />, label: 'Customers', path: '/customers' },
        { icon: <ClipboardList size={20} />, label: 'Applications', path: '/applications' },
        { icon: <Truck size={20} />, label: 'Service Providers', path: '/providers' },
        { icon: <Settings size={20} />, label: 'Service Settings', path: '/settings' },
    ];

    const getInitials = () => {
        if (profile?.full_name) {
            return profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
        }
        return user?.email?.[0].toUpperCase() || 'U';
    };

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
                <div className={styles.themeToggleWrapper}>
                    <ThemeToggle />
                </div>

                <div className={styles.userInfo}>
                    <div className={styles.userAvatar}>
                        {getInitials()}
                    </div>
                    <div className={styles.userDetails}>
                        <span className={styles.userName}>{profile?.full_name || 'Account'}</span>
                        <span className={styles.userEmail}>{user?.email}</span>
                    </div>
                </div>

                <Link to="/profile" className={styles.profileBtn} title="My Profile">
                    <User size={20} />
                    <span className={styles.navLabel}>My Profile</span>
                </Link>

                <div className={styles.notificationBtn}>
                    <Bell size={20} />
                    <span className={styles.navLabel}>Notifications</span>
                </div>

                <div className={styles.logoutBtn} onClick={() => signOut()} title="Sign Out">
                    <LogOut size={20} />
                    <span className={styles.navLabel}>Logout</span>
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
