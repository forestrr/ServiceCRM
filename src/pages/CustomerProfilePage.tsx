import { useState, useEffect } from 'react';
import {
    ArrowLeft,
    FileText,
    Download,
    Plus,
    ExternalLink,
    Loader2,
    Mail,
    Phone,
    MessageCircle,
    Building2,
    User,
    Upload,
    Trash2
} from 'lucide-react';
import { Button, Card, Modal, Input } from '../components/UI';
import { Badge } from '../components/Badge';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import styles from './CustomerProfilePage.module.css';

interface Document {
    id: string;
    name: string;
    version: string;
    created_at: string;
    expiry_date: string;
    file_path: string;
}

interface Application {
    id: string;
    service_template: { name: string };
    status: string;
    progress: number;
}

interface Customer {
    id: string;
    name: string;
    type: 'Individual' | 'Company';
    email: string;
    phone: string;
    whatsapp?: string;
    details?: string;
    created_at: string;
}

export const CustomerProfilePage = () => {
    const navigate = useNavigate();
    const { id } = useParams();

    const [customer, setCustomer] = useState<Customer | null>(null);
    const [documents, setDocuments] = useState<Document[]>([]);
    const [applications, setApplications] = useState<Application[]>([]);
    const [loading, setLoading] = useState(true);
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [newDocData, setNewDocData] = useState({
        name: '',
        expiry_date: '',
        file: null as File | null
    });
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (id) fetchCustomerData();
    }, [id]);

    const fetchCustomerData = async () => {
        setLoading(true);
        try {
            const { data: cust, error: custErr } = await supabase
                .from('customers')
                .select('*')
                .eq('id', id)
                .single();

            if (custErr) throw custErr;
            setCustomer(cust);

            const { data: apps, error: appsErr } = await supabase
                .from('applications')
                .select('*, service_template:service_templates(name)')
                .eq('customer_id', id);

            if (appsErr) throw appsErr;
            setApplications(apps || []);

            const { data: docs, error: docsErr } = await supabase
                .from('documents')
                .select('*')
                .eq('customer_id', id)
                .order('created_at', { ascending: false });

            if (docsErr) throw docsErr;
            setDocuments(docs || []);

        } catch (err) {
            console.error('Error fetching profile:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleFileUpload = async () => {
        if (!newDocData.file || !newDocData.name || !id) {
            alert('Please provide a document name and select a file.');
            return;
        }

        setUploading(true);
        try {
            const fileExt = newDocData.file.name.split('.').pop();
            const fileName = `${Math.random()}.${fileExt}`;
            const filePath = `${id}/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('documents')
                .upload(filePath, newDocData.file);

            if (uploadError) throw uploadError;

            const { error: dbError } = await supabase
                .from('documents')
                .insert([{
                    customer_id: id,
                    name: newDocData.name,
                    file_path: filePath,
                    expiry_date: newDocData.expiry_date || null,
                    version: 'v1.0'
                }]);

            if (dbError) throw dbError;

            setIsUploadModalOpen(false);
            setNewDocData({ name: '', expiry_date: '', file: null });
            fetchCustomerData();
        } catch (err) {
            console.error('Upload error:', err);
            alert('Failed to upload document. Ensure you have a "documents" bucket in Supabase storage!');
        } finally {
            setUploading(false);
        }
    };

    const deleteDocument = async (docId: string, filePath: string) => {
        if (!confirm('Are you sure you want to delete this document?')) return;
        try {
            await supabase.storage.from('documents').remove([filePath]);
            const { error } = await supabase.from('documents').delete().eq('id', docId);
            if (error) throw error;
            fetchCustomerData();
        } catch (err) {
            console.error(err);
        }
    };

    const downloadFile = async (filePath: string, fileName: string) => {
        try {
            const { data, error } = await supabase.storage
                .from('documents')
                .download(filePath);

            if (error) throw error;

            const url = URL.createObjectURL(data);
            const link = document.createElement('a');
            link.href = url;
            link.download = fileName;
            link.click();
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Download error:', err);
            alert('Could not download file.');
        }
    };

    const getDocStatus = (expiryDate: string): { label: string; variant: 'success' | 'warning' | 'danger' } => {
        if (!expiryDate) return { label: 'Valid', variant: 'success' };
        const expiry = new Date(expiryDate);
        const now = new Date();
        const diff = expiry.getTime() - now.getTime();
        const days = diff / (1000 * 60 * 60 * 24);

        if (days < 0) return { label: 'Expired', variant: 'danger' };
        if (days < 30) return { label: 'Expiring Soon', variant: 'warning' };
        return { label: 'Valid', variant: 'success' };
    };

    const copyPortalLink = () => {
        const url = `${window.location.origin}/portal/${id}`;
        navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (loading) {
        return (
            <div className={styles.loadingState}>
                <Loader2 className="animate-spin" size={40} color="var(--primary)" />
                <p className={styles.loadingText}>Loading profile...</p>
            </div>
        );
    }

    if (!customer) {
        return (
            <div className={styles.notFound}>
                <h2 className={styles.notFoundTitle}>Customer not found</h2>
                <Button onClick={() => navigate('/customers')} style={{ marginTop: '16px' }}>Back to List</Button>
            </div>
        );
    }

    return (
        <div className={styles.page}>
            <div className={styles.headerRow}>
                <Button variant="ghost" onClick={() => navigate('/customers')} style={{ padding: '8px' }}>
                    <ArrowLeft size={24} />
                </Button>
                <div className={styles.nameRow}>
                    <h1 className={styles.name}>{customer.name}</h1>
                    <span className={`${styles.typeBadge} ${customer.type === 'Company' ? styles.typeBadgeCompany : styles.typeBadgeIndividual}`}>
                        {customer.type === 'Company' ? <Building2 size={16} /> : <User size={16} />}
                        {customer.type}
                    </span>
                </div>
                <p className={styles.since}>Customer since {new Date(customer.created_at).toLocaleDateString()}</p>
            </div>

            <div className={styles.grid}>
                <div className={styles.leftColumn}>
                    <Card>
                        <h3 className={styles.sectionTitle}>Profile Information</h3>
                        <div className={styles.profileFields}>
                            <div>
                                <p className={styles.fieldLabel}>Email Address</p>
                                <div className={styles.fieldValue}>
                                    <Mail size={14} color="var(--text-muted)" />
                                    <p className={styles.fieldText}>{customer.email}</p>
                                </div>
                            </div>
                            <div>
                                <p className={styles.fieldLabel}>Phone Number</p>
                                <div className={styles.fieldValue}>
                                    <Phone size={14} color="var(--text-muted)" />
                                    <p className={styles.fieldText}>{customer.phone || 'N/A'}</p>
                                </div>
                            </div>
                            {customer.whatsapp && (
                                <div>
                                    <p className={styles.fieldLabel}>WhatsApp</p>
                                    <div className={styles.whatsappValue}>
                                        <MessageCircle size={14} />
                                        <p className={styles.whatsappText}>{customer.whatsapp}</p>
                                    </div>
                                </div>
                            )}
                            <Button variant="outline" style={{ marginTop: '8px' }}>Edit Profile</Button>

                            <div className={styles.portalBox}>
                                <p className={styles.fieldLabel}>Customer Portal Link</p>
                                <div className={styles.portalInputRow}>
                                    <div className={styles.portalUrl}>
                                        {window.location.origin}/portal/...
                                    </div>
                                    <Button
                                        variant={copied ? 'primary' : 'outline'}
                                        onClick={copyPortalLink}
                                        style={{
                                            padding: '8px 16px',
                                            fontSize: '0.8rem',
                                            backgroundColor: copied ? '#10b981' : undefined,
                                            borderColor: copied ? '#10b981' : undefined,
                                            color: copied ? 'white' : undefined
                                        }}
                                    >
                                        {copied ? 'Copied!' : 'Copy Link'}
                                    </Button>
                                </div>
                                <p className={styles.portalHint}>Share this link with the customer for real-time tracking.</p>
                            </div>
                        </div>
                    </Card>

                    <Card>
                        <h3 className={styles.sectionTitle}>Active Workflows</h3>
                        <div className={styles.workflowsList}>
                            {applications.length === 0 ? (
                                <p className={styles.workflowEmpty}>No active applications.</p>
                            ) : applications.map(app => (
                                <div key={app.id} className={styles.workflowItem}>
                                    <div style={{ flex: 1 }}>
                                        <p className={styles.workflowName}>{app.service_template?.name}</p>
                                        <div className={styles.progressBar}>
                                            <div className={styles.progressTrack}>
                                                <div className={styles.progressFill} style={{ width: `${app.progress}%` }} />
                                            </div>
                                            <span className={styles.progressLabel}>{app.progress}%</span>
                                        </div>
                                    </div>
                                    <Button variant="ghost" style={{ padding: '4px', marginLeft: '12px' }} onClick={() => navigate('/applications')}>
                                        <ExternalLink size={18} />
                                    </Button>
                                </div>
                            ))}
                            <Button icon={Plus} style={{ width: '100%', fontSize: '0.9rem' }} onClick={() => navigate('/applications')}>New Application</Button>
                        </div>
                    </Card>
                </div>

                <div className={styles.rightColumn}>
                    {customer.details && (
                        <Card>
                            <h3 className={styles.sectionTitle}>Customer Notes</h3>
                            <div className={styles.notesBox}>
                                <p className={styles.notesText}>{customer.details}</p>
                            </div>
                        </Card>
                    )}

                    <Card>
                        <div className={styles.docsHeader}>
                            <div className={styles.docsTitle}>
                                <FileText size={20} color="var(--primary)" />
                                <h3>Document Repository</h3>
                            </div>
                            <Button icon={Plus} variant="outline" onClick={() => setIsUploadModalOpen(true)} style={{ padding: '6px 14px', fontSize: '0.875rem' }}>Upload New</Button>
                        </div>

                        <div className={styles.docsList}>
                            {documents.length === 0 ? (
                                <div className={styles.docsEmpty}>
                                    No documents recorded yet. Attach passports, IDs, or visa copies.
                                </div>
                            ) : documents.map(doc => {
                                const status = getDocStatus(doc.expiry_date);
                                return (
                                    <div key={doc.id} className={`glass-card ${styles.docCard}`}>
                                        <div className={styles.docInfo}>
                                            <div className={styles.docIcon}>
                                                <FileText size={24} />
                                            </div>
                                            <div>
                                                <div className={styles.docNameRow}>
                                                    <p className={styles.docName}>{doc.name}</p>
                                                    <span className={styles.docVersion}>{doc.version}</span>
                                                </div>
                                                <p className={styles.docExpiry}>
                                                    {doc.expiry_date ? `Expires on ${new Date(doc.expiry_date).toLocaleDateString()}` : 'No expiry set'}
                                                </p>
                                            </div>
                                        </div>

                                        <div className={styles.docActions}>
                                            <Badge variant={status.variant} pill>{status.label}</Badge>
                                            <div className={styles.docBtns}>
                                                <Button variant="ghost" style={{ padding: '8px' }} title="Download" onClick={() => downloadFile(doc.file_path, doc.name)}><Download size={18} /></Button>
                                                <Button variant="ghost" style={{ padding: '8px', color: '#ef4444' }} onClick={() => deleteDocument(doc.id, doc.file_path)}><Trash2 size={18} /></Button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </Card>
                </div>
            </div>

            <Modal
                isOpen={isUploadModalOpen}
                onClose={() => setIsUploadModalOpen(false)}
                title="Upload Document"
            >
                <div className={styles.uploadForm}>
                    <Input
                        label="Document Name"
                        placeholder="e.g. Passport Copy, Trading License"
                        value={newDocData.name}
                        onChange={(e) => setNewDocData({ ...newDocData, name: e.target.value })}
                    />

                    <Input
                        label="Expiry Date (Optional)"
                        type="date"
                        value={newDocData.expiry_date}
                        onChange={(e) => setNewDocData({ ...newDocData, expiry_date: e.target.value })}
                    />

                    <div>
                        <label className={styles.fileInputLabel}>Select File</label>
                        <input
                            type="file"
                            onChange={(e) => setNewDocData({ ...newDocData, file: e.target.files?.[0] || null })}
                            className={styles.fileInput}
                        />
                    </div>

                    <div className={styles.uploadActions}>
                        <Button
                            style={{ flex: 1 }}
                            onClick={handleFileUpload}
                            disabled={uploading || !newDocData.file || !newDocData.name}
                            icon={uploading ? Loader2 : Upload}
                            className={uploading ? 'animate-spin' : ''}
                        >
                            {uploading ? 'Uploading...' : 'Upload Document'}
                        </Button>
                        <Button variant="outline" style={{ flex: 1 }} onClick={() => setIsUploadModalOpen(false)}>Cancel</Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};
