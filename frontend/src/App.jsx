import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import ProjectsPage from './pages/ProjectsPage';
import PersonsPage from './pages/PersonsPage';
import PontajPage from './pages/PontajPage';
// import HistoryPage from './pages/HistoryPage';

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/projects" replace />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/persons" element={<PersonsPage />} />
          <Route path="/pontaj" element={<PontajPage />} />
          {/* <Route path="/history" element={<HistoryPage />} /> */}
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
