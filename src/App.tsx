import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { SettingsPage } from './pages/SettingsPage';
import { CustomersPage } from './pages/CustomersPage';
import { ApplicationsPage } from './pages/ApplicationsPage';
import { CustomerProfilePage } from './pages/CustomerProfilePage';
import { Dashboard } from './pages/Dashboard';
import { ProvidersPage } from './pages/ProvidersPage';
import { CustomerPortal } from './pages/CustomerPortal';

function App() {
  return (
    <Router>
      <Routes>
        {/* Public Routes (No Sidebar) */}
        <Route path="/portal/:customerId" element={<CustomerPortal />} />

        {/* Private CRM Routes (With Sidebar) */}
        <Route path="*" element={
          <Layout>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/customers" element={<CustomersPage />} />
              <Route path="/customers/:id" element={<CustomerProfilePage />} />
              <Route path="/applications" element={<ApplicationsPage />} />
              <Route path="/providers" element={<ProvidersPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Routes>
          </Layout>
        } />
      </Routes>
    </Router>
  );
}

export default App;
