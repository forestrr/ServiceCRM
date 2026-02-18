import { useState, useEffect } from 'react';
import { FileText, Loader2, Printer, Send, CreditCard } from 'lucide-react';
import { Button, Card, Modal, Input } from '../../components/UI';
import { Badge } from '../../components/Badge';
import { supabase } from '../../lib/supabase';
import styles from './InvoicesPage.module.css';

interface InvoiceItem {
    id: string;
    description: string;
    quantity: number;
    unit_price: number;
    total: number;
}

interface Invoice {
    id: string;
    customer_name: string;
    customer_trn?: string;
    status: 'unpaid' | 'partial' | 'paid' | 'overdue';
    subtotal: number;
    vat: number;
    total: number;
    due_date: string;
    created_at: string;
    items?: InvoiceItem[];
}

export const InvoicesPage = () => {
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [accounts, setAccounts] = useState<any[]>([]);
    const [paymentData, setPaymentData] = useState({
        amount: 0,
        account_id: '',
        reference: ''
    });

    useEffect(() => {
        fetchInvoices();
        fetchAccounts();
    }, []);

    const fetchInvoices = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('invoices')
                .select(`
                    *,
                    customers (name, trn)
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;

            const mapped: Invoice[] = (data || []).map(inv => ({
                id: inv.id,
                customer_name: inv.customers?.name || 'Unknown',
                customer_trn: inv.customers?.trn,
                status: inv.status,
                subtotal: inv.subtotal,
                vat: inv.vat,
                total: inv.total,
                due_date: inv.due_date,
                created_at: inv.created_at
            }));

            setInvoices(mapped);
        } catch (err) {
            console.error('Error fetching invoices:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchAccounts = async () => {
        const { data } = await supabase.from('accounts').select('id, name');
        if (data) setAccounts(data);
    };

    const fetchInvoiceItems = async (invoiceId: string) => {
        const { data, error } = await supabase
            .from('invoice_items')
            .select('*')
            .eq('invoice_id', invoiceId);

        if (error) return [];
        return data;
    };

    const handleViewInvoice = async (invoice: Invoice) => {
        const items = await fetchInvoiceItems(invoice.id);
        setSelectedInvoice({ ...invoice, items });
    };

    const handlePrint = () => {
        window.print();
    };

    const handleRecordPayment = async () => {
        if (!selectedInvoice || !paymentData.account_id || paymentData.amount <= 0) return;

        try {
            // 1. Insert into transactions (the trigger will update account balance)
            const { error: txError } = await supabase
                .from('transactions')
                .insert([{
                    account_id: paymentData.account_id,
                    type: 'credit', // Money coming in
                    category: 'client_payment',
                    amount: paymentData.amount,
                    description: `Payment for Invoice #${selectedInvoice.id.split('-')[0]} - ${paymentData.reference}`,
                    created_by: (await supabase.auth.getUser()).data.user?.id
                }]);

            if (txError) throw txError;

            // Update invoice status
            const newStatus = paymentData.amount >= selectedInvoice.total ? 'paid' : 'partial';
            await supabase
                .from('invoices')
                .update({ status: newStatus })
                .eq('id', selectedInvoice.id);

            setShowPaymentModal(false);
            fetchInvoices();
            setSelectedInvoice(null);
        } catch (err: any) {
            alert(`Payment failed: ${err.message}`);
        }
    };

    const filteredInvoices = invoices.filter(inv =>
        inv.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inv.id.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className={styles.page}>
            <div className={styles.header}>
                <div>
                    <h1 className={styles.title}>Invoices</h1>
                    <p className={styles.subtitle}>Automated billing and payment tracking for your services.</p>
                </div>
            </div>

            <Card style={{ padding: '0' }}>
                <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)' }}>
                    <Input
                        placeholder="Search invoices by customer or ID..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                {loading ? (
                    <div style={{ textAlign: 'center', padding: '4rem' }}>
                        <Loader2 className="animate-spin" size={40} color="var(--primary)" style={{ margin: '0 auto' }} />
                    </div>
                ) : (
                    <table className={styles.invoiceTable}>
                        <thead>
                            <tr>
                                <th className={styles.th}>ID</th>
                                <th className={styles.th}>Customer</th>
                                <th className={styles.th}>Amount</th>
                                <th className={styles.th}>Status</th>
                                <th className={styles.th}>Due Date</th>
                                <th className={styles.thRight}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredInvoices.map(inv => (
                                <tr key={inv.id}>
                                    <td className={styles.td}>#{inv.id.split('-')[0]}</td>
                                    <td className={styles.td}>{inv.customer_name}</td>
                                    <td className={styles.td}>
                                        <div className={styles.amount}>{inv.total.toLocaleString()} AED</div>
                                    </td>
                                    <td className={styles.td}>
                                        <Badge variant={
                                            inv.status === 'paid' ? 'success' :
                                                inv.status === 'partial' ? 'info' :
                                                    inv.status === 'overdue' ? 'danger' : 'warning'
                                        }>
                                            {inv.status.toUpperCase()}
                                        </Badge>
                                    </td>
                                    <td className={styles.td}>{new Date(inv.due_date).toLocaleDateString()}</td>
                                    <td className={`${styles.td} ${styles.invoiceActionCell}`}>
                                        <Button variant="ghost" onClick={() => handleViewInvoice(inv)}>
                                            <FileText size={18} />
                                        </Button>
                                        {inv.status !== 'paid' && (
                                            <Button variant="outline" onClick={() => { setSelectedInvoice(inv); setShowPaymentModal(true); }}>
                                                Pay
                                            </Button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </Card>

            {/* View/Print Modal */}
            <Modal
                isOpen={!!selectedInvoice && !showPaymentModal}
                onClose={() => setSelectedInvoice(null)}
                title="Invoice Preview"
                maxWidth="900px"
            >
                {selectedInvoice && (
                    <div className={styles.previewContainer}>
                        <div className={styles.invoiceA4}>
                            <div className={styles.invoiceHeader}>
                                <div className={styles.companyInfo}>
                                    <h2>SERVICE CRM ERP</h2>
                                    <p>Business Bay, Dubai, UAE</p>
                                    <p>TRN: 100234567890003</p>
                                </div>
                                <div className={styles.invoiceMeta}>
                                    <h1>INVOICE</h1>
                                    <p><strong># {selectedInvoice.id.split('-')[0]}</strong></p>
                                    <p>Date: {new Date(selectedInvoice.created_at).toLocaleDateString()}</p>
                                    <p>Due: {new Date(selectedInvoice.due_date).toLocaleDateString()}</p>
                                </div>
                            </div>

                            <div className={styles.billTo}>
                                <div className={styles.billToTitle}>Bill To:</div>
                                <h3 className={styles.clientName}>{selectedInvoice.customer_name}</h3>
                                {selectedInvoice.customer_trn && <p>TRN: {selectedInvoice.customer_trn}</p>}
                            </div>

                            <table className={styles.itemsTable}>
                                <thead>
                                    <tr>
                                        <th>Description</th>
                                        <th style={{ textAlign: 'center' }}>Qty</th>
                                        <th style={{ textAlign: 'right' }}>Unit Price</th>
                                        <th style={{ textAlign: 'right' }}>Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {selectedInvoice.items?.map((item, idx) => (
                                        <tr key={idx}>
                                            <td>{item.description}</td>
                                            <td style={{ textAlign: 'center' }}>{item.quantity}</td>
                                            <td style={{ textAlign: 'right' }}>{item.unit_price.toLocaleString()}</td>
                                            <td style={{ textAlign: 'right' }}>{item.total.toLocaleString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            <div className={styles.totalsArea}>
                                <div className={styles.totalsBox}>
                                    <div className={styles.totalRow}>
                                        <span className={styles.totalRowLabel}>Subtotal</span>
                                        <span className={styles.totalRowValue}>{selectedInvoice.subtotal.toLocaleString()} AED</span>
                                    </div>
                                    <div className={styles.totalRow}>
                                        <span className={styles.totalRowLabel}>VAT (5%)</span>
                                        <span className={styles.totalRowValue}>{selectedInvoice.vat.toLocaleString()} AED</span>
                                    </div>
                                    <div className={`${styles.totalRow} ${styles.grandTotal}`}>
                                        <span className={styles.totalRowLabel}>Grand Total</span>
                                        <span className={styles.totalRowValue}>{selectedInvoice.total.toLocaleString()} AED</span>
                                    </div>
                                </div>
                            </div>

                            <div className={styles.footer}>
                                <p>Thank you for your business!</p>
                                <p>This is a computer-generated document. No signature required.</p>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem', justifyContent: 'center' }}>
                            <Button icon={Printer} onClick={handlePrint}>Print / Save PDF</Button>
                            <Button variant="outline" icon={Send}>Email Invoice</Button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Payment Modal */}
            <Modal
                isOpen={showPaymentModal}
                onClose={() => setShowPaymentModal(false)}
                title="Record Client Payment"
                maxWidth="450px"
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <div style={{ textAlign: 'center', padding: '1rem', background: 'var(--bg-hover)', borderRadius: '12px' }}>
                        <p style={{ margin: 0, color: 'var(--text-muted)' }}>Outstanding Balance</p>
                        <h2 style={{ margin: 0, color: 'var(--text-main)' }}>{selectedInvoice?.total.toLocaleString()} AED</h2>
                    </div>

                    <Input
                        label="Payment Amount"
                        type="number"
                        value={paymentData.amount.toString()}
                        onChange={(e) => setPaymentData({ ...paymentData, amount: parseFloat(e.target.value) || 0 })}
                    />

                    <div>
                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>Deposit Account</label>
                        <select
                            style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-main)', color: 'var(--text-main)' }}
                            value={paymentData.account_id}
                            onChange={(e) => setPaymentData({ ...paymentData, account_id: e.target.value })}
                        >
                            <option value="">Select Account...</option>
                            {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                        </select>
                    </div>

                    <Input
                        label="Payment Reference"
                        placeholder="e.g. Bank Transfer Ref / Cheque #"
                        value={paymentData.reference}
                        onChange={(e) => setPaymentData({ ...paymentData, reference: e.target.value })}
                    />

                    <Button
                        style={{ marginTop: '1rem' }}
                        icon={CreditCard}
                        onClick={handleRecordPayment}
                        disabled={!paymentData.account_id || paymentData.amount <= 0}
                    >
                        Confirm Payment
                    </Button>
                </div>
            </Modal>
        </div>
    );
};
