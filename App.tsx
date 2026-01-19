import React from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Brainstorm from './pages/Brainstorm';
import ProblemMatrix from './pages/ProblemMatrix';
import SolutionMatrix from './pages/SolutionMatrix';
import CombinedMatrix from './pages/CombinedMatrix';
import AdminApproval from './pages/AdminApproval';
import { SessionProvider, useSession } from './context/SessionContext';
import UserRegistrationModal from './components/UserRegistrationModal';
import PendingApprovalScreen from './components/PendingApprovalScreen';

// Inner component that can use useSession hook
const AppContent: React.FC = () => {
  const { currentUser, registerUser, loginByPhone } = useSession();

  // No user - show login/registration
  if (!currentUser) {
    return <UserRegistrationModal onRegister={registerUser} onLogin={loginByPhone} />;
  }

  // User pending approval
  if (currentUser.status === 'PENDING') {
    return <PendingApprovalScreen userName={currentUser.name} />;
  }

  // User approved - show main app
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="brainstorm" element={<Brainstorm />} />
          <Route path="problem-matrix" element={<ProblemMatrix />} />
          <Route path="solution-matrix" element={<SolutionMatrix />} />
          <Route path="combined-matrix" element={<CombinedMatrix />} />
          <Route path="admin/approval" element={<AdminApproval />} />
        </Route>
      </Routes>
    </HashRouter>
  );
};

const App: React.FC = () => {
  return (
    <SessionProvider>
      <AppContent />
    </SessionProvider>
  );
};

export default App;
