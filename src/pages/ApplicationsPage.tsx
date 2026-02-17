import { useState, useEffect } from 'react';
import {
    Search,
    Plus,
    User,
    Tag,
    CheckCircle2,
    Clock,
    Trash2,
    GripVertical,
    Loader2,
    Calendar,
    ChevronRight,
    Check,
    LayoutGrid,
    List,
    ArrowUp,
    ArrowDown,
    Columns
} from 'lucide-react';
import { Button, Modal } from '../components/UI';
import { PremiumCheckmark } from '../components/PremiumCheckmark';
import { CustomerDropdown } from '../components/CustomerDropdown';
import { ProviderDropdown } from '../components/ProviderDropdown';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './ApplicationsPage.module.css';

interface AppStep {
    id: string;
    label: string;
    is_completed: boolean;
    is_outsource: boolean;
    outsource_provider?: string;
    provider_id?: string;
    expiry_date?: string;
    position: number;
}

interface Application {
    id: string;
    status: string;
    progress: number;
    created_at: string;
    customer?: { name: string };
    service_template?: { name: string; description: string; default_steps: any[] };
    steps: AppStep[];
}

interface Customer {
    id: string;
    name: string;
}

interface ServiceTemplate {
    id: string;
    name: string;
    description: string;
    default_steps: any[];
}

export const ApplicationsPage = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState<'grid' | 'list' | 'kanban'>('kanban');
    const [isNewAppModalOpen, setIsNewAppModalOpen] = useState(false);

    const [selectedApp, setSelectedApp] = useState<Application | null>(null);
    const [localSteps, setLocalSteps] = useState<AppStep[]>([]);
    const [applications, setApplications] = useState<Application[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [templates, setTemplates] = useState<ServiceTemplate[]>([]);
    const [providers, setProviders] = useState<{ id: string, name: string }[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [newAppCustomerId, setNewAppCustomerId] = useState('');
    const [newAppTemplateId, setNewAppTemplateId] = useState('');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const results = await Promise.all([
                supabase.from('applications').select(`
          *,
          customer:customers(name),
          service_template:service_templates(name, description, default_steps),
          steps:application_steps(*)
        `).order('created_at', { ascending: false }),
                supabase.from('customers').select('id, name'),
                supabase.from('service_templates').select('*'),
                supabase.from('service_providers').select('id, name')
            ]);

            const [appsRes, custRes, tempRes, providersRes] = results as any;

            if (appsRes.error) throw appsRes.error;
            if (custRes.error) throw custRes.error;
            if (tempRes.error) throw tempRes.error;
            if (providersRes.error) throw providersRes.error;

            setApplications(appsRes.data || []);
            setCustomers(custRes.data || []);
            setTemplates(tempRes.data || []);
            setProviders(providersRes.data || []);
        } catch (err) {
            console.error('Error fetching applications:', err);
        } finally {
            setLoading(false);
        }
    };

    const openWorkflow = (app: Application) => {
        setSelectedApp(app);
        // Ensure steps have stable, non-null positions for sorting and reordering
        const initializedSteps = [...app.steps]
            .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
            .map((s, idx) => ({
                ...s,
                position: idx // Re-index for absolute stability in local state
            }));
        setLocalSteps(initializedSteps);
    };

    const calculateProgress = (steps: AppStep[]) => {
        if (steps.length === 0) return 0;
        const completed = steps.filter(s => s.is_completed).length;
        return Math.round((completed / steps.length) * 100);
    };

    const handleCreateApplication = async () => {
        if (!newAppCustomerId || !newAppTemplateId) {
            alert('Please select a customer and a service type.');
            return;
        }

        try {
            const { data: newApp, error: appErr } = await supabase
                .from('applications')
                .insert([{
                    customer_id: newAppCustomerId,
                    service_template_id: newAppTemplateId,
                    status: 'Active',
                    progress: 0
                }])
                .select()
                .single();

            if (appErr) throw appErr;

            const template = templates.find(t => t.id === newAppTemplateId);
            const defaultSteps = template?.default_steps || [];

            if (defaultSteps.length > 0) {
                const stepsToInsert = defaultSteps.map((s: any, index: number) => ({
                    application_id: newApp.id,
                    label: typeof s === 'string' ? s : (s.label || 'Step'),
                    position: index,
                    is_completed: false,
                    is_outsource: !!s.is_outsource
                }));

                const { error: stepsErr } = await supabase
                    .from('application_steps')
                    .insert(stepsToInsert);

                if (stepsErr) throw stepsErr;
            }

            setIsNewAppModalOpen(false);
            setNewAppCustomerId('');
            setNewAppTemplateId('');
            fetchData();
        } catch (err) {
            console.error('Error creating application:', err);
            alert('Failed to create application.');
        }
    };

    const updateLocalStep = (stepId: string, updates: Partial<AppStep>) => {
        setLocalSteps(prev => prev.map(s => s.id === stepId ? { ...s, ...updates } : s));
    };

    const removeLocalStep = (stepId: string) => {
        if (!confirm('Are you sure you want to remove this step? It will be permanently deleted on save.')) return;
        setLocalSteps(prev => prev.filter(s => s.id !== stepId));
    };

    const addLocalStep = () => {
        const maxPos = localSteps.reduce((max, s) => Math.max(max, s.position || 0), -1);
        const newStep: AppStep = {
            id: `temp-${Date.now()}-${Math.random()}`,
            label: 'New Step',
            is_completed: false,
            is_outsource: false,
            position: maxPos + 1
        };
        setLocalSteps(prev => [...prev, newStep]);
    };

    const moveStep = (index: number, direction: 'up' | 'down') => {
        // First, get a clean sorted array
        const sorted = [...localSteps].sort((a, b) => a.position - b.position);
        const targetIndex = direction === 'up' ? index - 1 : index + 1;

        if (targetIndex < 0 || targetIndex >= sorted.length) return;

        // Perform the swap in the array itself
        const result = [...sorted];
        const [movedItem] = result.splice(index, 1);
        result.splice(targetIndex, 0, movedItem);

        // Re-assign positions based on the final array order to ensure stability
        const finalized = result.map((step, idx) => ({
            ...step,
            position: idx
        }));

        setLocalSteps(finalized);
    };

    const deleteApplication = async (appId: string, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        if (!confirm('Are you sure you want to delete this application and all its steps? This cannot be undone.')) return;

        try {
            // Delete steps first, then the application
            await supabase.from('application_steps').delete().eq('application_id', appId);
            const { error } = await supabase.from('applications').delete().eq('id', appId);
            if (error) throw error;

            if (selectedApp?.id === appId) setSelectedApp(null);
            setApplications(prev => prev.filter(a => a.id !== appId));
        } catch (err) {
            console.error('Error deleting application:', err);
            alert('Failed to delete application.');
        }
    };

    const deleteTemplate = async (templateId: string) => {
        if (!confirm('Are you sure you want to delete this service template? This cannot be undone.')) return;

        try {
            const { error } = await supabase
                .from('service_templates')
                .delete()
                .eq('id', templateId);

            if (error) throw error;
            setTemplates(prev => prev.filter(t => t.id !== templateId));
            if (newAppTemplateId === templateId) setNewAppTemplateId('');
        } catch (err) {
            console.error('Error deleting template:', err);
            alert('Failed to delete template. It might be in use by active applications.');
        }
    };

    const saveChanges = async () => {
        if (!selectedApp) return;
        setSaving(true);
        try {
            const originalStepIds = selectedApp.steps.map(s => s.id);
            const localStepIds = localSteps.map(s => s.id);
            const removedIds = originalStepIds.filter(id => !localStepIds.includes(id));

            if (removedIds.length > 0) {
                await supabase.from('application_steps').delete().in('id', removedIds);
            }

            const upsertData = [...localSteps]
                .sort((a, b) => a.position - b.position)
                .map((s, idx) => {
                    const data: any = {
                        application_id: selectedApp.id,
                        label: s.label,
                        is_completed: s.is_completed,
                        is_outsource: s.is_outsource,
                        outsource_provider: s.outsource_provider,
                        expiry_date: s.expiry_date || null,
                        position: idx,
                        provider_id: s.provider_id || null
                    };
                    // Only include 'id' for existing steps. New steps will be inserted without an 'id'.
                    if (!s.id.startsWith('temp-')) {
                        data.id = s.id;
                    }
                    return data;
                });

            // Separate new steps from existing steps for upsert
            const newSteps = upsertData.filter(s => !s.id);
            const existingSteps = upsertData.filter(s => s.id);

            if (existingSteps.length > 0) {
                const { error: updateErr } = await supabase
                    .from('application_steps')
                    .upsert(existingSteps, { onConflict: 'id' });
                if (updateErr) throw updateErr;
            }

            if (newSteps.length > 0) {
                const { error: insertErr } = await supabase
                    .from('application_steps')
                    .insert(newSteps);
                if (insertErr) throw insertErr;
            }

            const newProgress = calculateProgress(localSteps);
            await supabase.from('applications').update({ progress: newProgress }).eq('id', selectedApp.id);

            setSelectedApp(null);
            fetchData();
        } catch (err) {
            console.error('Error saving changes:', err);
            alert('Failed to save progress.');
        } finally {
            setSaving(false);
        }
    };

    const filteredApps = applications.filter(app =>
        app.customer?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.service_template?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.id.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getStepChipClass = (step: AppStep, allSteps: AppStep[]) => {
        if (step.is_completed) return styles.stepChipCompleted;
        const sorted = [...allSteps].sort((a, b) => a.position - b.position);
        const firstIncomplete = sorted.find(s => !s.is_completed);
        if (firstIncomplete && firstIncomplete.id === step.id) return styles.stepChipRunning;
        if (step.is_outsource) return styles.stepChipOutsource;
        return styles.stepChipPending;
    };

    return (
        <div className={styles.page}>
            <div className={styles.header}>
                <div>
                    <h1 className={styles.title}>Applications</h1>
                    <p className={styles.subtitle}>Track and manage service workflows for your customers.</p>
                </div>
                <div className={styles.headerRight}>
                    <div className={styles.viewToggle}>
                        <button className={`${styles.viewToggleBtn} ${viewMode === 'grid' ? styles.viewToggleBtnActive : ''}`} onClick={() => setViewMode('grid')} title="Card View">
                            <LayoutGrid size={18} />
                        </button>
                        <button className={`${styles.viewToggleBtn} ${viewMode === 'list' ? styles.viewToggleBtnActive : ''}`} onClick={() => setViewMode('list')} title="List View">
                            <List size={18} />
                        </button>
                        <button className={`${styles.viewToggleBtn} ${viewMode === 'kanban' ? styles.viewToggleBtnActive : ''}`} onClick={() => setViewMode('kanban')} title="Kanban Board">
                            <Columns size={18} />
                        </button>
                    </div>
                    <Button icon={Plus} onClick={() => setIsNewAppModalOpen(true)}>New Application</Button>
                </div>
            </div>

            <div className={styles.searchBar}>
                <Search size={18} className={styles.searchIcon} />
                <input
                    placeholder="Search by ID, customer, or service..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className={styles.searchInput}
                />
            </div>

            {loading ? (
                <div className={styles.loadingState}>
                    <Loader2 className="animate-spin" size={40} color="var(--primary)" style={{ margin: '0 auto' }} />
                    <p className={styles.loadingText}>Loading applications...</p>
                </div>
            ) : filteredApps.length === 0 ? (
                <div className={styles.emptyState}>No applications found.</div>
            ) : viewMode === 'grid' ? (
                <div className={styles.cardsGrid}>
                    {filteredApps.map(app => (
                        <div key={app.id} className={styles.appCard} onClick={() => openWorkflow(app)}>
                            <div className={styles.cardHeader}>
                                <span className={styles.appId}>#{app.id.split('-')[0].toUpperCase()}</span>
                                <span className={styles.appDate}>{new Date(app.created_at).toLocaleDateString()}</span>
                            </div>
                            <div className={styles.cardBody}>
                                <h3 className={styles.appServiceName}>{app.service_template?.name}</h3>
                                <div className={styles.appDescRow}>
                                    {app.service_template?.description && <p className={styles.appDesc}>{app.service_template.description}</p>}
                                    <span className={styles.appDescSeparator}>•</span>
                                    <span className={styles.appStepCount}>{app.steps.length} Steps</span>
                                </div>
                                <div className={styles.appCustomer}>
                                    <div className={styles.appCustomerAvatar}><User size={14} /></div>
                                    <span className={styles.appCustomerName}>{app.customer?.name}</span>
                                </div>
                            </div>
                            <div className={styles.cardProgress}>
                                <div className={styles.progressHeader}>
                                    <span className={`${styles.progressPercent} ${app.progress === 100 ? styles.progressComplete : ''}`}>{app.progress}%</span>
                                    <span className={styles.progressStepsLabel}>{app.steps.filter(s => s.is_completed).length}/{app.steps.length} Steps</span>
                                </div>
                                <div className={styles.progressTrack}>
                                    <motion.div initial={{ width: 0 }} animate={{ width: `${app.progress}%` }} className={`${styles.progressFill} ${app.progress === 100 ? styles.progressFillDone : styles.progressFillDefault}`} />
                                </div>
                            </div>
                            <div className={styles.cardFooter}>
                                <div className={styles.stepChips}>
                                    {[...app.steps].sort((a, b) => a.position - b.position).map((step) => (
                                        <div key={step.id} className={`${styles.stepChip} ${getStepChipClass(step, app.steps)}`} data-tooltip={step.label}>
                                            {step.is_completed ? <CheckCircle2 size={14} /> : (step.is_outsource ? <Tag size={14} /> : <Clock size={14} />)}
                                            {step.is_outsource && !step.is_completed && <span className={styles.stepChipDot} />}
                                        </div>
                                    ))}
                                </div>
                                <div className={styles.openBtn}>
                                    <Button variant="ghost" onClick={(e) => deleteApplication(app.id, e)} className={styles.appDeleteBtn}>
                                        <Trash2 size={16} />
                                    </Button>
                                    <Button variant="ghost" style={{ padding: '8px', borderRadius: '10px', backgroundColor: '#f8fafc' }} onClick={(e) => { e.stopPropagation(); openWorkflow(app); }}>
                                        <ChevronRight size={18} />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : viewMode === 'kanban' ? (
                /* Kanban View */
                <div className={styles.kanbanBoard}>
                    {[
                        { id: 'incoming', name: 'Incoming', apps: filteredApps.filter(a => a.status === 'Draft') },
                        { id: 'active', name: 'In Progress', apps: filteredApps.filter(a => a.status === 'Active' && a.progress < 90) },
                        { id: 'finalizing', name: 'Finalizing', apps: filteredApps.filter(a => a.status === 'Active' && a.progress >= 90 && a.progress < 100) },
                        { id: 'completed', name: 'Completed', apps: filteredApps.filter(a => a.progress === 100 || a.status === 'Closed') }
                    ].map(col => (
                        <div key={col.id} className={styles.kanbanColumn}>
                            <div className={styles.kanbanColumnHeader}>
                                <h3 className={styles.kanbanColumnTitle}>
                                    {col.name}
                                    <span className={styles.kanbanCount}>{col.apps.length}</span>
                                </h3>
                            </div>
                            <div className={styles.kanbanList}>
                                <AnimatePresence mode="popLayout">
                                    {col.apps.map(app => (
                                        <motion.div
                                            key={app.id}
                                            layout
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.9 }}
                                            className={styles.kanbanCard}
                                            onClick={() => openWorkflow(app)}
                                        >
                                            <div className={styles.kanbanCardHeader}>
                                                <span className={styles.appId}>#{app.id.split('-')[0].toUpperCase()}</span>
                                                <span className={`${styles.kanbanProgress} ${app.progress === 100 ? styles.kanbanProgressDone : ''}`}>{app.progress}%</span>
                                            </div>
                                            <h4 className={styles.kanbanAppTitle}>{app.service_template?.name}</h4>
                                            <div className={styles.kanbanAppCustomer}>
                                                <div className={styles.appCustomerAvatar}><User size={12} /></div>
                                                <span className={styles.appCustomerName}>{app.customer?.name}</span>
                                            </div>
                                            <div className={styles.kanbanMiniProgress}>
                                                <div className={styles.kanbanProgressTrack}>
                                                    <div
                                                        className={`${styles.kanbanProgressFill} ${app.progress === 100 ? styles.kanbanProgressFillDone : ''}`}
                                                        style={{ width: `${app.progress}%` }}
                                                    />
                                                </div>
                                            </div>
                                            <div className={styles.kanbanFooter}>
                                                <div className={styles.kanbanStepCount}>{app.steps.length} Steps</div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <div className={styles.kanbanDate}>{new Date(app.created_at).toLocaleDateString()}</div>
                                                    <button className={styles.appDeleteBtnKanban} onClick={(e) => deleteApplication(app.id, e)} title="Delete Application">
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                /* List View */
                <div className={styles.listWrapper}>
                    {filteredApps.map(app => (
                        <div key={app.id} className={styles.listRow} onClick={() => openWorkflow(app)}>
                            <div>
                                <div className={styles.appDescRow}>
                                    <span className={styles.appId}>#{app.id.split('-')[0].toUpperCase()}</span>
                                    <span className={styles.appDate}>{new Date(app.created_at).toLocaleDateString()}</span>
                                </div>
                                <h3 className={styles.appServiceName}>{app.service_template?.name}</h3>
                                <div className={styles.appCustomer}>
                                    <div className={styles.appCustomerAvatar}><User size={12} /></div>
                                    <span className={styles.appCustomerName}>{app.customer?.name}</span>
                                </div>
                            </div>
                            <div>
                                <div className={styles.progressHeader}>
                                    <span className={`${styles.progressPercent} ${app.progress === 100 ? styles.progressComplete : ''}`}>{app.progress}%</span>
                                    <span className={styles.progressStepsLabel}>{app.steps.filter(s => s.is_completed).length}/{app.steps.length}</span>
                                </div>
                                <div className={styles.progressTrack}>
                                    <motion.div initial={{ width: 0 }} animate={{ width: `${app.progress}%` }} className={`${styles.progressFill} ${app.progress === 100 ? styles.progressFillDone : styles.progressFillDefault}`} />
                                </div>
                            </div>
                            <div className={styles.stepChips}>
                                {[...app.steps].sort((a, b) => a.position - b.position).map((step) => (
                                    <div key={step.id} className={`${styles.stepChip} ${getStepChipClass(step, app.steps)}`} data-tooltip={step.label}>
                                        {step.is_completed ? <CheckCircle2 size={14} /> : (step.is_outsource ? <Tag size={14} /> : <Clock size={14} />)}
                                        {step.is_outsource && !step.is_completed && <span className={styles.stepChipDot} />}
                                    </div>
                                ))}
                            </div>
                            <div className={styles.openBtn}>
                                <Button variant="ghost" onClick={(e) => deleteApplication(app.id, e)} className={styles.appDeleteBtn}>
                                    <Trash2 size={16} />
                                </Button>
                                <Button variant="ghost" style={{ padding: '8px', borderRadius: '10px', backgroundColor: '#f8fafc' }} onClick={(e) => { e.stopPropagation(); openWorkflow(app); }}>
                                    <ChevronRight size={18} />
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* --- Workflow Engine Modal --- */}
            <Modal
                isOpen={!!selectedApp}
                onClose={() => setSelectedApp(null)}
                maxWidth="900px"
                padding="0px"
                showHeader={false}
            >
                {selectedApp && (
                    <div className={styles.workflowRoot}>
                        <div className={styles.workflowHeader}>
                            <div>
                                <div className={styles.workflowHeaderIdRow}>
                                    <span className={styles.workflowHeaderId}>#{selectedApp.id.split('-')[0].toUpperCase()}</span>
                                    <span className={styles.workflowHeaderDate}>Launched On {new Date(selectedApp.created_at).toLocaleDateString()}</span>
                                </div>
                                <h2 className={styles.workflowHeaderTitle}>{selectedApp.service_template?.name}</h2>
                                <div className={styles.workflowHeaderCustomer}>
                                    <User size={18} />
                                    <span className={styles.workflowHeaderCustomerName}>{selectedApp.customer?.name}</span>
                                </div>
                            </div>
                            <div className={styles.workflowHeaderRight}>
                                <div className={styles.workflowHeaderProgress}>
                                    <div className={styles.workflowHeaderPercent}>{calculateProgress(localSteps)}%</div>
                                    <div className={styles.workflowHeaderProgressLabel}>Progress Sync</div>
                                </div>
                                <button
                                    className={styles.modalCloseIcon}
                                    onClick={() => setSelectedApp(null)}
                                >
                                    <Plus style={{ transform: 'rotate(45deg)' }} size={24} />
                                </button>
                            </div>
                        </div>

                        <div className={styles.workflowBody}>
                            <div className={styles.workflowBodyHeader}>
                                <div className={styles.workflowBodyTitle}>
                                    <div className={styles.workflowBodyTitleIcon}>
                                        <GripVertical size={24} />
                                    </div>
                                    <h3 className={styles.workflowBodyTitleText}>Workflow Sequence</h3>
                                </div>
                                <Button variant="outline" icon={Plus} onClick={addLocalStep} style={{ fontWeight: 800, padding: '10px 20px', borderRadius: '12px' }}>Add Custom Step</Button>
                            </div>

                            <div className={styles.stepsContainer}>
                                <div className={styles.timelineTrack} />
                                <div className={styles.stepsList}>
                                    <AnimatePresence mode="popLayout">
                                        {[...localSteps].sort((a, b) => a.position - b.position).map((step, index, sortedArr) => {
                                            const isCompleted = step.is_completed;
                                            const isActive = !isCompleted && (index === 0 || sortedArr[index - 1].is_completed);

                                            return (
                                                <motion.div
                                                    key={step.id}
                                                    layout
                                                    initial={{ opacity: 0, x: -20 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    exit={{ opacity: 0, scale: 0.95 }}
                                                    transition={{ duration: 0.3, delay: index * 0.05 }}
                                                    className={styles.timelineItem}
                                                >
                                                    <div className={styles.stepDotContainer}>
                                                        <div className={`${styles.stepDot} ${isCompleted ? styles.stepDotCompleted : (isActive ? styles.stepDotActive : '')}`}>
                                                            {isCompleted ? <Check size={18} strokeWidth={3} /> : (index + 1)}
                                                        </div>
                                                    </div>

                                                    <div className={styles.stepContent}>
                                                        <div className={styles.stepMainRow}>
                                                            <div style={{ flex: 1 }}>
                                                                <input
                                                                    value={step.label}
                                                                    onChange={(e) => updateLocalStep(step.id, { label: e.target.value })}
                                                                    className={`${styles.stepLabelInput} ${isCompleted ? styles.stepLabelCompleted : ''}`}
                                                                />
                                                                <p className={styles.stepSequence}>Phase {index + 1}</p>
                                                            </div>

                                                            <PremiumCheckmark
                                                                checked={isCompleted}
                                                                onClick={() => updateLocalStep(step.id, { is_completed: !isCompleted })}
                                                            />

                                                            <div className={styles.stepActions}>
                                                                <div className={styles.reorderGroup}>
                                                                    <button
                                                                        type="button"
                                                                        className={styles.reorderBtn}
                                                                        onClick={() => moveStep(index, 'up')}
                                                                        disabled={index === 0}
                                                                        title="Move Up"
                                                                    >
                                                                        <ArrowUp size={14} />
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        className={styles.reorderBtn}
                                                                        onClick={() => moveStep(index, 'down')}
                                                                        disabled={index === sortedArr.length - 1}
                                                                        title="Move Down"
                                                                    >
                                                                        <ArrowDown size={14} />
                                                                    </button>
                                                                </div>

                                                                <Button variant="ghost" onClick={() => removeLocalStep(step.id)} className={styles.stepDeleteBtn}>
                                                                    <Trash2 size={18} />
                                                                </Button>
                                                            </div>
                                                        </div>

                                                        <div className={styles.stepDetails}>
                                                            <div className={styles.outsourceGroup}>
                                                                <div className={styles.outsourceCheckGroup}>
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={step.is_outsource}
                                                                        onChange={(e) => updateLocalStep(step.id, { is_outsource: e.target.checked })}
                                                                        id={`outsource-${step.id}`}
                                                                        className={styles.outsourceCheckbox}
                                                                    />
                                                                    <label htmlFor={`outsource-${step.id}`} className={styles.outsourceLabel}>Outsourced</label>
                                                                </div>
                                                                {step.is_outsource && (
                                                                    <ProviderDropdown
                                                                        providers={providers}
                                                                        selectedId={step.provider_id}
                                                                        onSelect={(p) => {
                                                                            updateLocalStep(step.id, {
                                                                                provider_id: p?.id || undefined,
                                                                                outsource_provider: p?.name || ''
                                                                            });
                                                                        }}
                                                                    />
                                                                )}
                                                            </div>

                                                            <div className={styles.dueDateGroup}>
                                                                <div className={styles.dueDateLabel}>
                                                                    <Calendar size={16} />
                                                                    <label className={styles.dueDateLabelText}>Due:</label>
                                                                </div>
                                                                <input
                                                                    type="date"
                                                                    value={step.expiry_date || ''}
                                                                    onChange={(e) => updateLocalStep(step.id, { expiry_date: e.target.value })}
                                                                    className={`${styles.dueDateInput} ${step.expiry_date ? styles.dueDateInputSet : ''}`}
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            );
                                        })}
                                    </AnimatePresence>
                                </div>
                            </div>
                        </div>

                        <div className={styles.workflowFooter}>
                            <Button variant="outline" style={{ flex: 1, padding: '16px', borderRadius: '14px', fontWeight: 800, fontSize: '1rem' }} onClick={() => setSelectedApp(null)}>Discard Changes</Button>
                            <Button
                                style={{ flex: 2, padding: '16px', borderRadius: '14px', fontWeight: 800, fontSize: '1.1rem' }}
                                onClick={saveChanges}
                                disabled={saving}
                                icon={saving ? Loader2 : Check}
                                className={saving ? styles.savingBtn : ''}
                            >
                                {saving ? 'Syncing...' : 'Save & Close Workflow'}
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* --- New Application Modal --- */}
            <Modal
                isOpen={isNewAppModalOpen}
                onClose={() => setIsNewAppModalOpen(false)}
                title="Establish New Workflow"
                maxWidth="650px"
            >
                <div className={styles.newAppForm}>
                    <div className={styles.newAppSection}>
                        <label className={styles.newAppLabel}>1. Assign Customer Profile</label>
                        <CustomerDropdown
                            customers={customers}
                            selectedId={newAppCustomerId}
                            onSelect={setNewAppCustomerId}
                        />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div className={styles.blueprintHeader}>
                            <Tag size={20} color="#7c3aed" />
                            <label className={styles.newAppLabel}>2. Select Workflow Blueprint</label>
                        </div>
                        <div className={styles.templateList}>
                            {templates.map(t => (
                                <motion.div
                                    key={t.id}
                                    whileHover={{ y: -4, boxShadow: '0 12px 20px -3px rgba(0, 0, 0, 0.08)' }}
                                    onClick={() => setNewAppTemplateId(t.id)}
                                    className={`${styles.templateCard} ${newAppTemplateId === t.id ? styles.templateCardSelected : styles.templateCardDefault}`}
                                >
                                    <div>
                                        <p className={styles.templateName}>{t.name}</p>
                                        {t.description && <p className={styles.templateDesc}>{t.description}</p>}
                                        <p className={styles.templateSteps}>{t.default_steps?.length || 0} Steps</p>
                                    </div>
                                    <div className={styles.templateActions}>
                                        {newAppTemplateId === t.id && (
                                            <div className={styles.templateCheckmark}>
                                                <Check size={16} strokeWidth={4} />
                                            </div>
                                        )}
                                        <Button
                                            variant="ghost"
                                            onClick={(e) => { e.stopPropagation(); deleteTemplate(t.id); }}
                                            className={styles.templateDeleteBtn}
                                        >
                                            <Trash2 size={18} />
                                        </Button>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>

                    <div className={styles.newAppActions}>
                        <Button style={{ flex: 1, padding: '18px', borderRadius: '16px', fontWeight: 900, fontSize: '1.1rem' }} onClick={handleCreateApplication} disabled={!newAppCustomerId || !newAppTemplateId}>Initialize Project</Button>
                        <Button variant="outline" onClick={() => setIsNewAppModalOpen(false)} style={{ flex: 1, padding: '18px', borderRadius: '16px', fontWeight: 800, fontSize: '1.1rem' }}>Cancel</Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};
