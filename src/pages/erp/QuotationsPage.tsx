import { useState, useEffect } from 'react';
import { Search, Plus, FileText, Loader2, Trash2, Printer, Send } from 'lucide-react';
import { Button, Card, Modal, Input } from '../../components/UI';
import { Badge } from '../../components/Badge';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import styles from './QuotationsPage.module.css';

interface QuotationItem {
    id?: string;
    description: string;
    quantity: number;
    unit_price: number;
    total: number;
}

interface Quotation {
    id: string;
    customer_id: string;
    customer_name: string;
    service_template_id: string;
    service_template_name?: string;
    status: 'draft' | 'sent' | 'approved' | 'rejected';
    subtotal: number;
    vat: number;
    total: number;
    valid_until: string;
    created_at: string;
    items?: QuotationItem[];
}

export const QuotationsPage = () => {
    const { user } = useAuth();
    const [quotations, setQuotations] = useState<Quotation[]>([]);
    const [customers, setCustomers] = useState<any[]>([]);
    const [templates, setTemplates] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState({
        customer_id: '',
        service_template_id: '',
        valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        items: [{ description: '', quantity: 1, unit_price: 0, total: 0 }] as QuotationItem[]
    });

    const [selectedQuotation, setSelectedQuotation] = useState<Quotation | null>(null);
    const [viewingQuotation, setViewingQuotation] = useState<Quotation | null>(null);

    useEffect(() => {
        if (user) {
            fetchData();
            fetchBasics();
        }
    }, [user]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('quotations')
                .select(`
                    *,
                    customers (name),
                    service_templates (name)
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;

            const mappedData: Quotation[] = (data || []).map(q => ({
                id: q.id,
                customer_id: q.customer_id,
                customer_name: q.customers?.name || 'Unknown',
                service_template_id: q.service_template_id,
                service_template_name: q.service_templates?.name,
                status: q.status,
                subtotal: q.subtotal,
                vat: q.vat,
                total: q.total,
                valid_until: q.valid_until,
                created_at: q.created_at
            }));

            setQuotations(mappedData);
        } catch (err) {
            console.error('Error fetching quotations:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchBasics = async () => {
        const [custRes, tempRes] = await Promise.all([
            supabase.from('customers').select('id, name').order('name'),
            supabase.from('service_templates').select('*').order('name')
        ]);
        if (custRes.data) setCustomers(custRes.data);
        if (tempRes.data) setTemplates(tempRes.data);
    };

    const handleTemplateChange = (templateId: string) => {
        const template = templates.find(t => t.id === templateId);
        if (!template) {
            setFormData({ ...formData, service_template_id: '', items: [{ description: '', quantity: 1, unit_price: 0, total: 0 }] });
            return;
        }

        const newItems: QuotationItem[] = [];

        // 1. Base Charge
        if (template.base_charge > 0) {
            newItems.push({
                description: `${template.name}: Base Service Fee`,
                quantity: 1,
                unit_price: template.base_charge,
                total: template.base_charge
            });
        }

        // 2. Step Charges
        if (template.default_steps && Array.isArray(template.default_steps)) {
            template.default_steps.forEach((s: any) => {
                if (s.charge > 0) {
                    newItems.push({
                        description: `Phase: ${s.label}`,
                        quantity: 1,
                        unit_price: s.charge,
                        total: s.charge
                    });
                }
            });
        }

        // 3. Fallback if no charges
        if (newItems.length === 0) {
            newItems.push({ description: template.name, quantity: 1, unit_price: 0, total: 0 });
        }

        setFormData({
            ...formData,
            service_template_id: templateId,
            items: newItems
        });
    };

    const addItem = () => {
        setFormData({
            ...formData,
            items: [...formData.items, { description: '', quantity: 1, unit_price: 0, total: 0 }]
        });
    };

    const removeItem = (index: number) => {
        if (formData.items.length <= 1) return;
        setFormData({
            ...formData,
            items: formData.items.filter((_, i) => i !== index)
        });
    };

    const updateItem = (index: number, updates: Partial<QuotationItem>) => {
        const newItems = [...formData.items];
        const item = { ...newItems[index], ...updates };
        item.total = item.quantity * item.unit_price;
        newItems[index] = item;
        setFormData({ ...formData, items: newItems });
    };

    const calculateTotals = () => {
        const subtotal = formData.items.reduce((sum, item) => sum + item.total, 0);
        const vat = subtotal * 0.05; // 5% VAT
        const total = subtotal + vat;
        return { subtotal, vat, total };
    };

    const handleCreateQuotation = async () => {
        if (!formData.customer_id || formData.items.some(i => !i.description)) {
            alert('Please select a customer and provide descriptions for all items.');
            return;
        }

        setSaving(true);
        try {
            const { subtotal, vat, total } = calculateTotals();

            // 1. Create Quotation
            const { data: qData, error: qError } = await supabase
                .from('quotations')
                .insert([{
                    customer_id: formData.customer_id,
                    service_template_id: formData.service_template_id || null,
                    valid_until: formData.valid_until,
                    subtotal,
                    vat,
                    total,
                    status: 'draft'
                }])
                .select()
                .single();

            if (qError) throw qError;

            // 2. Create Quotation Items
            const itemsToInsert = formData.items.map(item => ({
                quotation_id: qData.id,
                description: item.description,
                quantity: item.quantity,
                unit_price: item.unit_price,
                total: item.total
            }));

            const { error: iError } = await supabase.from('quotation_items').insert(itemsToInsert);
            if (iError) throw iError;

            // --- WORKFLOW 2: AUTO-APPLICATION (DRAFT) ---
            const template = templates.find(t => t.id === formData.service_template_id);
            const { data: appData, error: appErr } = await supabase
                .from('applications')
                .insert([{
                    customer_id: formData.customer_id,
                    service_template_id: formData.service_template_id || null,
                    quotation_id: qData.id,
                    description: template ? template.name : `Custom Service`,
                    status: 'Proposed',
                    progress: 0,
                    user_id: user?.id
                }])
                .select()
                .single();

            if (!appErr && appData && template?.default_steps) {
                const appSteps = template.default_steps.map((s: any, idx: number) => ({
                    application_id: appData.id,
                    label: s.label,
                    description: s.description,
                    is_completed: false,
                    is_outsource: s.is_outsource || false,
                    position: idx
                }));
                await supabase.from('application_steps').insert(appSteps);
            }
            // --------------------------------------------

            setIsModalOpen(false);
            setFormData({
                customer_id: '',
                service_template_id: '',
                valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                items: [{ description: '', quantity: 1, unit_price: 0, total: 0 }]
            });
            fetchData();
        } catch (err: any) {
            console.error('Error creating quotation:', err);
            alert(`Failed to create quotation: ${err.message}`);
        } finally {
            setSaving(false);
        }
    };

    const handleApprove = async (quote: Quotation) => {
        if (!confirm('Are you sure you want to approve this quotation? This will activate the workspace and create a draft invoice.')) return;

        setLoading(true);
        try {
            // 1. Update quotation status
            const { error: qErr } = await supabase
                .from('quotations')
                .update({ status: 'approved' })
                .eq('id', quote.id);
            if (qErr) throw qErr;

            // 2. Find and Activate Application
            const { data: existingApp } = await supabase
                .from('applications')
                .select('id')
                .eq('quotation_id', quote.id)
                .single();

            let targetAppId = existingApp?.id;

            if (targetAppId) {
                await supabase
                    .from('applications')
                    .update({ status: 'Active' })
                    .eq('id', targetAppId);
            } else {
                // Should not happen, but create one if missing
                const { data: newApp } = await supabase
                    .from('applications')
                    .insert([{
                        customer_id: quote.customer_id,
                        service_template_id: quote.service_template_id,
                        quotation_id: quote.id,
                        status: 'Active',
                        progress: 0,
                        user_id: user?.id
                    }])
                    .select()
                    .single();
                targetAppId = newApp?.id;
            }

            // 3. Generate Draft Invoice
            if (targetAppId) {
                const { data: qItems } = await supabase
                    .from('quotation_items')
                    .select('*')
                    .eq('quotation_id', quote.id);

                const { data: inv } = await supabase
                    .from('invoices')
                    .insert([{
                        application_id: targetAppId,
                        customer_id: quote.customer_id,
                        invoice_number: `INV-${Date.now().toString().slice(-6)}`,
                        subtotal: quote.subtotal,
                        vat: quote.vat,
                        total: quote.total,
                        status: 'draft',
                        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
                    }])
                    .select()
                    .single();

                if (inv && qItems) {
                    const invoiceItems = qItems.map(qi => ({
                        invoice_id: inv.id,
                        description: qi.description,
                        quantity: qi.quantity,
                        unit_price: qi.unit_price,
                        total: qi.total
                    }));
                    await supabase.from('invoice_items').insert(invoiceItems);
                }
            }

            const fetchQuotationItems = async (quotationId: string) => {
                const { data, error } = await supabase
                    .from('quotation_items')
                    .select('*')
                    .eq('quotation_id', quotationId);

                if (error) return [];
                return data;
            };

            const handleViewQuotation = async (quote: Quotation) => {
                const items = await fetchQuotationItems(quote.id);
                setViewingQuotation({ ...quote, items });
            };

            const handlePrint = () => {
                window.print();
            };

            fetchData();
        } catch (err: any) {
            console.error('Error approving quotation:', err);
            alert(`Approval failed: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    const { subtotal, vat, total } = calculateTotals();

    const filteredQuotations = quotations.filter(q =>
        q.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        q.id.split('-')[0].includes(searchTerm.toLowerCase())
    );

    return (
        <div className={styles.page}>
            <div className={styles.header}>
                <div>
                    <h1 className={styles.title}>Quotations</h1>
                    <p className={styles.subtitle}>Manage service estimates and kickoff new projects.</p>
                </div>
                <Button icon={Plus} onClick={() => setIsModalOpen(true)}>New Quotation</Button>
            </div>

            <Card style={{ padding: '0' }}>
                <div className={styles.searchBar}>
                    <div className={styles.searchWrapper}>
                        <Search size={18} className={styles.searchIcon} />
                        <input
                            placeholder="Search by customer name or ID..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className={styles.searchInput}
                        />
                    </div>
                </div>

                {loading ? (
                    <div className={styles.loadingState}>
                        <Loader2 className="animate-spin" size={40} color="var(--primary)" style={{ margin: '0 auto' }} />
                        <p className={styles.loadingText}>Loading quotations...</p>
                    </div>
                ) : (
                    <div className={styles.tableWrapper}>
                        <table className={styles.table}>
                            <thead>
                                <tr className={styles.tableHead}>
                                    <th className={styles.th}>ID / Date</th>
                                    <th className={styles.th}>Customer</th>
                                    <th className={styles.th}>Service Template</th>
                                    <th className={styles.th}>Amount</th>
                                    <th className={styles.th}>Status</th>
                                    <th className={styles.thRight}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredQuotations.map(q => (
                                    <tr key={q.id} className={styles.tr}>
                                        <td className={styles.td}>
                                            <div style={{ fontWeight: 600 }}>#{q.id.split('-')[0]}</div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                {new Date(q.created_at).toLocaleDateString()}
                                            </div>
                                        </td>
                                        <td className={styles.td}>{q.customer_name}</td>
                                        <td className={styles.td}>{q.service_template_name || 'Custom Service'}</td>
                                        <td className={styles.td}>
                                            <div className={styles.amount}>{q.total.toLocaleString()} AED</div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                Incl. {(q.vat).toLocaleString()} VAT
                                            </div>
                                        </td>
                                        <td className={styles.td}>
                                            <Badge variant={
                                                q.status === 'approved' ? 'success' :
                                                    q.status === 'rejected' ? 'danger' :
                                                        q.status === 'sent' ? 'info' : 'warning'
                                            }>
                                                {q.status.toUpperCase()}
                                            </Badge>
                                        </td>
                                        <td className={styles.tdRight}>
                                            <div className={styles.actionsCell}>
                                                {q.status === 'draft' && (
                                                    <Button variant="outline" onClick={() => handleApprove(q)}>
                                                        Approve
                                                    </Button>
                                                )}
                                                <Button variant="ghost" title="View Items" onClick={() => handleViewQuotation(q)}>
                                                    <FileText size={18} />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {filteredQuotations.length === 0 && (
                                    <tr>
                                        <td colSpan={6} style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                            No quotations found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title="Create New Quotation"
                maxWidth="800px"
            >
                <div className={styles.form}>
                    <div className={styles.twoCol}>
                        <div>
                            <label className={styles.itemsTitle} style={{ marginBottom: '0.5rem', display: 'block' }}>Customer</label>
                            <select
                                className={styles.searchInput}
                                style={{ paddingLeft: '1rem' }}
                                value={formData.customer_id}
                                onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
                            >
                                <option value="">Select Customer...</option>
                                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className={styles.itemsTitle} style={{ marginBottom: '0.5rem', display: 'block' }}>Service Template</label>
                            <select
                                className={styles.searchInput}
                                style={{ paddingLeft: '1rem' }}
                                value={formData.service_template_id}
                                onChange={(e) => handleTemplateChange(e.target.value)}
                            >
                                <option value="">Custom / None</option>
                                {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className={styles.itemsHeader}>
                        <h3 className={styles.itemsTitle}>Quotation Items</h3>
                        <Button variant="outline" icon={Plus} onClick={addItem}>Add Item</Button>
                    </div>

                    <div style={{ maxHeight: '300px', overflowY: 'auto', paddingRight: '0.5rem' }}>
                        {formData.items.map((item, index) => (
                            <div key={index} className={styles.itemRow}>
                                <Input
                                    label={index === 0 ? "Description" : ""}
                                    placeholder="e.g. Consultancy Fee"
                                    value={item.description}
                                    onChange={(e) => updateItem(index, { description: e.target.value })}
                                />
                                <Input
                                    label={index === 0 ? "Qty" : ""}
                                    type="number"
                                    value={item.quantity.toString()}
                                    onChange={(e) => updateItem(index, { quantity: parseInt(e.target.value) || 0 })}
                                />
                                <Input
                                    label={index === 0 ? "Unit Price" : ""}
                                    type="number"
                                    value={item.unit_price.toString()}
                                    onChange={(e) => updateItem(index, { unit_price: parseFloat(e.target.value) || 0 })}
                                />
                                <Button
                                    variant="ghost"
                                    onClick={() => removeItem(index)}
                                    style={{ marginBottom: '4px', color: 'var(--danger)', padding: '8px' }}
                                    disabled={formData.items.length === 1}
                                >
                                    <Trash2 size={18} />
                                </Button>
                            </div>
                        ))}
                    </div>

                    <div className={styles.totalSection}>
                        <div className={styles.totalRow}>
                            <span>Subtotal:</span>
                            <span>{subtotal.toLocaleString()} AED</span>
                        </div>
                        <div className={styles.totalRow}>
                            <span>VAT (5%):</span>
                            <span>{vat.toLocaleString()} AED</span>
                        </div>
                        <div className={`${styles.totalRow} ${styles.totalRowMain}`}>
                            <span>Total:</span>
                            <span>{total.toLocaleString()} AED</span>
                        </div>
                    </div>

                    <div className={styles.formActions}>
                        <Button
                            style={{ flex: 2 }}
                            onClick={handleCreateQuotation}
                            disabled={saving || !formData.customer_id}
                            icon={saving ? Loader2 : FileText}
                        >
                            {saving ? 'Creating...' : 'Create Quotation'}
                        </Button>
                        <Button variant="outline" style={{ flex: 1 }} onClick={() => setIsModalOpen(false)}>Cancel</Button>
                    </div>
                </div>
            </Modal>

            {/* --- Modern Quotation Preview Modal --- */}
            <Modal
                isOpen={!!viewingQuotation}
                onClose={() => setViewingQuotation(null)}
                title="Quotation Preview"
                maxWidth="900px"
            >
                {viewingQuotation && (
                    <div className={styles.previewContainer}>
                        <div className={styles.quotationA4}>
                            <div className={styles.quotationHeader}>
                                <div className={styles.companyInfo}>
                                    <h2>SERVICE CRM ERP</h2>
                                    <p>Prime Tower, Business Bay</p>
                                    <p>Dubai, United Arab Emirates</p>
                                    <p>TRN: 100234567890003</p>
                                </div>
                                <div className={styles.quotationMeta}>
                                    <h1>QUOTATION</h1>
                                    <p><strong># {viewingQuotation.id.split('-')[0].toUpperCase()}</strong></p>
                                    <p>Issued: {new Date(viewingQuotation.created_at).toLocaleDateString()}</p>
                                    <p>Valid Until: {new Date(viewingQuotation.valid_until).toLocaleDateString()}</p>
                                </div>
                            </div>

                            <div className={styles.billTo}>
                                <div className={styles.billToTitle}>Quotation For:</div>
                                <h3 className={styles.clientName}>{viewingQuotation.customer_name}</h3>
                                <p style={{ margin: '4px 0', color: '#666' }}>Client Ref: CRM-{viewingQuotation.id.split('-')[0]}</p>
                            </div>

                            <table className={styles.itemsTable}>
                                <thead>
                                    <tr>
                                        <th>Service Description</th>
                                        <th style={{ textAlign: 'center', width: '60px' }}>Qty</th>
                                        <th style={{ textAlign: 'right', width: '120px' }}>Unit Price</th>
                                        <th style={{ textAlign: 'right', width: '120px' }}>Total (AED)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {viewingQuotation.items?.map((item, idx) => (
                                        <tr key={idx}>
                                            <td style={{ fontWeight: 500 }}>{item.description}</td>
                                            <td style={{ textAlign: 'center' }}>{item.quantity}</td>
                                            <td style={{ textAlign: 'right' }}>{item.unit_price.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                            <td style={{ textAlign: 'right', fontWeight: 600 }}>{item.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            <div className={styles.totalsArea}>
                                <div className={styles.totalsBox}>
                                    <div className={styles.totalRow}>
                                        <span className={styles.totalRowLabel}>Subtotal</span>
                                        <span className={styles.totalRowValue}>{viewingQuotation.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })} AED</span>
                                    </div>
                                    <div className={styles.totalRow}>
                                        <span className={styles.totalRowLabel}>VAT (5.0%)</span>
                                        <span className={styles.totalRowValue}>{viewingQuotation.vat.toLocaleString(undefined, { minimumFractionDigits: 2 })} AED</span>
                                    </div>
                                    <div className={`${styles.totalRow} ${styles.grandTotal}`}>
                                        <span className={styles.totalRowLabel}>Grand Total</span>
                                        <span className={styles.totalRowValue}>{viewingQuotation.total.toLocaleString(undefined, { minimumFractionDigits: 2 })} AED</span>
                                    </div>
                                </div>
                            </div>

                            <div className={styles.footer}>
                                <p style={{ fontWeight: 700, color: '#1a1a1a', marginBottom: '8px' }}>Terms & Conditions</p>
                                <p>1. This quotation is valid for 30 days from the date of issue.</p>
                                <p>2. Payment terms as per contract milestones.</p>
                                <p style={{ marginTop: '20px' }}>Thank you for choosing Service CRM!</p>
                            </div>
                        </div>

                        <div className={styles.previewActions}>
                            <Button icon={Printer} onClick={handlePrint}>Print Quotation</Button>
                            <Button variant="outline" icon={Send}>Email to Client</Button>
                            <Button variant="ghost" onClick={() => setViewingQuotation(null)}>Close Preview</Button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};
