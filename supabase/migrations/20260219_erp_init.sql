-- ERP Transformation: Core Database Structure

-- 1. Staff Management
CREATE TABLE IF NOT EXISTS staff (
    id UUID PRIMARY KEY DEFAULT auth.uid(),
    full_name TEXT NOT NULL,
    role TEXT NOT NULL,
    salary_type TEXT CHECK (salary_type IN ('fixed', 'commission', 'hybrid')),
    commission_rate DECIMAL(5,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enhanced Step Logging
CREATE TABLE IF NOT EXISTS step_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
    step_id UUID NOT NULL, -- References the workflow step
    completed_by UUID REFERENCES staff(id),
    provider_id UUID REFERENCES service_providers(id),
    provider_cost DECIMAL(12,2) DEFAULT 0,
    internal_cost DECIMAL(12,2) DEFAULT 0,
    completed_at TIMESTAMPTZ DEFAULT NOW(),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Accounts (Bank / Card / Cash)
CREATE TABLE IF NOT EXISTS accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type TEXT CHECK (type IN ('bank', 'card', 'cash')),
    initial_balance DECIMAL(12,2) DEFAULT 0,
    current_balance DECIMAL(12,2) DEFAULT 0,
    currency TEXT DEFAULT 'AED',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Transactions (Ledger System)
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID REFERENCES accounts(id) ON DELETE RESTRICT,
    application_id UUID REFERENCES applications(id) ON DELETE SET NULL,
    step_log_id UUID REFERENCES step_logs(id) ON DELETE SET NULL,
    type TEXT CHECK (type IN ('debit', 'credit')),
    category TEXT CHECK (category IN ('provider_payment', 'client_payment', 'expense', 'refund')),
    amount DECIMAL(12,2) NOT NULL,
    description TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Provider Ledger (Payables)
CREATE TABLE IF NOT EXISTS provider_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID REFERENCES service_providers(id) ON DELETE CASCADE,
    application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
    step_log_id UUID REFERENCES step_logs(id) ON DELETE CASCADE,
    amount DECIMAL(12,2) NOT NULL,
    status TEXT CHECK (status IN ('pending', 'paid')) DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Quotations
CREATE TABLE IF NOT EXISTS quotations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    service_template_id UUID REFERENCES service_templates(id) ON DELETE SET NULL,
    status TEXT CHECK (status IN ('draft', 'sent', 'approved', 'rejected')) DEFAULT 'draft',
    subtotal DECIMAL(12,2) DEFAULT 0,
    vat DECIMAL(12,2) DEFAULT 0,
    total DECIMAL(12,2) DEFAULT 0,
    valid_until DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS quotation_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quotation_id UUID REFERENCES quotations(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    quantity INTEGER DEFAULT 1,
    unit_price DECIMAL(12,2) DEFAULT 0,
    total DECIMAL(12,2) DEFAULT 0
);

-- 7. Invoices
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number TEXT UNIQUE NOT NULL,
    application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    subtotal DECIMAL(12,2) DEFAULT 0,
    vat DECIMAL(12,2) DEFAULT 0,
    total DECIMAL(12,2) DEFAULT 0,
    status TEXT CHECK (status IN ('unpaid', 'partial', 'paid')) DEFAULT 'unpaid',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    quantity INTEGER DEFAULT 1,
    unit_price DECIMAL(12,2) DEFAULT 0,
    total DECIMAL(12,2) DEFAULT 0
);

-- 8. Functions & Views

-- Safe Balance Update Function
CREATE OR REPLACE FUNCTION process_transaction()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.type = 'credit' THEN
        UPDATE accounts SET current_balance = current_balance + NEW.amount WHERE id = NEW.account_id;
    ELSIF NEW.type = 'debit' THEN
        UPDATE accounts SET current_balance = current_balance - NEW.amount WHERE id = NEW.account_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER transaction_balance_update
AFTER INSERT ON transactions
FOR EACH ROW EXECUTE FUNCTION process_transaction();

-- Profit Calculation View
CREATE OR REPLACE VIEW application_profit_view AS
SELECT 
    a.id AS application_id,
    COALESCE(st.name, 'Custom Service') AS application_name,
    c.name AS customer_name,
    COALESCE(i.total, 0) AS revenue,
    COALESCE(SUM(sl.provider_cost), 0) AS total_provider_cost,
    COALESCE(SUM(sl.internal_cost), 0) AS total_internal_cost,
    COALESCE(i.total, 0) - (COALESCE(SUM(sl.provider_cost), 0) + COALESCE(SUM(sl.internal_cost), 0)) AS net_profit
FROM applications a
LEFT JOIN service_templates st ON a.service_template_id = st.id
LEFT JOIN customers c ON a.customer_id = c.id
LEFT JOIN invoices i ON a.id = i.application_id
LEFT JOIN step_logs sl ON a.id = sl.application_id
GROUP BY a.id, st.name, c.name, i.total;

-- 9. Security (RLS)

ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE step_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotation_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;

-- Example Policies (Admin can do everything)
-- Note: In a real scenario, these would be more granular based on roles.
CREATE POLICY "Admin full access" ON staff FOR ALL TO authenticated USING (true);
CREATE POLICY "Admin full access" ON step_logs FOR ALL TO authenticated USING (true);
CREATE POLICY "Admin full access" ON accounts FOR ALL TO authenticated USING (true);
CREATE POLICY "Admin full access" ON transactions FOR ALL TO authenticated USING (true);
CREATE POLICY "Admin full access" ON provider_ledger FOR ALL TO authenticated USING (true);
CREATE POLICY "Admin full access" ON quotations FOR ALL TO authenticated USING (true);
CREATE POLICY "Admin full access" ON quotation_items FOR ALL TO authenticated USING (true);
CREATE POLICY "Admin full access" ON invoices FOR ALL TO authenticated USING (true);
CREATE POLICY "Admin full access" ON invoice_items FOR ALL TO authenticated USING (true);

-- Customer Portal Policy (Read-only for their own invoices)
CREATE POLICY "Customers can view own invoices" ON invoices
    FOR SELECT TO public
    USING (customer_id IN (SELECT id FROM customers WHERE id = invoices.customer_id));

-- Add quotation_id to applications to link them back
ALTER TABLE applications ADD COLUMN IF NOT EXISTS quotation_id UUID REFERENCES quotations(id) ON DELETE SET NULL;

-- Add due_date and reference to invoices
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS due_date DATE;
-- Add base_charge to service_templates for service pricing
ALTER TABLE service_templates ADD COLUMN IF NOT EXISTS base_charge DECIMAL(12,2) DEFAULT 0;

-- Update Applications status constraints
ALTER TABLE applications DROP CONSTRAINT IF EXISTS applications_status_check;
ALTER TABLE applications ADD CONSTRAINT applications_status_check CHECK (status IN ('Draft', 'Proposed', 'Active', 'Completed', 'Cancelled'));

-- Update Invoices status constraints
ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_status_check;
ALTER TABLE invoices ADD CONSTRAINT invoices_status_check CHECK (status IN ('draft', 'unpaid', 'partial', 'paid', 'cancelled'));
