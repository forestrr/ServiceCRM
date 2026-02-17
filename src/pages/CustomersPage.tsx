import { useState, useEffect } from 'react';
import { Search, UserPlus, Mail, Phone, Loader2, MessageCircle, ExternalLink } from 'lucide-react';
import { Button, Card, Modal, Input } from '../components/UI';
import { Avatar } from '../components/Avatar';
import { Badge } from '../components/Badge';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import styles from './CustomersPage.module.css';

interface Customer {
    id: string;
    name: string;
    type: 'Individual' | 'Company';
    email: string;
    phone: string;
    whatsapp?: string;
    details?: string;
    activeApplications: number;
    lastUpdate: string;
}

export const CustomersPage = () => {
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        type: 'Individual' as 'Individual' | 'Company',
        email: '',
        phone: '',
        whatsapp: '',
        details: ''
    });

    useEffect(() => {
        fetchCustomers();
    }, []);

    const fetchCustomers = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('customers')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            const mappedData: Customer[] = (data || []).map(c => ({
                id: c.id,
                name: c.name,
                type: c.type || 'Individual',
                email: c.email,
                phone: c.phone || 'N/A',
                whatsapp: c.whatsapp,
                details: c.details,
                activeApplications: 0,
                lastUpdate: new Date(c.created_at).toLocaleDateString()
            }));

            setCustomers(mappedData);
        } catch (err) {
            console.error('Error fetching customers:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleAddCustomer = async () => {
        if (!formData.name || !formData.email) {
            alert('Name and Email are required.');
            return;
        }

        setSaving(true);
        try {
            const { error } = await supabase
                .from('customers')
                .insert([{
                    name: formData.name,
                    type: formData.type,
                    email: formData.email,
                    phone: formData.phone,
                    whatsapp: formData.whatsapp,
                    details: formData.details
                }]);

            if (error) throw error;

            setIsModalOpen(false);
            setFormData({ name: '', type: 'Individual', email: '', phone: '', whatsapp: '', details: '' });
            fetchCustomers();
        } catch (err) {
            alert('Error adding customer. Ensure you ran the migration SQL!');
            console.error(err);
        } finally {
            setSaving(false);
        }
    };

    const filteredCustomers = customers.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className={styles.page}>
            <div className={styles.header}>
                <div>
                    <h1 className={styles.title}>Customers</h1>
                    <p className={styles.subtitle}>Manage your customer profiles and document records.</p>
                </div>
                <Button icon={UserPlus} onClick={() => setIsModalOpen(true)}>Add Customer</Button>
            </div>

            <Card style={{ padding: '0' }}>
                <div className={styles.searchBar}>
                    <div className={styles.searchWrapper}>
                        <Search size={18} className={styles.searchIcon} />
                        <input
                            placeholder="Search customers by name or email..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className={styles.searchInput}
                        />
                    </div>
                </div>

                {loading ? (
                    <div className={styles.loadingState}>
                        <Loader2 className="animate-spin" size={40} color="var(--primary)" style={{ margin: '0 auto' }} />
                        <p className={styles.loadingText}>Loading customers...</p>
                    </div>
                ) : (
                    <div className={styles.tableWrapper}>
                        {filteredCustomers.length === 0 ? (
                            <div className={styles.emptyState}>
                                {searchTerm ? 'No customers found matching your search.' : 'No customers yet. Click "Add Customer" to start.'}
                            </div>
                        ) : (
                            <table className={styles.table}>
                                <thead>
                                    <tr className={styles.tableHead}>
                                        <th className={styles.th}>Customer</th>
                                        <th className={styles.th}>Type</th>
                                        <th className={styles.th}>Contact Info</th>
                                        <th className={styles.th}>Last Update</th>
                                        <th className={styles.thRight}></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredCustomers.map(customer => (
                                        <tr key={customer.id} className={styles.tr}>
                                            <td className={styles.td}>
                                                <div className={styles.customerCell}>
                                                    <Avatar
                                                        name={customer.name}
                                                        color={customer.type === 'Company' ? 'blue' : 'primary'}
                                                    />
                                                    <div>
                                                        <div className={styles.customerName}>{customer.name}</div>
                                                        <div className={styles.customerId}>ID: #{customer.id.split('-')[0]}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className={styles.td}>
                                                <Badge variant={customer.type === 'Company' ? 'info' : 'purple'}>
                                                    {customer.type}
                                                </Badge>
                                            </td>
                                            <td className={styles.td}>
                                                <div className={styles.contactInfo}>
                                                    <div className={styles.contactRow}>
                                                        <Mail size={14} color="var(--text-muted)" />
                                                        {customer.email}
                                                    </div>
                                                    <div className={styles.contactPhoneRow}>
                                                        <div className={styles.phoneItem}>
                                                            <Phone size={14} color="var(--text-muted)" />
                                                            {customer.phone}
                                                        </div>
                                                        {customer.whatsapp && (
                                                            <div className={styles.whatsapp}>
                                                                <MessageCircle size={14} />
                                                                <span>WA</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className={`${styles.td} ${styles.lastUpdate}`}>
                                                {customer.lastUpdate}
                                            </td>
                                            <td className={styles.tdRight}>
                                                <div className={styles.actionsCell}>
                                                    <Button variant="outline" style={{ padding: '8px' }} onClick={() => navigate(`/customers/${customer.id}`)}>
                                                        <ExternalLink size={18} />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                )}
            </Card>

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title="Add New Customer"
            >
                <div className={styles.form}>
                    <div className={styles.typeToggle}>
                        <button
                            onClick={() => setFormData({ ...formData, type: 'Individual' })}
                            className={`${styles.typeBtn} ${formData.type === 'Individual' ? styles.typeBtnActive : ''}`}
                        >
                            Individual
                        </button>
                        <button
                            onClick={() => setFormData({ ...formData, type: 'Company' })}
                            className={`${styles.typeBtn} ${formData.type === 'Company' ? styles.typeBtnActive : ''}`}
                        >
                            Company
                        </button>
                    </div>

                    <Input
                        label={formData.type === 'Individual' ? 'Full Name' : 'Company Name'}
                        placeholder={formData.type === 'Individual' ? 'e.g. John Doe' : 'e.g. Acme Corp'}
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />

                    <Input
                        label="Email Address"
                        type="email"
                        placeholder="e.g. contact@example.com"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />

                    <div className={styles.twoCol}>
                        <Input
                            label="Phone Number"
                            placeholder="+1..."
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        />
                        <Input
                            label="WhatsApp Number"
                            placeholder="+1..."
                            value={formData.whatsapp}
                            onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className={styles.textareaLabel}>Customer Details</label>
                        <textarea
                            placeholder="Enter any additional notes or details about the customer..."
                            value={formData.details}
                            onChange={(e) => setFormData({ ...formData, details: e.target.value })}
                            className={styles.textarea}
                        />
                    </div>

                    <div className={styles.formActions}>
                        <Button
                            style={{ flex: 1 }}
                            onClick={handleAddCustomer}
                            disabled={saving || !formData.name || !formData.email}
                            icon={saving ? Loader2 : UserPlus}
                            className={saving ? 'animate-spin' : ''}
                        >
                            {saving ? 'Creating...' : 'Create Customer'}
                        </Button>
                        <Button variant="outline" style={{ flex: 1 }} onClick={() => setIsModalOpen(false)}>Cancel</Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};
