import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { CheckCircle2, Loader2, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import styles from './CustomerPortal.module.css';

interface AppStep {
    id: string;
    label: string;
    description?: string;
    is_completed: boolean;
    position: number;
}

interface Application {
    id: string;
    progress: number;
    status: string;
    description?: string;
    created_at: string;
    service_template?: {
        name: string;
        description?: string;
    };
    steps: AppStep[];
}

interface Customer {
    id: string;
    name: string;
}

export const CustomerPortal = () => {
    const { customerId } = useParams();
    const [customer, setCustomer] = useState<Customer | null>(null);
    const [applications, setApplications] = useState<Application[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (customerId) fetchPortalData();
    }, [customerId]);

    const fetchPortalData = async () => {
        setLoading(true);
        try {
            // Fetch Customer
            const { data: cust, error: custErr } = await supabase
                .from('customers')
                .select('id, name')
                .eq('id', customerId)
                .single();

            if (custErr) throw custErr;
            setCustomer(cust);

            // Fetch Applications with Steps
            const { data: apps, error: appsErr } = await supabase
                .from('applications')
                .select(`
                    *,
                    service_template:service_templates(name, description),
                    steps:application_steps(*)
                `)
                .eq('customer_id', customerId)
                .order('created_at', { ascending: false });

            if (appsErr) throw appsErr;
            setApplications(apps || []);

        } catch (err) {
            console.error('Portal Error:', err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className={styles.loadingState}>
                <Loader2 className="animate-spin" size={48} color="var(--primary)" />
                <p className={styles.loadingText}>Loading your secure portal...</p>
            </div>
        );
    }

    if (!customer) {
        return (
            <div className={styles.notFound}>
                <h1 className={styles.notFoundTitle}>Portal Not Found</h1>
                <p className={styles.welcomeSubtext}>Please check your link or contact support.</p>
            </div>
        );
    }

    return (
        <div className={styles.portalRoot}>
            <div className={styles.container}>
                <header className={styles.portalHeader}>
                    <div className={styles.brand}>
                        <div className={styles.brandIcon}>
                            <CheckCircle2 size={24} />
                        </div>
                        <span className={styles.brandName}>Trust Flow</span>
                    </div>
                    <h1 className={styles.welcomeText}>Hello, {customer.name}</h1>
                    <p className={styles.welcomeSubtext}>Track your real-time service progress below.</p>
                </header>

                <main>
                    <h2 className={styles.title}>Your Active Services</h2>

                    {applications.length === 0 ? (
                        <div className={styles.appCard}>
                            <p className={styles.welcomeSubtext}>No active services found at this time.</p>
                        </div>
                    ) : (
                        <div className={styles.appsList}>
                            {applications.map(app => (
                                <div key={app.id} className={styles.appCard}>
                                    <div className={styles.cardTop}>
                                        <div>
                                            <p className={styles.appId}>Reference: #{app.id.split('-')[0].toUpperCase()}</p>
                                            <h3 className={styles.serviceName}>{app.service_template?.name}</h3>
                                        </div>
                                        <span className={styles.statusLabel}>{app.status}</span>
                                    </div>

                                    {app.service_template?.description && (
                                        <div className={styles.templateDescriptionSection}>
                                            <p className={styles.templateDescriptionText}>{app.service_template.description}</p>
                                        </div>
                                    )}

                                    {app.description && (
                                        <div className={styles.appDescriptionSection}>
                                            <p className={styles.appDescriptionText}>{app.description}</p>
                                        </div>
                                    )}

                                    <div className={styles.progressSection}>
                                        <div className={styles.progressHeader}>
                                            <span className={styles.percent}>{app.progress}%</span>
                                            <span className={styles.welcomeSubtext}>Estimated Completion</span>
                                        </div>
                                        <div className={styles.progressTrack}>
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${app.progress}%` }}
                                                className={styles.progressFill}
                                            />
                                        </div>
                                    </div>

                                    <div className={styles.stepsSection}>
                                        <h4 className={styles.welcomeSubtext} style={{ marginBottom: '16px', fontSize: '0.9rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Workflow Status</h4>
                                        <div className={styles.stepsTimeline}>
                                            {[...app.steps].sort((a, b) => a.position - b.position).map((step, idx, arr) => {
                                                const isActive = !step.is_completed && (idx === 0 || arr[idx - 1].is_completed);
                                                return (
                                                    <div key={step.id} className={styles.stepItem}>
                                                        <div className={styles.stepMarker}>
                                                            <div className={`${styles.stepDot} ${step.is_completed ? styles.stepDotCompleted : (isActive ? styles.stepDotActive : '')}`}>
                                                                {step.is_completed && <Check size={10} color="white" />}
                                                            </div>
                                                        </div>
                                                        <div className={styles.stepInfo}>
                                                            <span className={`${styles.stepLabel} ${step.is_completed ? styles.stepLabelCompleted : ''}`}>
                                                                {step.label}
                                                            </span>
                                                            {step.description && (
                                                                <p className={styles.stepDescription}>
                                                                    {step.description}
                                                                </p>
                                                            )}
                                                            <span className={`${styles.stepStatus} ${step.is_completed ? styles.statusCompleted : (isActive ? styles.statusActive : styles.statusPending)}`}>
                                                                {step.is_completed ? 'Completed' : (isActive ? 'In Progress' : 'Pending')}
                                                            </span>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};
