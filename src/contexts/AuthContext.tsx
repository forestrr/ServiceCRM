import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { Loader2 } from 'lucide-react';

interface AuthContextType {
    user: User | null;
    session: Session | null;
    profile: { full_name: string | null; phone_number: string | null } | null;
    loading: boolean;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [profile, setProfile] = useState<{ full_name: string | null; phone_number: string | null } | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchProfile = async (userId: string) => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('full_name, phone_number')
                .eq('id', userId)
                .single();

            if (error) throw error;
            setProfile(data);
        } catch (err) {
            console.error('Error fetching profile:', err);
            setProfile(null);
        }
    };

    useEffect(() => {
        // Fallback timeout to ensure 'loading' is eventually set to false
        const timer = setTimeout(() => {
            if (loading) {
                console.warn('Auth session check timed out');
                setLoading(false);
            }
        }, 5000); // 5 second timeout

        // Check active sessions and sets the user
        supabase.auth.getSession()
            .then(({ data: { session } }) => {
                setSession(session);
                setUser(session?.user ?? null);
                if (session?.user) {
                    fetchProfile(session.user.id);
                }
            })
            .catch((err) => {
                console.error('Error getting auth session:', err);
                setUser(null);
                setSession(null);
            })
            .finally(() => {
                setLoading(false);
                clearTimeout(timer);
            });

        // Listen for changes on auth state (logged in, signed out, etc.)
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            setUser(session?.user ?? null);
            if (session?.user) {
                fetchProfile(session.user.id);
            } else {
                setProfile(null);
            }
            setLoading(false);
        });

        // Listen for profile changes
        const profileSubscription = supabase
            .channel('public:profiles')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'profiles',
                filter: user ? `id=eq.${user.id}` : undefined
            }, (payload: any) => {
                if (payload.new) {
                    setProfile({
                        full_name: payload.new.full_name,
                        phone_number: payload.new.phone_number
                    });
                }
            })
            .subscribe();

        return () => {
            subscription.unsubscribe();
            profileSubscription.unsubscribe();
        };
    }, [user?.id]);

    const signOut = async () => {
        await supabase.auth.signOut();
    };

    const value = {
        user,
        session,
        profile,
        loading,
        signOut
    };

    return (
        <AuthContext.Provider value={value}>
            {loading ? (
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100vh',
                    width: '100vw',
                    backgroundColor: 'var(--bg-main)',
                    color: 'var(--primary)',
                    gap: '16px'
                }}>
                    <Loader2 className="animate-spin" size={40} />
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                        Initializing Trust Flow...
                    </p>
                </div>
            ) : children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
