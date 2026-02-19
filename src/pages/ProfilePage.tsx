import { useState, useEffect } from 'react';
import { User, Phone, Mail, Loader2, Save, CheckCircle2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/UI';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './ProfilePage.module.css';

export const ProfilePage = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [fullName, setFullName] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [companyName, setCompanyName] = useState('');
    const [companyAddress, setCompanyAddress] = useState('');
    const [companyTrn, setCompanyTrn] = useState('');
    const [bankDetails, setBankDetails] = useState('');

    useEffect(() => {
        const fetchProfile = async () => {
            if (!user) return;

            try {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', user.id)
                    .single();

                if (error) throw error;

                if (data) {
                    setFullName(data.full_name || '');
                    setPhoneNumber(data.phone_number || '');
                    setCompanyName(data.company_name || '');
                    setCompanyAddress(data.company_address || '');
                    setCompanyTrn(data.company_trn || '');
                    setBankDetails(data.bank_details || '');
                }
            } catch (err: any) {
                console.error('Error fetching profile:', err);
                setError('Failed to load profile data');
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, [user]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        setSaving(true);
        setError(null);
        setSuccess(false);

        try {
            const { error } = await supabase
                .from('profiles')
                .upsert({
                    id: user.id,
                    full_name: fullName,
                    phone_number: phoneNumber,
                    company_name: companyName,
                    company_address: companyAddress,
                    company_trn: companyTrn,
                    bank_details: bankDetails,
                    updated_at: new Date().toISOString()
                });

            if (error) throw error;

            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        } catch (err: any) {
            console.error('Error updating profile:', err);
            setError(err.message || 'Failed to update profile');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="animate-spin text-primary" size={32} />
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1 className={styles.title}>My Profile</h1>
                <p className={styles.subtitle}>Manage your personal information and contact details.</p>
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={styles.profileCard}
            >
                <div className={styles.avatarSection}>
                    <div className={styles.largeAvatar}>
                        {fullName ? fullName[0].toUpperCase() : (user?.email?.[0].toUpperCase() || 'U')}
                    </div>
                    <div className={styles.avatarInfo}>
                        <h3>{fullName || 'New User'}</h3>
                        <p>{user?.email}</p>
                    </div>
                </div>

                <form onSubmit={handleSave} className={styles.form}>
                    <div className={styles.inputGroup}>
                        <label className={styles.label}>Full Name</label>
                        <div className={styles.inputWrapper}>
                            <User className={styles.inputIcon} size={18} />
                            <input
                                type="text"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                className={styles.input}
                                placeholder="John Doe"
                                required
                            />
                        </div>
                    </div>

                    <div className={styles.inputGroup}>
                        <label className={styles.label}>Phone Number</label>
                        <div className={styles.inputWrapper}>
                            <Phone className={styles.inputIcon} size={18} />
                            <input
                                type="tel"
                                value={phoneNumber}
                                onChange={(e) => setPhoneNumber(e.target.value)}
                                className={styles.input}
                                placeholder="+1 (555) 000-0000"
                            />
                        </div>
                    </div>

                    <div className={`${styles.inputGroup} ${styles.fullWidth}`}>
                        <label className={styles.label}>Email Address (Read-only)</label>
                        <div className={styles.inputWrapper}>
                            <Mail className={styles.inputIcon} size={18} />
                            <input
                                type="email"
                                value={user?.email || ''}
                                className={styles.input}
                                disabled
                            />
                        </div>
                    </div>

                    <div className={styles.divider} />
                    <h2 className={styles.sectionTitle}>Business / Agency Info</h2>
                    <p className={styles.sectionSub}>These details will appear on your professional quotations and invoices.</p>

                    <div className={styles.inputGroup}>
                        <label className={styles.label}>Company/Agency Name</label>
                        <div className={styles.inputWrapper}>
                            <User className={styles.inputIcon} size={18} />
                            <input
                                type="text"
                                value={companyName}
                                onChange={(e) => setCompanyName(e.target.value)}
                                className={styles.input}
                                placeholder="e.g. Service CRM Solutions"
                            />
                        </div>
                    </div>

                    <div className={styles.inputGroup}>
                        <label className={styles.label}>Tax Registration Number (TRN)</label>
                        <div className={styles.inputWrapper}>
                            <CheckCircle2 className={styles.inputIcon} size={18} />
                            <input
                                type="text"
                                value={companyTrn}
                                onChange={(e) => setCompanyTrn(e.target.value)}
                                className={styles.input}
                                placeholder="e.g. 100xxxxxxx00003"
                            />
                        </div>
                    </div>

                    <div className={`${styles.inputGroup} ${styles.fullWidth}`}>
                        <label className={styles.label}>Physical Address</label>
                        <div className={styles.inputWrapper}>
                            <input
                                type="text"
                                value={companyAddress}
                                onChange={(e) => setCompanyAddress(e.target.value)}
                                className={styles.input}
                                placeholder="e.g. Prime Tower, Business Bay, Dubai, UAE"
                            />
                        </div>
                    </div>

                    <div className={`${styles.inputGroup} ${styles.fullWidth}`}>
                        <label className={styles.label}>Bank Details (Account No, IBAN, Bank Name)</label>
                        <div className={styles.inputWrapper}>
                            <textarea
                                value={bankDetails}
                                onChange={(e) => setBankDetails(e.target.value)}
                                className={styles.textarea}
                                placeholder="Bank: Emirates NBD&#10;Account: 123456789&#10;IBAN: AE00 0000 0000 0000 0000 000"
                                rows={3}
                            />
                        </div>
                    </div>

                    <div className={`${styles.actions} ${styles.fullWidth}`}>
                        <Button
                            type="submit"
                            className={styles.saveBtn}
                            disabled={saving}
                        >
                            {saving ? (
                                <Loader2 className="animate-spin" size={20} />
                            ) : success ? (
                                <>
                                    <CheckCircle2 size={20} />
                                    Changes Saved
                                </>
                            ) : (
                                <>
                                    <Save size={20} />
                                    Save Profile
                                </>
                            )}
                        </Button>
                    </div>
                </form>

                <AnimatePresence>
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mt-4 p-4 bg-red-50 text-red-600 rounded-xl text-sm font-medium border border-red-100"
                        >
                            {error}
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </div>
    );
};
