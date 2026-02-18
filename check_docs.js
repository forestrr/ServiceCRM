const supabaseUrl = 'https://tonckpxusroilczvggxn.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvbmNrcHh1c3JvaWxjenZnZ3huIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzMjY2NDksImV4cCI6MjA4NjkwMjY0OX0.Au-nlDuxjuUThfQfqauVQv-XdOlM4a5yrZo9y5ydxFg';

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
