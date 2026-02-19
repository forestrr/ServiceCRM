import { useState, useEffect } from 'react';
import { Plus, Wallet, Loader2, CreditCard, Banknote, Building2 } from 'lucide-react';
import { Button, Modal, Input } from '../../components/UI';
import { supabase } from '../../lib/supabase';
import styles from './AccountsPage.module.css';

interface Account {
    id: string;
    name: string;
    type: 'bank' | 'card' | 'cash';
    initial_balance: number;
    current_balance: number;
    currency: string;
    created_at: string;
}

export const AccountsPage = () => {
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        type: 'bank' as Account['type'],
        initial_balance: 0,
        currency: 'AED'
    });

    useEffect(() => {
        fetchAccounts();
    }, []);

    const fetchAccounts = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('accounts')
                .select('*')
                // Requires user to run the migration adding user_id to accounts
                .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
                .order('created_at', { ascending: true });

            if (error) throw error;
            setAccounts(data || []);
        } catch (err) {
            console.error('Error fetching accounts:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleAddAccount = async () => {
        if (!formData.name) return;
        setSaving(true);
        try {
            const { error } = await supabase
                .from('accounts')
                .insert([{
                    ...formData,
                    current_balance: formData.initial_balance
                }]);

            if (error) throw error;
            setIsModalOpen(false);
            setFormData({ name: '', type: 'bank', initial_balance: 0, currency: 'AED' });
            fetchAccounts();
        } catch (err: any) {
            alert(`Error: ${err.message}`);
        } finally {
            setSaving(false);
        }
    };

    const getIcon = (type: Account['type']) => {
        switch (type) {
            case 'bank': return <Building2 size={24} color="var(--primary)" />;
            case 'card': return <CreditCard size={24} color="var(--info)" />;
            case 'cash': return <Banknote size={24} color="var(--success)" />;
            default: return <Wallet size={24} />;
        }
    };

    return (
        <div className={styles.page}>
            <div className={styles.header}>
                <div>
                    <h1 className={styles.title}>Financial Accounts</h1>
                    <p className={styles.subtitle}>Track your business balances across banks and cash.</p>
                </div>
                <Button icon={Plus} onClick={() => setIsModalOpen(true)}>Add Account</Button>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '4rem' }}>
                    <Loader2 className="animate-spin" size={40} color="var(--primary)" style={{ margin: '0 auto' }} />
                </div>
            ) : (
                <div className={styles.grid}>
                    {accounts.map(acc => (
                        <div key={acc.id} className={styles.accountCard}>
                            <div className={styles.cardTop}>
                                <div>
                                    <div className={styles.accountType}>{acc.type}</div>
                                    <div className={styles.title} style={{ fontSize: '1.25rem' }}>{acc.name}</div>
                                </div>
                                {getIcon(acc.type)}
                            </div>
                            <div style={{ marginTop: '1rem' }}>
                                <div className={styles.balanceLabel}>Current Balance</div>
                                <div className={styles.balanceAmount}>
                                    {acc.current_balance.toLocaleString()}
                                    <span className={styles.currency}>{acc.currency}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title="Open New Account"
            >
                <div className={styles.form}>
                    <Input
                        label="Account Name"
                        placeholder="e.g. Emirates NBD Main"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                    <div>
                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem' }}>Account Type</label>
                        <select
                            style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-main)', color: 'var(--text-main)' }}
                            value={formData.type}
                            onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                        >
                            <option value="bank">Bank Account</option>
                            <option value="card">Credit Card</option>
                            <option value="cash">Cash / Petty Cash</option>
                        </select>
                    </div>
                    <Input
                        label="Initial Balance"
                        type="number"
                        value={formData.initial_balance.toString()}
                        onChange={(e) => setFormData({ ...formData, initial_balance: parseFloat(e.target.value) || 0 })}
                    />
                    <Input
                        label="Currency"
                        value={formData.currency}
                        onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                    />
                    <div style={{ marginTop: '1rem' }}>
                        <Button
                            style={{ width: '100%' }}
                            onClick={handleAddAccount}
                            disabled={saving || !formData.name}
                            icon={saving ? Loader2 : Wallet}
                        >
                            {saving ? 'Opening...' : 'Create Account'}
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};
