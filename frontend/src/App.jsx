import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/Layout/Navbar';
import Sidebar from './components/Layout/Sidebar';
import DashboardPage from './pages/DashboardPage';
import InvestigationPage from './pages/InvestigationPage';

export default function App() {
  return (
    <BrowserRouter>
      <div className="app-layout">
        <Sidebar />
        <Navbar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/investigations" element={<InvestigationPage />} />
            <Route path="/investigations/:id" element={<InvestigationPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
