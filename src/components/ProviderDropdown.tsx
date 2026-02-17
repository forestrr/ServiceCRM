import { useState, useRef, useEffect } from 'react';
import { Building2, ChevronDown, Check, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './ProviderDropdown.module.css';

interface Provider {
    id: string;
    name: string;
}

interface ProviderDropdownProps {
    providers: Provider[];
    selectedId?: string;
    onSelect: (provider: Provider | null) => void;
}

export const ProviderDropdown = ({ providers, selectedId, onSelect }: ProviderDropdownProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const dropdownRef = useRef<HTMLDivElement>(null);

    const selected = providers.find(p => p.id === selectedId);

    const filtered = providers.filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase())
    );

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className={styles.wrapper} ref={dropdownRef}>
            <div
                className={`${styles.trigger} ${isOpen ? styles.triggerActive : ''}`}
                onClick={() => setIsOpen(!isOpen)}
            >
                <Building2 size={16} className={styles.icon} />
                <span className={styles.label}>
                    {selected ? selected.name : 'Select Provider...'}
                </span>
                <ChevronDown size={14} className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ''}`} />
            </div>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 4, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 4, scale: 0.98 }}
                        className={styles.dropdown}
                    >
                        <div className={styles.searchContainer}>
                            <Search size={14} className={styles.searchIcon} />
                            <input
                                className={styles.searchInput}
                                placeholder="Search partners..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                                autoFocus
                            />
                        </div>
                        <div className={styles.list}>
                            <div
                                className={`${styles.option} ${!selectedId ? styles.optionActive : ''}`}
                                onClick={() => {
                                    onSelect(null);
                                    setIsOpen(false);
                                }}
                            >
                                <span className={styles.optionText}>None (Internal)</span>
                                {!selectedId && <Check size={14} className={styles.check} />}
                            </div>
                            {filtered.map(p => (
                                <div
                                    key={p.id}
                                    className={`${styles.option} ${selectedId === p.id ? styles.optionActive : ''}`}
                                    onClick={() => {
                                        onSelect(p);
                                        setIsOpen(false);
                                    }}
                                >
                                    <span className={styles.optionText}>{p.name}</span>
                                    {selectedId === p.id && <Check size={14} className={styles.check} />}
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
