import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
    try {
        console.log('Checking "documents" table...');
        const { data: docs, error: docError } = await supabase.from('documents').select('*').limit(1);
        if (docError) {
            console.error('Documents table error:', docError.message);
        } else {
            console.log('Documents table exists.');
        }

        console.log('Checking "documents" bucket...');
        const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
        if (bucketError) {
            console.error('Storage bucket error:', bucketError.message);
        } else {
            console.log('Buckets:', buckets.map(b => b.name));
            const hasDocBucket = buckets.some(b => b.name === 'documents');
            console.log('Documents bucket exists:', hasDocBucket);
        }
    } catch (e) {
        console.error('Check failed:', e);
    }
}

check();
