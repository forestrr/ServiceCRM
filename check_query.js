import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://tonckpxusroilczvggxn.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvbmNrcHh1c3JvaWxjenZnZ3huIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzMjY2NDksImV4cCI6MjA4NjkwMjY0OX0.Au-nlDuxjuUThfQfqauVQv-XdOlM4a5yrZo9y5ydxFg';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
    try {
        console.log('Testing query with service_template join...');
        const { data, error } = await supabase.from('applications')
            .select('id, service_template:service_templates(name), customer:customers(name)')
            .eq('status', 'Active')
            .limit(5);

        if (error) {
            console.error('Query Error:', error);
        } else {
            console.log('Query Data:', JSON.stringify(data, null, 2));
        }
    } catch (e) {
        console.error('Diagnostic failed:', e);
    }
}

check();
