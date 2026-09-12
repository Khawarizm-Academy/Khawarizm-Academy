import React from 'react';
import { Router, useLocation } from './app/router';
import { HomePage } from './features/home/pages/HomePage';
import { CatalogPage } from './features/catalog/pages/CatalogPage';

const AppRoutes: React.FC = () => {
  const { pathname } = useLocation();

  if (pathname === '/catalog') {
    return <CatalogPage />;
  }

  return <HomePage />;
};

function App() {
  return (
    <Router>
      <AppRoutes />
    </Router>
  );
}

export default App;
