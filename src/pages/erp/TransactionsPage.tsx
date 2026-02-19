import { useState, useEffect } from 'react';
import { Search, History, Loader2, ArrowUpRight, ArrowDownLeft, Filter } from 'lucide-react';
import { Card, Input } from '../../components/UI';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import styles from './TransactionsPage.module.css';

interface Transaction {
    id: string;
    account_name: string;
    type: 'debit' | 'credit';
    category: string;
    amount: number;
    description: string;
    created_at: string;
}

export const TransactionsPage = () => {
    const { user } = useAuth();
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (user) {
            fetchTransactions();
        }
    }, [user]);

    const fetchTransactions = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('transactions')
                .select(`
                    *,
                    accounts (name)
                `)
                // Transactions link to accounts, which have user_id
                .filter('accounts.user_id', 'eq', user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;

            const mapped: Transaction[] = (data || []).map(t => ({
                id: t.id,
                account_name: t.accounts?.name || 'Unknown',
                type: t.type,
                category: t.category,
                amount: t.amount,
                description: t.description,
                created_at: t.created_at
            }));

            setTransactions(mapped);
        } catch (err) {
            console.error('Error fetching transactions:', err);
        } finally {
            setLoading(false);
        }
    };

    const totalIncome = transactions
        .filter(t => t.type === 'credit')
        .reduce((sum, t) => sum + t.amount, 0);

    const totalExpense = transactions
        .filter(t => t.type === 'debit')
        .reduce((sum, t) => sum + t.amount, 0);

    return (
        <div className={styles.page}>
            <div className={styles.header}>
                <div>
                    <h1 className={styles.title}>Transaction Ledger</h1>
                    <p className={styles.subtitle}>Audit-friendly record of all financial movements.</p>
                </div>
            </div>

            <div className={styles.summary}>
                <Card className={styles.summaryCard}>
                    <div className={styles.summaryLabel}>Total In (Credits)</div>
                    <div className={`${styles.summaryValue} ${styles.credit}`}>
                        + {totalIncome.toLocaleString()} AED
                    </div>
                </Card>
                <Card className={styles.summaryCard}>
                    <div className={styles.summaryLabel}>Total Out (Debits)</div>
                    <div className={`${styles.summaryValue} ${styles.debit}`}>
                        - {totalExpense.toLocaleString()} AED
                    </div>
                </Card>
                <Card className={styles.summaryCard}>
                    <div className={styles.summaryLabel}>Net Cashflow</div>
                    <div className={styles.summaryValue}>
                        {(totalIncome - totalExpense).toLocaleString()} AED
                    </div>
                </Card>
            </div>

            <Card style={{ padding: '0' }}>
                <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)' }}>
                    <Input
                        placeholder="Search transactions..."
                        icon={Search}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                {loading ? (
                    <div style={{ textAlign: 'center', padding: '4rem' }}>
                        <Loader2 className="animate-spin" size={40} color="var(--primary)" style={{ margin: '0 auto' }} />
                    </div>
                ) : (
                    <div className={styles.tableContainer}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th className={styles.th}>Date</th>
                                    <th className={styles.th}>Account</th>
                                    <th className={styles.th}>Category</th>
                                    <th className={styles.th}>Description</th>
                                    <th className={styles.th}>Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                {transactions.map(t => (
                                    <tr key={t.id}>
                                        <td className={styles.td}>
                                            {new Date(t.created_at).toLocaleDateString()}
                                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                                {new Date(t.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                        </td>
                                        <td className={styles.td}>{t.account_name}</td>
                                        <td className={styles.td}>
                                            <span className={styles.category}>{t.category.replace('_', ' ')}</span>
                                        </td>
                                        <td className={styles.td}>{t.description}</td>
                                        <td className={`${styles.td} ${t.type === 'credit' ? styles.credit : styles.debit}`}>
                                            {t.type === 'credit' ? <ArrowUpRight size={14} style={{ marginRight: '4px' }} /> : <ArrowDownLeft size={14} style={{ marginRight: '4px' }} />}
                                            {t.amount.toLocaleString()} AED
                                        </td>
                                    </tr>
                                ))}
                                {transactions.length === 0 && (
                                    <tr>
                                        <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                            No transactions recorded yet.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>
        </div>
    );
};
