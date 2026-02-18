import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import styles from './ThemeToggle.module.css';
import { motion } from 'framer-motion';

export const ThemeToggle = () => {
    const { theme, toggleTheme } = useTheme();

    return (
        <button
            onClick={toggleTheme}
            className={styles.toggle}
            title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        >
            <motion.div
                initial={false}
                animate={{ x: theme === 'light' ? 0 : 36 }}
                className={styles.slider}
            >
                {theme === 'light' ? (
                    <Sun size={18} className={styles.icon} />
                ) : (
                    <Moon size={18} className={styles.icon} />
                )}
            </motion.div>
            <div className={styles.background}>
                <Sun size={14} className={styles.bgIcon} />
                <Moon size={14} className={styles.bgIcon} />
            </div>
        </button>
    );
};
