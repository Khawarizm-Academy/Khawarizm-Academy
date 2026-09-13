import { Router } from './app/router';
import { routes } from './app/routes';
import { RootLayout } from './app/layouts/RootLayout';

function App() {
  return (
    <Router routes={routes}>
      <RootLayout />
    </Router>
  );
}

export default App;
