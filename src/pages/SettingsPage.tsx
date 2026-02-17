import { useState, useEffect } from 'react';
import { Plus, Trash2, Loader2, Save, ArrowUpDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button, Card, Input, Modal } from '../components/UI';
import { supabase } from '../lib/supabase';
import styles from './SettingsPage.module.css';

interface TemplateStep {
    id: string;
    label: string;
    is_outsource: boolean;
    position: number;
}

interface ServiceTemplate {
    id: string;
    name: string;
    description?: string;
    default_steps: TemplateStep[];
}

export const SettingsPage = () => {
    const [templates, setTemplates] = useState<ServiceTemplate[]>([]);
    const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [isNewModalOpen, setIsNewModalOpen] = useState(false);
    const [newName, setNewName] = useState('');
    const [newDescription, setNewDescription] = useState('');

    useEffect(() => {
        fetchTemplates();
    }, []);

    const fetchTemplates = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('service_templates')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setTemplates(data || []);
        } catch (err) {
            console.error('Error fetching templates:', err);
        } finally {
            setLoading(false);
        }
    };

    const activeTemplate = templates.find(t => t.id === activeTemplateId);

    const updateTemplate = (field: string, value: any) => {
        setTemplates(prev => prev.map(t => t.id === activeTemplateId ? { ...t, [field]: value } : t));
    };

    const addStep = () => {
        if (!activeTemplate) return;
        const newStep: TemplateStep = {
            id: crypto.randomUUID(),
            label: '',
            is_outsource: false,
            position: activeTemplate.default_steps.length + 1
        };
        updateTemplate('default_steps', [...activeTemplate.default_steps, newStep]);
    };

    const removeStep = (stepId: string) => {
        if (!activeTemplate) return;
        updateTemplate('default_steps', activeTemplate.default_steps.filter(s => s.id !== stepId));
    };

    const updateStep = (stepId: string, field: string, value: any) => {
        if (!activeTemplate) return;
        updateTemplate(
            'default_steps',
            activeTemplate.default_steps.map(s => s.id === stepId ? { ...s, [field]: value } : s)
        );
    };

    const saveTemplate = async () => {
        if (!activeTemplate) return;
        setSaving(true);
        try {
            const { error } = await supabase
                .from('service_templates')
                .update({
                    name: activeTemplate.name,
                    description: activeTemplate.description,
                    default_steps: activeTemplate.default_steps
                })
                .eq('id', activeTemplate.id);

            if (error) throw error;
            alert('Template saved successfully!');
        } catch (err) {
            console.error('Error saving template:', err);
            alert('Failed to save template.');
        } finally {
            setSaving(false);
        }
    };

    const createTemplate = async () => {
        if (!newName) return;
        try {
            const { error } = await supabase.from('service_templates').insert([{
                name: newName,
                description: newDescription,
                default_steps: []
            }]);

            if (error) throw error;
            setIsNewModalOpen(false);
            setNewName('');
            setNewDescription('');
            fetchTemplates();
        } catch (err) {
            console.error(err);
            alert('Error creating template.');
        }
    };

    const deleteTemplate = async (id: string) => {
        if (!confirm('Are you sure you want to delete this template?')) return;
        try {
            const { error } = await supabase.from('service_templates').delete().eq('id', id);
            if (error) throw error;
            if (activeTemplateId === id) setActiveTemplateId(null);
            fetchTemplates();
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div className={styles.page}>
            <div className={styles.header}>
                <div>
                    <h1 className={styles.title}>Service Templates</h1>
                    <p className={styles.subtitle}>Configure reusable service workflow blueprints.</p>
                </div>
                <Button icon={Plus} onClick={() => setIsNewModalOpen(true)}>New Template</Button>
            </div>

            {loading ? (
                <div className={styles.loadingState}>
                    <Loader2 className="animate-spin" size={40} color="var(--primary)" />
                </div>
            ) : (
                <div className={styles.panels}>
                    <div className={styles.sidebar}>
                        <div className={styles.sidebarHeader}>
                            <p className={styles.sidebarLabel}>Templates ({templates.length})</p>
                        </div>

                        <div className={styles.templateList}>
                            {templates.length === 0 ? (
                                <p className={styles.noTemplates}>No templates created yet.</p>
                            ) : templates.map(t => (
                                <div
                                    key={t.id}
                                    onClick={() => setActiveTemplateId(t.id)}
                                    className={`${styles.templateItem} ${activeTemplateId === t.id ? styles.templateItemActive : ''}`}
                                >
                                    <p className={`${styles.templateItemName} ${activeTemplateId === t.id ? styles.templateItemNameActive : ''}`}>{t.name}</p>
                                    <p className={styles.templateItemSteps}>{t.default_steps.length} Steps</p>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); deleteTemplate(t.id); }}
                                        className={styles.templateDeleteBtn}
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    <Card className={styles.editorCard}>
                        {!activeTemplate ? (
                            <div className={styles.editorEmpty}>
                                <ArrowUpDown size={40} color="var(--text-muted)" style={{ margin: '0 auto 12px' }} />
                                <h3 className={styles.editorTitle}>Select a Template</h3>
                                <p className={styles.editorSub}>Pick a template from the left panel to view and edit its configuration.</p>
                            </div>
                        ) : (
                            <div className={styles.editorForm}>
                                <div className={styles.editorTopRow}>
                                    <Input
                                        label="Template Name"
                                        value={activeTemplate.name}
                                        onChange={(e) => updateTemplate('name', e.target.value)}
                                    />
                                    <Input
                                        label="Description"
                                        value={activeTemplate.description || ''}
                                        onChange={(e) => updateTemplate('description', e.target.value)}
                                    />
                                </div>

                                <div>
                                    <div className={styles.stepsHeader}>
                                        <p className={styles.stepsLabel}>Workflow Steps</p>
                                        <span className={styles.stepsCount}>{activeTemplate.default_steps.length} steps</span>
                                    </div>

                                    <div className={styles.stepsList}>
                                        <AnimatePresence>
                                            {activeTemplate.default_steps.length === 0 ? (
                                                <div className={styles.stepsEmpty}>
                                                    No steps defined. Click "Add Step" to begin.
                                                </div>
                                            ) : activeTemplate.default_steps.map((step, index) => (
                                                <motion.div
                                                    layout
                                                    key={step.id}
                                                    initial={{ opacity: 0, x: -10 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    exit={{ opacity: 0, x: 10 }}
                                                    className={styles.stepItem}
                                                >
                                                    <span className={styles.stepNumber}>{index + 1}</span>
                                                    <input
                                                        value={step.label}
                                                        onChange={(e) => updateStep(step.id, 'label', e.target.value)}
                                                        placeholder="Enter step name..."
                                                        className={styles.stepInput}
                                                    />
                                                    <label className={styles.outsourceToggle}>
                                                        <input
                                                            type="checkbox"
                                                            checked={step.is_outsource}
                                                            onChange={(e) => updateStep(step.id, 'is_outsource', e.target.checked)}
                                                            className={styles.outsourceCheckbox}
                                                        />
                                                        Outsource
                                                    </label>
                                                    <Button variant="ghost" onClick={() => removeStep(step.id)} style={{ color: '#ef4444', padding: '8px' }}>
                                                        <Trash2 size={18} />
                                                    </Button>
                                                </motion.div>
                                            ))}
                                        </AnimatePresence>
                                    </div>

                                    <Button variant="outline" icon={Plus} onClick={addStep} style={{ width: '100%', marginTop: '12px' }}>Add Step</Button>
                                </div>

                                <div className={styles.editorActions}>
                                    <Button icon={saving ? Loader2 : Save} disabled={saving} onClick={saveTemplate} style={{ flex: 1 }} className={saving ? 'animate-spin' : ''}>
                                        {saving ? 'Saving...' : 'Save Template'}
                                    </Button>
                                </div>
                            </div>
                        )}
                    </Card>
                </div>
            )}

            <Modal isOpen={isNewModalOpen} onClose={() => setIsNewModalOpen(false)} title="New Service Template">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <Input label="Template Name" placeholder="e.g. Visa Processing" value={newName} onChange={(e) => setNewName(e.target.value)} />
                    <Input label="Description (Optional)" placeholder="A brief description of this service..." value={newDescription} onChange={(e) => setNewDescription(e.target.value)} />
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <Button style={{ flex: 1 }} onClick={createTemplate} disabled={!newName}>Create Template</Button>
                        <Button variant="outline" style={{ flex: 1 }} onClick={() => setIsNewModalOpen(false)}>Cancel</Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};
