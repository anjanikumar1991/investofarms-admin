import { Navigate, Route, Routes } from 'react-router-dom';
import { ReactNode } from 'react';
import { useAuth } from './auth/AuthContext';
import { Layout } from './components/Layout';
import { ActivityRosterPage } from './pages/ActivityRosterPage';
import { CropPlannerPage } from './pages/CropPlannerPage';
import { DashboardPage } from './pages/DashboardPage';
import { DistributionGroupsPage } from './pages/DistributionGroupsPage';
import { DocumentsPage } from './pages/DocumentsPage';
import { KYCApprovalPage } from './pages/KYCApprovalPage';
import { LoginPage } from './pages/LoginPage';
import { MasterDataPage } from './pages/MasterDataPage';
import { ContentPage } from './pages/ContentPage';
import { NotificationsPage } from './pages/NotificationsPage';
import PaymentsPage from './pages/PaymentsPage';
import { PayoutsPage } from './pages/PayoutsPage';
import { ProjectPlannerPage } from './pages/ProjectPlannerPage';
import { ProjectsPage } from './pages/ProjectsPage';
import { UsersPage } from './pages/UsersPage';

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { token, loading } = useAuth();
  if (loading) return <div className="loading-screen">Loading InvestoFarms Admin...</div>;
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="projects" element={<ProjectsPage />} />
        <Route path="projects/:projectId/planner" element={<ProjectPlannerPage />} />
        <Route path="cycles/:cycleId/activities" element={<ActivityRosterPage />} />
        <Route path="crop-planner" element={<CropPlannerPage />} />
        <Route path="master-data" element={<MasterDataPage />} />
        <Route path="payments" element={<PaymentsPage />} />
        <Route path="payouts" element={<PayoutsPage />} />
        <Route path="kyc-approval" element={<KYCApprovalPage />} />
        <Route path="distribution-groups" element={<DistributionGroupsPage />} />
        <Route path="documents" element={<DocumentsPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="content" element={<ContentPage />} />
      </Route>
    </Routes>
  );
}
