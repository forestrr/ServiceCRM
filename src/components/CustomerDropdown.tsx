import { useState } from 'react';
import { Search, User, ChevronRight, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './CustomerDropdown.module.css';

interface Customer {
    id: string;
    name: string;
}

interface CustomerDropdownProps {
    customers: Customer[];
    selectedId: string;
    onSelect: (id: string) => void;
}

export const CustomerDropdown = ({ customers, selectedId, onSelect }: CustomerDropdownProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');

    const filtered = customers.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase())
    );

    const selected = customers.find(c => c.id === selectedId);

    return (
        <div className={styles.wrapper}>
            <div
                onClick={() => setIsOpen(!isOpen)}
                className={`${styles.trigger} ${isOpen ? styles.triggerOpen : ''}`}
            >
                <div className={styles.triggerContent}>
                    <div className={`${styles.triggerAvatar} ${selected ? styles.triggerAvatarActive : ''}`}>
                        <User size={18} />
                    </div>
                    <span className={`${styles.triggerText} ${selected ? styles.triggerTextActive : ''}`}>
                        {selected ? selected.name : 'Select Target Customer...'}
                    </span>
                </div>
                <ChevronRight size={20} className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ''}`} />
            </div>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        className={styles.dropdown}
                    >
                        <div className={styles.searchBox}>
                            <div className={styles.searchInputWrapper}>
                                <Search size={16} className={styles.searchIcon} />
                                <input
                                    autoFocus
                                    placeholder="Search customers..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    onClick={(e) => e.stopPropagation()}
                                    className={styles.searchInput}
                                />
                            </div>
                        </div>
                        <div className={styles.optionsList}>
                            {filtered.length === 0 ? (
                                <div className={styles.emptyState}>No customers found</div>
                            ) : filtered.map(c => (
                                <div
                                    key={c.id}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onSelect(c.id);
                                        setIsOpen(false);
                                    }}
                                    className={`${styles.option} ${selectedId === c.id ? styles.optionSelected : ''}`}
                                >
                                    <div className={styles.optionAvatar}>
                                        <User size={14} color="#94a3b8" />
                                    </div>
                                    <span className={styles.optionName}>{c.name}</span>
                                    {selectedId === c.id && <Check size={16} color="#7c3aed" className={styles.optionCheck} />}
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
