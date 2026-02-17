import { motion, AnimatePresence } from 'framer-motion';
import styles from './PremiumCheckmark.module.css';

interface PremiumCheckmarkProps {
    checked: boolean;
    onClick: () => void;
}

export const PremiumCheckmark = ({ checked, onClick }: PremiumCheckmarkProps) => (
    <motion.div
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={onClick}
        className={`${styles.checkmark} ${checked ? styles.checked : styles.unchecked}`}
    >
        <AnimatePresence>
            {checked && (
                <motion.svg
                    viewBox="0 0 24 24"
                    fill="none"
                    className={styles.svg}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                >
                    <motion.path
                        d="M5 13l4 4L19 7"
                        stroke="currentColor"
                        strokeWidth="3.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: 0.3, delay: 0.1 }}
                    />
                </motion.svg>
            )}
        </AnimatePresence>
    </motion.div>
);
