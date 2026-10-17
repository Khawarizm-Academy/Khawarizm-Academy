import { Router } from '@/app/router';
import { AuthProvider } from '@/features/auth/context/AuthProvider';
import { RootLayout } from '@/app/layouts/RootLayout';

function App() {
  return (
    <Router>
      <AuthProvider>
        <RootLayout />
      </AuthProvider>
    </Router>
  );
}

export default App;
