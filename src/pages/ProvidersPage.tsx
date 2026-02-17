import { useState, useEffect } from 'react';
import {
    Plus,
    Trash2,
    Loader2,
    Save,
    LayoutDashboard,
    CheckCircle2,
    Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button, Card, Input, Modal } from '../components/UI';
import { supabase } from '../lib/supabase';
import styles from './ProvidersPage.module.css';

interface ServiceProvider {
    id: string;
    name: string;
    email: string;
    phone: string;
    specialty: string;
    rating: number;
}

interface AssignedStep {
    id: string;
    label: string;
    is_completed: boolean;
    application: {
        id: string;
        service_template: {
            name: string;
        };
        customer: {
            name: string;
        };
    };
}

export const ProvidersPage = () => {
    const [providers, setProviders] = useState<ServiceProvider[]>([]);
    const [activeProviderId, setActiveProviderId] = useState<string | null>(null);
    const [assignedSteps, setAssignedSteps] = useState<AssignedStep[]>([]);
    const [loading, setLoading] = useState(true);
    const [stepsLoading, setStepsLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [isNewModalOpen, setIsNewModalOpen] = useState(false);

    // Form state for new provider
    const [newName, setNewName] = useState('');
    const [newEmail, setNewEmail] = useState('');
    const [newPhone, setNewPhone] = useState('');
    const [newSpecialty, setNewSpecialty] = useState('');

    useEffect(() => {
        fetchProviders();
    }, []);

    useEffect(() => {
        if (activeProviderId) {
            fetchWorkUpdates(activeProviderId);
        } else {
            setAssignedSteps([]);
        }
    }, [activeProviderId]);

    const fetchProviders = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('service_providers')
                .select('*')
                .order('name');
            if (error) throw error;
            setProviders(data || []);
        } catch (err) {
            console.error('Error fetching providers:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchWorkUpdates = async (providerId: string) => {
        setStepsLoading(true);
        try {
            const { data, error } = await supabase
                .from('application_steps')
                .select(`
                    id, 
                    label, 
                    is_completed,
                    application:applications (
                        id,
                        service_template:service_templates (name),
                        customer:customers (name)
                    )
                `)
                .eq('provider_id', providerId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setAssignedSteps(data as any || []);
        } catch (err) {
            console.error('Error fetching work updates:', err);
        } finally {
            setStepsLoading(false);
        }
    };

    const activeProvider = providers.find(p => p.id === activeProviderId);

    const updateProviderField = (field: string, value: any) => {
        setProviders(prev => prev.map(p => p.id === activeProviderId ? { ...p, [field]: value } : p));
    };

    const saveProvider = async () => {
        if (!activeProvider) return;
        setSaving(true);
        try {
            const { error } = await supabase
                .from('service_providers')
                .update({
                    name: activeProvider.name,
                    email: activeProvider.email,
                    phone: activeProvider.phone,
                    specialty: activeProvider.specialty,
                    rating: activeProvider.rating
                })
                .eq('id', activeProvider.id);

            if (error) throw error;
            alert('Provider details saved!');
        } catch (err) {
            console.error(err);
            alert('Error saving provider.');
        } finally {
            setSaving(false);
        }
    };

    const createProvider = async () => {
        if (!newName) return;
        try {
            const { error } = await supabase.from('service_providers').insert([{
                name: newName,
                email: newEmail,
                phone: newPhone,
                specialty: newSpecialty
            }]);

            if (error) throw error;
            setIsNewModalOpen(false);
            setNewName('');
            setNewEmail('');
            setNewPhone('');
            setNewSpecialty('');
            fetchProviders();
        } catch (err: any) {
            console.error(err);
            alert(`Error creating provider: ${err.message || 'Unknown error'}`);
        }
    };

    const deleteProvider = async (id: string) => {
        if (!confirm('Are you sure? This will unassign all their steps.')) return;
        try {
            const { error } = await supabase.from('service_providers').delete().eq('id', id);
            if (error) throw error;
            if (activeProviderId === id) setActiveProviderId(null);
            fetchProviders();
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div className={styles.page}>
            <div className={styles.header}>
                <div>
                    <h1 className={styles.title}>Service Providers</h1>
                    <p className={styles.subtitle}>Manage outsourcing partners and track their work status.</p>
                </div>
                <Button icon={Plus} onClick={() => setIsNewModalOpen(true)}>Add Provider</Button>
            </div>

            {loading ? (
                <div className={styles.loadingState}>
                    <Loader2 className="animate-spin" size={40} color="var(--primary)" />
                </div>
            ) : (
                <div className={styles.panels}>
                    <div className={styles.sidebar}>
                        <div className={styles.sidebarHeader}>
                            <p className={styles.sidebarLabel}>Providers ({providers.length})</p>
                        </div>
                        <div className={styles.providerList}>
                            {providers.map(p => (
                                <div
                                    key={p.id}
                                    onClick={() => setActiveProviderId(p.id)}
                                    className={`${styles.providerItem} ${activeProviderId === p.id ? styles.providerItemActive : ''}`}
                                >
                                    <div>
                                        <p className={styles.providerItemName}>{p.name}</p>
                                        <p className={styles.providerItemSpecialty}>{p.specialty || 'General'}</p>
                                    </div>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); deleteProvider(p.id); }}
                                        className={styles.deleteBtn}
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    <Card className={styles.editorCard}>
                        {!activeProvider ? (
                            <div className={styles.emptyState}>
                                <LayoutDashboard size={48} style={{ marginBottom: 16, opacity: 0.2 }} />
                                <h3>Select a Provider</h3>
                                <p>Pick a service provider from the list to manage their details and see work updates.</p>
                            </div>
                        ) : (
                            <div>
                                <div className={styles.sectionHeader}>
                                    <h3 className={styles.sectionTitle}>Provider Details</h3>
                                    <Button icon={saving ? Loader2 : Save} disabled={saving} onClick={saveProvider}>
                                        {saving ? 'Saving...' : 'Save Changes'}
                                    </Button>
                                </div>

                                <div className={styles.formGrid}>
                                    <Input
                                        label="Company / Name"
                                        value={activeProvider.name}
                                        onChange={(e) => updateProviderField('name', e.target.value)}
                                    />
                                    <Input
                                        label="Specialty"
                                        value={activeProvider.specialty || ''}
                                        onChange={(e) => updateProviderField('specialty', e.target.value)}
                                    />
                                    <Input
                                        label="Email"
                                        value={activeProvider.email || ''}
                                        onChange={(e) => updateProviderField('email', e.target.value)}
                                    />
                                    <Input
                                        label="Phone"
                                        value={activeProvider.phone || ''}
                                        onChange={(e) => updateProviderField('phone', e.target.value)}
                                    />
                                </div>

                                <div className={styles.sectionHeader}>
                                    <h3 className={styles.sectionTitle}>Work Updates</h3>
                                    <span className={styles.subtitle}>{assignedSteps.length} active assignments</span>
                                </div>

                                {stepsLoading ? (
                                    <div style={{ textAlign: 'center', padding: 20 }}>
                                        <Loader2 className="animate-spin" size={24} />
                                    </div>
                                ) : (
                                    <div className={styles.workUpdatesList}>
                                        {assignedSteps.length === 0 ? (
                                            <p className={styles.subtitle}>No work currently assigned to this provider.</p>
                                        ) : assignedSteps.map(step => (
                                            <div key={step.id} className={styles.updateRow}>
                                                <div className={styles.updateInfo}>
                                                    <p className={styles.updateStep}>{step.label}</p>
                                                    <p className={styles.updateApp}>
                                                        {step.application.service_template?.name} — {step.application.customer?.name}
                                                    </p>
                                                </div>
                                                <div className={`${styles.updateStatus} ${step.is_completed ? styles.statusDone : styles.statusPending}`}>
                                                    {step.is_completed ? <CheckCircle2 size={14} /> : <Clock size={14} />}
                                                    {step.is_completed ? 'Completed' : 'In Progress'}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </Card>
                </div>
            )}

            <Modal isOpen={isNewModalOpen} onClose={() => setIsNewModalOpen(false)} title="Add Service Provider">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <Input label="Name" placeholder="e.g. Accurate Translators" value={newName} onChange={(e) => setNewName(e.target.value)} />
                    <Input label="Specialty" placeholder="e.g. Translation, Logistics" value={newSpecialty} onChange={(e) => setNewSpecialty(e.target.value)} />
                    <Input label="Email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
                    <Input label="Phone" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} />
                    <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                        <Button style={{ flex: 1 }} onClick={createProvider} disabled={!newName}>Add Provider</Button>
                        <Button variant="outline" style={{ flex: 1 }} onClick={() => setIsNewModalOpen(false)}>Cancel</Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};
