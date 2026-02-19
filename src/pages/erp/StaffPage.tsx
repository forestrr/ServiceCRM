import { useState, useEffect } from 'react';
import { Plus, Loader2, UserCheck } from 'lucide-react';
import { Button, Modal, Input } from '../../components/UI';
import { Avatar } from '../../components/Avatar';
import { Badge } from '../../components/Badge';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import styles from './StaffPage.module.css';

interface Staff {
    id: string;
    full_name: string;
    role: string;
    salary_type: 'fixed' | 'commission' | 'hybrid';
    commission_rate: number;
    is_active: boolean;
    created_at: string;
}

export const StaffPage = () => {
    const { user } = useAuth();
    const [staff, setStaff] = useState<Staff[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState({
        full_name: '',
        role: '',
        salary_type: 'fixed' as Staff['salary_type'],
        commission_rate: 0
    });

    useEffect(() => {
        if (user) {
            fetchStaff();
        }
    }, [user]);

    const fetchStaff = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('staff')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setStaff(data || []);
        } catch (err) {
            console.error('Error fetching staff:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleAddStaff = async () => {
        if (!formData.full_name || !formData.role || !user) return;
        setSaving(true);
        try {
            const { error } = await supabase
                .from('staff')
                .insert([{
                    ...formData,
                    user_id: user.id,
                    is_active: true
                }]);

            if (error) throw error;
            setIsModalOpen(false);
            setFormData({ full_name: '', role: '', salary_type: 'fixed', commission_rate: 0 });
            fetchStaff();
        } catch (err: any) {
            alert(`Error: ${err.message}`);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className={styles.page}>
            <div className={styles.header}>
                <div>
                    <h1 className={styles.title}>Staff Execution</h1>
                    <p className={styles.subtitle}>Manage internal workload and performance incentives.</p>
                </div>
                <Button icon={Plus} onClick={() => setIsModalOpen(true)}>Add Staff</Button>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '4rem' }}>
                    <Loader2 className="animate-spin" size={40} color="var(--primary)" style={{ margin: '0 auto' }} />
                </div>
            ) : (
                <div className={styles.grid}>
                    {staff.map(person => (
                        <div key={person.id} className={styles.staffCard}>
                            <div className={styles.cardHeader}>
                                <Avatar name={person.full_name} color="blue" />
                                <div className={styles.staffInfo}>
                                    <div className={styles.staffName}>{person.full_name}</div>
                                    <div className={styles.staffRole}>{person.role}</div>
                                </div>
                                <Badge variant={person.is_active ? 'success' : 'warning'}>
                                    {person.is_active ? 'Active' : 'Inactive'}
                                </Badge>
                            </div>
                            <div className={styles.details}>
                                <div className={styles.detailRow}>
                                    <span className={styles.detailLabel}>Salary Type</span>
                                    <span className={styles.detailValue}>{person.salary_type.toUpperCase()}</span>
                                </div>
                                <div className={styles.detailRow}>
                                    <span className={styles.detailLabel}>Commission Rate</span>
                                    <span className={styles.detailValue}>{person.commission_rate}%</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title="Register New Staff"
            >
                <div className={styles.form}>
                    <Input
                        label="Full Name"
                        placeholder="e.g. Michael Scott"
                        value={formData.full_name}
                        onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    />
                    <Input
                        label="Role / Position"
                        placeholder="e.g. Senior Consultant"
                        value={formData.role}
                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    />
                    <div>
                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem' }}>Salary Type</label>
                        <select
                            style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-main)', color: 'var(--text-main)' }}
                            value={formData.salary_type}
                            onChange={(e) => setFormData({ ...formData, salary_type: e.target.value as any })}
                        >
                            <option value="fixed">Fixed Salary</option>
                            <option value="commission">Commission Only</option>
                            <option value="hybrid">Hybrid (Fixed + Commission)</option>
                        </select>
                    </div>
                    {formData.salary_type !== 'fixed' && (
                        <Input
                            label="Commission Rate (%)"
                            type="number"
                            value={formData.commission_rate.toString()}
                            onChange={(e) => setFormData({ ...formData, commission_rate: parseFloat(e.target.value) || 0 })}
                        />
                    )}
                    <div style={{ marginTop: '1rem' }}>
                        <Button
                            style={{ width: '100%' }}
                            onClick={handleAddStaff}
                            disabled={saving || !formData.full_name}
                            icon={saving ? Loader2 : UserCheck}
                        >
                            {saving ? 'Registering...' : 'Register Staff'}
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};
