import { useState, useEffect } from 'react';
import {
    Users,
    FileCheck,
    Clock,
    AlertTriangle,

    Loader2,
    ArrowRight,
    Calendar,
    RefreshCw,
    Building2,
    Briefcase,
    Zap,
    ChevronRight,
    Search
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button, Card } from '../components/UI';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import styles from './Dashboard.module.css';

const KPICard = ({ icon: Icon, label, value, color, loading, index, details }: { icon: any, label: string, value: string | number, color: string, loading: boolean, index: number, details?: { primary: string, secondary: string }[] }) => {
    const [isHovered, setIsHovered] = useState(false);

    const getInitials = (res: string) => {
        return res.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            className={styles.kpiCardWrapper}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            style={{ '--card-accent': color } as any}
        >
            <Card className={`${styles.kpiCard} ${details ? styles.kpiCardInteractive : ''}`}>
                <div className={styles.kpiIcon} style={{ backgroundColor: `${color}15`, color }}>
                    <Icon size={24} />
                    {details && details.length > 0 && <Search size={14} className={styles.kpiSearchHint} />}
                </div>
                {loading ? (
                    <div style={{ height: '43px', display: 'flex', alignItems: 'center' }}>
                        <Loader2 className="animate-spin" size={24} color="var(--text-muted)" />
                    </div>
                ) : (
                    <div className={styles.kpiValue}>{value}</div>
                )}
                <div className={styles.kpiLabel}>{label}</div>

                <AnimatePresence>
                    {isHovered && details && details.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className={styles.kpiHoverOverlay}
                        >
                            <div className={styles.kpiThumbnailGrid}>
                                {details.map((d, i) => (
                                    <motion.div
                                        key={i}
                                        className={styles.kpiThumbnail}
                                        initial={{ opacity: 0, y: 5 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: i * 0.05 }}
                                    >
                                        <div className={styles.thumbnailHeader}>
                                            <div className={styles.thumbnailInitial}>{getInitials(d.primary)}</div>
                                            <span className={styles.thumbnailCustomer}>{d.primary}</span>
                                        </div>
                                        <div className={styles.thumbnailApp}>{d.secondary}</div>
                                    </motion.div>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </Card>
        </motion.div>
    );
};

const NavButton = ({ label, onClick, index }: { label: string, onClick: () => void, index: number }) => (
    <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.4 + (index * 0.1) }}
    >
        <Button
            variant="outline"
            className={styles.navButton}
            onClick={onClick}
        >
            {label}
            <ChevronRight size={18} />
        </Button>
    </motion.div>
);

interface Milestone {
    id: string;
    type: 'Document' | 'Workflow Step';
    label: string;
    customerName: string;
    expiryDate: string;
    daysLeft: number;
}

export const Dashboard = () => {
    const navigate = useNavigate();
    const { user: currentUser } = useAuth();
    const [stats, setStats] = useState({
        totalCustomers: 0,
        activeApps: 0,
        pendingSteps: 0,
        expiringSoon: 0,
        totalProviders: 0,
        avgProviderRating: 0,
        recentApps: [] as { primary: string, secondary: string }[],
        outsourced: {
            completed: 0,
            assigned: 0,
            urgent: 0
        }
    });
    const [deadlines, setDeadlines] = useState<Milestone[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (currentUser) fetchStats();
    }, [currentUser]);

    const fetchStats = async () => {
        if (!currentUser) return;
        setLoading(true);
        try {
            const now = new Date();
            const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();

            const queryPromises = [
                supabase.from('customers').select('*', { count: 'exact', head: true }).eq('user_id', currentUser.id),
                supabase.from('applications')
                    .select('id, service_template:service_templates(name), customer:customers(name)', { count: 'exact' })
                    .eq('user_id', currentUser.id)
                    .eq('status', 'Active')
                    .limit(5),
                supabase.from('application_steps')
                    .select('*, application:applications!inner(user_id)', { count: 'exact', head: true })
                    .eq('application.user_id', currentUser.id)
                    .eq('is_completed', false),
                supabase.from('documents')
                    .select('id, name, expiry_date, customer:customers!inner(name, user_id)')
                    .eq('customer.user_id', currentUser.id)
                    .lte('expiry_date', thirtyDaysFromNow)
                    .gt('expiry_date', now.toISOString()),
                supabase.from('application_steps')
                    .select('id, label, expiry_date, application:applications!inner(customer:customers!inner(name, user_id))')
                    .eq('application.customer.user_id', currentUser.id)
                    .lte('expiry_date', thirtyDaysFromNow)
                    .gt('expiry_date', now.toISOString())
                    .eq('is_completed', false),
                supabase.from('service_providers').select('id, rating').eq('user_id', currentUser.id),
                supabase.from('application_steps')
                    .select('*, application:applications!inner(user_id)')
                    .eq('application.user_id', currentUser.id)
                    .eq('is_outsource', true)
            ];

            const results = await Promise.all(queryPromises);

            // Individual error logging
            results.forEach((res, i) => {
                if (res.error) {
                    console.error(`Dashboard Survey: Query ${i} failed:`, res.error);
                }
            });

            const [custRes, appRes, stepRes, docExpRes, stepExpRes, providersRes, outsourcedRes] = results as any;

            const combinedDeadlines: Milestone[] = [
                ...(docExpRes.data || []).map((d: any) => ({
                    id: d.id,
                    type: 'Document' as const,
                    label: d.name,
                    customerName: (d.customer as any)?.name || 'Unknown',
                    expiryDate: d.expiry_date,
                    daysLeft: Math.ceil((new Date(d.expiry_date).getTime() - now.getTime()) / (1000 * 3600 * 24))
                })),
                ...(stepExpRes.data || []).map((s: any) => ({
                    id: s.id,
                    type: 'Workflow Step' as const,
                    label: s.label,
                    customerName: (s.application as any)?.customer?.name || 'Unknown',
                    expiryDate: s.expiry_date,
                    daysLeft: Math.ceil((new Date(s.expiry_date).getTime() - now.getTime()) / (1000 * 3600 * 24))
                }))
            ].sort((a, b) => a.daysLeft - b.daysLeft);

            const providers = providersRes.data || [];
            const avgRating = providers.length > 0
                ? Number((providers.reduce((sum: number, p: any) => sum + (p.rating || 0), 0) / providers.length).toFixed(1))
                : 0;

            const outsourcedSteps = outsourcedRes.data || [];
            const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

            const outsourcedMetrics = {
                completed: outsourcedSteps.filter((s: any) => s.is_completed).length,
                assigned: outsourcedSteps.filter((s: any) => !s.is_completed).length,
                urgent: outsourcedSteps.filter((s: any) => {
                    if (s.is_completed || !s.expiry_date) return false;
                    const exp = new Date(s.expiry_date);
                    return exp <= threeDaysFromNow && exp >= now;
                }).length
            };

            setDeadlines(combinedDeadlines);
            setStats({
                totalCustomers: custRes.count || 0,
                activeApps: appRes.count || 0,
                pendingSteps: stepRes.count || 0,
                expiringSoon: combinedDeadlines.length,
                totalProviders: providers.length,
                avgProviderRating: avgRating,
                recentApps: (appRes.data || []).map((a: any) => ({
                    primary: a.customer?.name || 'Unknown Customer',
                    secondary: a.service_template?.name || 'Application'
                })),
                outsourced: outsourcedMetrics
            });

            console.log('Dashboard: Stats updated successfully', {
                customers: custRes.count,
                apps: appRes.count,
                pending: stepRes.count
            });

        } catch (err) {
            console.error('CRITICAL: Error fetching dashboard stats:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.page}>
            <div className={styles.bgDecoration} />
            <div className={styles.bgDecoration2} />

            <motion.div
                className={styles.hero}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
            >
                <div className={styles.heroContent}>
                    <div className={styles.heroBadge}>
                        <Zap size={12} fill="currentColor" />
                        <span>Intelligence Engine Active</span>
                    </div>
                    <h1 className={styles.heroTitle}>Welcome Back.</h1>
                    <p className={styles.heroSubtitle}>
                        Your service operations are running smoothly. You have {stats.pendingSteps} pending items requiring attention this week.
                    </p>
                </div>

                <div className={styles.heroVisual}>
                    <div className={styles.chartTitle}>Efficiency Trend</div>
                    <div className={styles.miniChart}>
                        {[40, 70, 45, 90, 65, 85, 100].map((h, i) => (
                            <motion.div
                                key={i}
                                className={styles.chartBar}
                                initial={{ height: 0 }}
                                animate={{ height: `${h}%` }}
                                transition={{ duration: 1, delay: 0.5 + (i * 0.1) }}
                            />
                        ))}
                    </div>
                </div>
            </motion.div>

            <div className={styles.statsGrid}>
                <KPICard icon={Users} label="Total Customers" value={stats.totalCustomers} color="#7c3aed" loading={loading} index={0} />
                <KPICard
                    icon={FileCheck}
                    label="Active Applications"
                    value={stats.activeApps}
                    color="#10b981"
                    loading={loading}
                    index={1}
                    details={stats.recentApps}
                />
                <KPICard icon={Clock} label="Pending Tasks" value={stats.pendingSteps} color="#f59e0b" loading={loading} index={2} />
                <KPICard icon={Briefcase} label="Outsourced Work" value={stats.outsourced.assigned} color="#6366f1" loading={loading} index={3} />
                <KPICard icon={Building2} label="Partner Network" value={stats.totalProviders} color="#0891b2" loading={loading} index={4} />
                <KPICard icon={AlertTriangle} label="Expiring Soon" value={stats.expiringSoon} color="#ef4444" loading={loading} index={5} />
            </div>

            <div className={styles.deadlinesSection}>
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.5 }}
                >
                    <Card className={styles.deadlinesCard}>
                        <div className={styles.deadlinesHeader}>
                            <div className={styles.deadlinesTitle}>
                                <Calendar size={20} color="var(--primary)" />
                                <h3>Upcoming Deadlines</h3>
                            </div>
                            <Button variant="ghost" icon={RefreshCw} onClick={fetchStats} disabled={loading} className={loading ? 'animate-spin' : ''} />
                        </div>

                        <div className={styles.deadlinesList}>
                            {loading ? (
                                <div className={styles.loadingState}>
                                    <Loader2 className="animate-spin" size={32} color="var(--primary)" style={{ margin: '0 auto' }} />
                                </div>
                            ) : deadlines.length === 0 ? (
                                <div className={styles.emptyState}>
                                    No critical deadlines within the next 30 days.
                                </div>
                            ) : (
                                deadlines.map((d, i) => (
                                    <motion.div
                                        key={d.id}
                                        className={styles.deadlineRow}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.6 + (i * 0.05) }}
                                    >
                                        <div className={`${styles.deadlineDays} ${d.daysLeft < 7 ? styles.deadlineDaysUrgent : styles.deadlineDaysWarning}`}>
                                            <span className={styles.deadlineDaysNum}>{d.daysLeft}</span>
                                            <span className={styles.deadlineDaysLabel}>DAYS</span>
                                        </div>
                                        <div className={styles.deadlineInfo}>
                                            <div className={styles.deadlineMeta}>
                                                <span className={`${styles.deadlineType} ${d.type === 'Document' ? styles.deadlineTypeDoc : styles.deadlineTypeStep}`}>
                                                    {d.type.toUpperCase()}
                                                </span>
                                            </div>
                                            <p className={styles.deadlineLabel}>{d.label}</p>
                                            <p className={styles.deadlineCustomer}>Customer: {d.customerName}</p>
                                        </div>
                                        <Button variant="ghost" style={{ padding: '8px' }} onClick={() => d.type === 'Document' ? navigate('/customers') : navigate('/applications')}>
                                            <ArrowRight size={18} />
                                        </Button>
                                    </motion.div>
                                ))
                            )}
                        </div>
                    </Card>
                </motion.div>
            </div>

            <div className={styles.quickNavSection}>
                <h3 className={styles.quickNavTitle}>Quick Navigation</h3>
                <div className={styles.quickNavGrid}>
                    <NavButton label="Manage Customers" onClick={() => navigate('/customers')} index={0} />
                    <NavButton label="Track Workflows" onClick={() => navigate('/applications')} index={1} />
                    <NavButton label="System Templates" onClick={() => navigate('/settings')} index={2} />
                    <NavButton label="Partner Network" onClick={() => navigate('/providers')} index={3} />
                </div>
            </div>
        </div>
    );
};
