import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://tonckpxusroilczvggxn.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvbmNrcHh1c3JvaWxjenZnZ3huIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzMjY2NDksImV4cCI6MjA4NjkwMjY0OX0.Au-nlDuxjuUThfQfqauVQv-XdOlM4a5yrZo9y5ydxFg';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
    try {
        const { data: apps } = await supabase.from('applications').select('id, status');
        const { data: customers } = await supabase.from('customers').select('id, name');

        console.log('--- DATA DETAILS ---');
        console.log('Application Statuses:', apps?.map(a => `${a.id.slice(0, 8)}...: ${a.status}`));
        console.log('Customers:', customers?.map(c => c.name));
        console.log('--------------------');
    } catch (e) {
        console.error('Diagnostic failed:', e);
    }
}

check();
