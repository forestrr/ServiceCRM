-- SQL Audit: Check for rows missing a user_id
-- Run this in the Supabase SQL Editor to see what needs to be "claimed"

SELECT 'customers' as table_name, count(*) as missing_user_id_count FROM customers WHERE user_id IS NULL
UNION ALL
SELECT 'applications', count(*) FROM applications WHERE user_id IS NULL
UNION ALL
SELECT 'service_providers', count(*) FROM service_providers WHERE user_id IS NULL
UNION ALL
SELECT 'service_templates', count(*) FROM service_templates WHERE user_id IS NULL;
