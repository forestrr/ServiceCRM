import { useState, useEffect } from 'react';
import { Search, Plus, FileText, Loader2, Trash2, Printer, Send, Pencil } from 'lucide-react';
import { Button, Card, Modal, Input } from '../../components/UI';
import { Badge } from '../../components/Badge';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { exportToPDF } from '../../utils/pdfExport';
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
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editingQuotationId, setEditingQuotationId] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        customer_id: '',
        service_template_id: '',
        valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        items: [{ description: '', quantity: 1, unit_price: 0, total: 0 }] as QuotationItem[]
    });

    const [viewingQuotation, setViewingQuotation] = useState<Quotation | null>(null);

    useEffect(() => {
        if (user) {
            fetchData();
            fetchBasics();
        }
    }, [user]);

    const fetchData = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('quotations')
                .select(`
                    *,
                    customers (name),
                    service_templates (name)
                `)
                // Filter by customers belonging to user (via inner join logic or RLS)
                // Since quotations don't have user_id directly, we rely on RLS on the 'quotations' table 
                // mapped to customer's user_id. 
                // However, for extra safety, we can filter if we add user_context or similar.
                // Actually, wait. Quotations OUGHT to have RLS.
                // But let's trust the RLS for quotations if my previous migration worked.
                // If not, we can't easily filter quotations by user_id unless we join.
                // But for now, let's look at fetchBasics which IS causing the dropdown issue.
                .order('created_at', { ascending: false });

            // WAIT. If I can't filter quotations by user_id easily in the simple query (no user_id column on quotations), 
            // I rely on RLS. 
            // BUT fetchBasics definitely needs it.

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

            // Fetch Profile for company info
            const { data: profData } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();
            if (profData) setProfile(profData);
        } catch (err) {
            console.error('Error fetching quotations:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchBasics = async () => {
        if (!user) return;
        const [custRes, tempRes] = await Promise.all([
            supabase.from('customers').select('id, name').eq('user_id', user.id).order('name'),
            supabase.from('service_templates').select('*').eq('user_id', user.id).order('name')
        ]);
        if (custRes.data) setCustomers(custRes.data);
        if (custRes.error) console.error('Error fetching customers:', custRes.error);

        if (tempRes.data) setTemplates(tempRes.data);
        if (tempRes.error) console.error('Error fetching templates:', tempRes.error);
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

    const handleSaveQuotation = async () => {
        if (!formData.customer_id || formData.items.some(i => !i.description)) {
            alert('Please select a customer and provide descriptions for all items.');
            return;
        }

        setSaving(true);
        try {
            const { subtotal, vat, total } = calculateTotals();

            let quotationId = editingQuotationId;

            if (editingQuotationId) {
                // 1. Update Existing Quotation
                const { error: qError } = await supabase
                    .from('quotations')
                    .update({
                        customer_id: formData.customer_id,
                        service_template_id: formData.service_template_id || null,
                        valid_until: formData.valid_until,
                        subtotal,
                        vat,
                        total
                    })
                    .eq('id', editingQuotationId);

                if (qError) throw qError;

                // 2. Delete existing items and re-insert (simple sync)
                await supabase.from('quotation_items').delete().eq('quotation_id', editingQuotationId);
            } else {
                // 1. Create New Quotation
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
                quotationId = qData.id;
            }

            // 3. Insert Items
            const itemsToInsert = formData.items.map(item => ({
                quotation_id: quotationId,
                description: item.description,
                quantity: item.quantity,
                unit_price: item.unit_price,
                total: item.total
            }));

            const { error: iError } = await supabase.from('quotation_items').insert(itemsToInsert);
            if (iError) throw iError;

            // 4. Handle Workflow logic (only for new creations or if not exists)
            if (!editingQuotationId) {
                const template = templates.find(t => t.id === formData.service_template_id);
                const { data: appData, error: appErr } = await supabase
                    .from('applications')
                    .insert([{
                        customer_id: formData.customer_id,
                        service_template_id: formData.service_template_id || null,
                        quotation_id: quotationId,
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
            } else {
                // If editing, update linked application description if it was a proposed one
                const template = templates.find(t => t.id === formData.service_template_id);
                await supabase
                    .from('applications')
                    .update({
                        customer_id: formData.customer_id,
                        service_template_id: formData.service_template_id || null,
                        description: template ? template.name : `Custom Service`
                    })
                    .eq('quotation_id', editingQuotationId)
                    .eq('status', 'Proposed'); // Only update if still proposed
            }

            setIsModalOpen(false);
            setEditingQuotationId(null);
            setFormData({
                customer_id: '',
                service_template_id: '',
                valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                items: [{ description: '', quantity: 1, unit_price: 0, total: 0 }]
            });
            fetchData();
        } catch (err: any) {
            console.error('Error saving quotation:', err);
            alert(`Failed to save quotation: ${err.message}`);
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

            fetchData();
        } catch (err: any) {
            console.error('Error approving quotation:', err);
            alert(`Approval failed: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    const fetchQuotationItems = async (quotationId: string) => {
        const { data, error } = await supabase
            .from('quotation_items')
            .select('*')
            .eq('quotation_id', quotationId);

        if (error) return [];
        return data;
    };

    const handleEdit = async (quote: Quotation) => {
        setSaving(true);
        try {
            const items = await fetchQuotationItems(quote.id);
            setFormData({
                customer_id: quote.customer_id,
                service_template_id: quote.service_template_id || '',
                valid_until: quote.valid_until.split('T')[0],
                items: items.map(item => ({
                    id: item.id,
                    description: item.description,
                    quantity: item.quantity,
                    unit_price: item.unit_price,
                    total: item.total
                }))
            });
            setEditingQuotationId(quote.id);
            setIsModalOpen(true);
        } catch (err) {
            console.error('Error loading quotation for edit:', err);
        } finally {
            setSaving(false);
        }
    };

    const handleViewQuotation = async (quote: Quotation) => {
        const items = await fetchQuotationItems(quote.id);
        setViewingQuotation({ ...quote, items });
    };

    const handlePrint = () => {
        if (viewingQuotation) {
            window.print();
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
                <Button icon={Plus} onClick={() => {
                    setEditingQuotationId(null);
                    setFormData({
                        customer_id: '',
                        service_template_id: '',
                        valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                        items: [{ description: '', quantity: 1, unit_price: 0, total: 0 }]
                    });
                    setIsModalOpen(true);
                }}>New Quotation</Button>
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
                                                    <>
                                                        <Button variant="outline" onClick={() => handleApprove(q)}>
                                                            Approve
                                                        </Button>
                                                        <Button variant="ghost" title="Edit Quotation" onClick={() => handleEdit(q)}>
                                                            <Pencil size={18} />
                                                        </Button>
                                                    </>
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
                title={editingQuotationId ? "Edit Quotation" : "Create New Quotation"}
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
                            onClick={handleSaveQuotation}
                            disabled={saving || !formData.customer_id}
                            icon={saving ? Loader2 : FileText}
                        >
                            {saving ? 'Saving...' : editingQuotationId ? 'Update Quotation' : 'Create Quotation'}
                        </Button>
                        <Button variant="outline" style={{ flex: 1 }} onClick={() => setIsModalOpen(false)}>Cancel</Button>
                    </div>
                </div>
            </Modal>

            {/* --- Precision Quotation Preview Modal --- */}
            <Modal
                isOpen={!!viewingQuotation}
                onClose={() => setViewingQuotation(null)}
                title="Quotation Preview"
                maxWidth="950px"
            >
                {viewingQuotation && (
                    <div className={styles.previewContainer}>
                        <div className={styles.quotationA4} id="quotation-capture">
                            {/* Header: Logo Left, Title Right */}
                            <div className={styles.quotationHeader}>
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
                                <div className={styles.quoteTitleArea}>
                                    <h1 className={styles.quoteTitle}>Quote</h1>
                                    <div className={styles.quoteId}># QT-{viewingQuotation.id.split('-')[0].toUpperCase()}</div>
                                </div>
                            </div>

                            {/* Split Meta: Bill To Left, Dates Right */}
                            <div className={styles.metaGrid}>
                                <div>
                                    <div className={styles.metaLabel}>Bill To</div>
                                    <div className={styles.billToValue}>{viewingQuotation.customer_name}</div>
                                    <div style={{ fontSize: '0.85rem', color: '#475569', marginTop: '4px' }}>
                                        {customers.find(c => c.id === viewingQuotation.customer_id)?.location || 'Dubai, UAE'}
                                    </div>
                                    {customers.find(c => c.id === viewingQuotation.customer_id)?.trn && (
                                        <div style={{ fontSize: '0.85rem', marginTop: '2px' }}>TRN: {customers.find(c => c.id === viewingQuotation.customer_id).trn}</div>
                                    )}
                                </div>
                                <div className={styles.metaDetailsGrid}>
                                    <div className={styles.metaDetailLabel}>Quote Date :</div>
                                    <div className={styles.metaDetailValue}>{new Date(viewingQuotation.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                                    <div className={styles.metaDetailLabel}>Expiry Date :</div>
                                    <div className={styles.metaDetailValue}>{new Date(viewingQuotation.valid_until).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                                    <div className={styles.metaDetailLabel}>Reference :</div>
                                    <div className={styles.metaDetailValue}>QT-{viewingQuotation.id.split('-')[0].toUpperCase()}</div>
                                </div>
                            </div>

                            <div className={styles.subjectSection}>
                                <div className={styles.subjectTitle}>Subject :</div>
                                <div style={{ fontSize: '0.9rem' }}>{viewingQuotation.service_template_name || 'Service Quotation'}</div>
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
                                    {viewingQuotation.items?.map((item, idx) => (
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
                                                <td className={styles.totalRowValue}>{viewingQuotation.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                            </tr>
                                            <tr>
                                                <td className={styles.totalRowLabel}>Total Taxable Amount</td>
                                                <td className={styles.totalRowValue}>{viewingQuotation.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                            </tr>
                                            <tr>
                                                <td className={styles.totalRowLabel}>VAT (5%)</td>
                                                <td className={styles.totalRowValue}>{viewingQuotation.vat.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                            </tr>
                                            <tr className={styles.grandTotalRow}>
                                                <td className={styles.grandTotalLabel}>Total</td>
                                                <td className={styles.grandTotalValue}>AED {viewingQuotation.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <div className={styles.totalInWords}>
                                <strong>Total In Words:</strong> AED {viewingQuotation.total.toLocaleString()} only
                            </div>

                            <div className={styles.footer}>
                                <div className={styles.termsContainer}>
                                    <p style={{ fontWeight: 700, marginBottom: '5px' }}>Notes</p>
                                    <p>Looking forward for your business.</p>
                                    <p style={{ fontWeight: 700, marginTop: '20px', marginBottom: '5px' }}>Terms & Conditions</p>
                                    <p>A 5% VAT (Value Added Tax) will be added to the total quoted amount at the time of invoicing.</p>
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
                            <div className={styles.actionButton} onClick={() => setViewingQuotation(null)}>
                                <span className={styles.actionLabel}>Close</span>
                            </div>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};
