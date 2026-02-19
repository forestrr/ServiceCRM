import { useState, useEffect } from 'react';
import { FileText, Loader2, Printer, Send, CreditCard } from 'lucide-react';
import { Button, Card, Modal, Input } from '../../components/UI';
import { Badge } from '../../components/Badge';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { exportToPDF } from '../../utils/pdfExport';
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
    const { user } = useAuth();
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [accounts, setAccounts] = useState<any[]>([]);
    const [profile, setProfile] = useState<any>(null);
    const [paymentData, setPaymentData] = useState({
        amount: 0,
        account_id: '',
        reference: ''
    });

    useEffect(() => {
        if (user) {
            fetchInvoices();
            fetchAccounts();
        }
    }, [user]);

    const fetchInvoices = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('invoices')
                .select(`
                    *,
                    customers (name, trn)
                `)
                // Invoices don't have user_id, they link to customers which have user_id
                .filter('customers.user_id', 'eq', user.id)
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

            // Fetch Profile for company info
            const { data: profData } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();
            if (profData) setProfile(profData);
        } catch (err) {
            console.error('Error fetching invoices:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchAccounts = async () => {
        if (!user) return;
        const { data } = await supabase
            .from('accounts')
            .select('id, name')
            .eq('user_id', user.id);
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
        if (selectedInvoice) {
            window.print();
        }
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

            {/* --- Precision Invoice Preview Modal --- */}
            <Modal
                isOpen={!!selectedInvoice && !showPaymentModal}
                onClose={() => setSelectedInvoice(null)}
                title="Invoice Preview"
                maxWidth="950px"
            >
                {selectedInvoice && (
                    <div className={styles.previewContainer}>
                        <div className={styles.invoiceA4} id="invoice-capture">
                            {/* Header: Logo Left, Title Right */}
                            <div className={styles.invoiceHeader}>
                                <div className={styles.logoInfoArea}>
                                    <div className={styles.logoArea}>
                                        <div className={styles.companyLogo}>
                                            <FileText size={24} />
                                        </div>
                                        <span className={styles.companyName}>{profile?.company_name || 'NAINA GEN TRADING'}</span>
                                    </div>
                                    <div className={styles.companyDetails}>
                                        <p style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '4px' }}>{profile?.company_name || 'Naina General trading LLC.'}</p>
                                        <p>{profile?.company_address || 'Ajman, U.A.E'}</p>
                                        <p>TRN: {profile?.company_trn || '100223182100003'}</p>
                                        <p>D-U-N-S: 123456789</p>
                                    </div>
                                </div>
                                <div className={styles.invoiceTitleArea}>
                                    <h1 className={styles.invoiceTitle}>Invoice</h1>
                                    <div className={styles.invoiceId}># INV-{selectedInvoice.id.split('-')[0].toUpperCase()}</div>
                                </div>
                            </div>

                            {/* Split Meta: Bill To Left, Dates Right */}
                            <div className={styles.metaGrid}>
                                <div>
                                    <div className={styles.metaLabel}>Bill To</div>
                                    <div className={styles.billToValue}>{selectedInvoice.customer_name}</div>
                                    <div style={{ fontSize: '0.85rem', color: '#475569', marginTop: '4px' }}>
                                        Dubai, UAE
                                    </div>
                                    {selectedInvoice.customer_trn && (
                                        <div style={{ fontSize: '0.85rem', marginTop: '2px' }}>TRN: {selectedInvoice.customer_trn}</div>
                                    )}
                                </div>
                                <div className={styles.metaDetailsGrid}>
                                    <div className={styles.metaDetailLabel}>Invoice Date :</div>
                                    <div className={styles.metaDetailValue}>{new Date(selectedInvoice.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                                    <div className={styles.metaDetailLabel}>Due Date :</div>
                                    <div className={styles.metaDetailValue}>{new Date(selectedInvoice.due_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                                    <div className={styles.metaDetailLabel}>Reference :</div>
                                    <div className={styles.metaDetailValue}>INV-{selectedInvoice.id.split('-')[0].toUpperCase()}</div>
                                </div>
                            </div>

                            {/* Teal Stylized Table */}
                            <table className={styles.itemsTable}>
                                <thead>
                                    <tr>
                                        <th style={{ width: '40px', textAlign: 'center' }}>#</th>
                                        <th>Item & Description</th>
                                        <th style={{ width: '60px', textAlign: 'center' }}>Qty</th>
                                        <th style={{ width: '100px', textAlign: 'right' }}>Rate</th>
                                        <th style={{ width: '100px', textAlign: 'right' }}>Taxable Amount</th>
                                        <th style={{ width: '80px', textAlign: 'right' }}>Tax</th>
                                        <th style={{ width: '110px', textAlign: 'right' }}>Amount</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {selectedInvoice.items?.map((item, idx) => (
                                        <tr key={idx}>
                                            <td style={{ textAlign: 'center' }}>{idx + 1}</td>
                                            <td className={styles.descriptionCell}>
                                                <div style={{ fontWeight: 600 }}>{item.description.split(':')[0]}</div>
                                                <span className={styles.subDescription}>{item.description.split(':').slice(1).join(':') || 'Service execution and delivery'}</span>
                                            </td>
                                            <td style={{ textAlign: 'center' }}>{item.quantity.toFixed(2)}</td>
                                            <td style={{ textAlign: 'right' }}>{item.unit_price.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                            <td style={{ textAlign: 'right' }}>{item.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                            <td style={{ textAlign: 'right' }}>
                                                <div>{(item.total * 0.05).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                                                <div style={{ fontSize: '0.7rem', color: '#64748b' }}>5.00%</div>
                                            </td>
                                            <td style={{ textAlign: 'right', fontWeight: 600 }}>{(item.total * 1.05).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            {/* Financial Block */}
                            <div className={styles.financialContainer}>
                                <div className={styles.totalsBox}>
                                    <table className={styles.totalsTable}>
                                        <tbody>
                                            <tr>
                                                <td className={styles.totalRowLabel}>Sub Total</td>
                                                <td className={styles.totalRowValue}>{selectedInvoice.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                            </tr>
                                            <tr>
                                                <td className={styles.totalRowLabel}>Total Taxable Amount</td>
                                                <td className={styles.totalRowValue}>{selectedInvoice.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                            </tr>
                                            <tr>
                                                <td className={styles.totalRowLabel}>VAT (5%)</td>
                                                <td className={styles.totalRowValue}>{selectedInvoice.vat.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                            </tr>
                                            <tr className={styles.grandTotalRow}>
                                                <td className={styles.grandTotalLabel}>Total</td>
                                                <td className={styles.grandTotalValue}>AED {selectedInvoice.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <div className={styles.totalInWords}>
                                <strong>Total In Words:</strong> AED {selectedInvoice.total.toLocaleString()} only
                            </div>

                            <div className={styles.footer}>
                                <div className={styles.termsContainer}>
                                    <p style={{ fontWeight: 700, marginBottom: '5px' }}>Notes</p>
                                    <p>Thank you for your business!</p>
                                    <p style={{ fontWeight: 700, marginTop: '20px', marginBottom: '5px' }}>Terms & Conditions</p>
                                    <p>Please make payment within the due date to avoid service interruption.</p>
                                </div>

                                <div className={styles.signatureContainer}>
                                    <div>
                                        <div className={styles.signatureLine}></div>
                                        <div className={styles.signatureText}>Authorized Signature</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className={styles.previewActions}>
                            <div className={`${styles.actionButton}`} onClick={handlePrint} style={{ background: '#1e293b', color: 'white', border: 'none' }}>
                                <Printer className={styles.actionIcon} />
                                <span className={styles.actionLabel}>Print / PDF</span>
                            </div>
                            <div className={styles.actionButton}>
                                <Send className={styles.actionIcon} />
                                <span className={styles.actionLabel}>Email Client</span>
                            </div>
                            <div className={styles.actionButton} onClick={() => setSelectedInvoice(null)}>
                                <span className={styles.actionLabel}>Close</span>
                            </div>
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
