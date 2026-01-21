// Force complete rebuild - 2025-12-07T18:30:00Z
import { Suspense } from 'react';
import { RouterProvider, createBrowserRouter } from 'react-router-dom';
import { routes } from './routes';
import LoadingFallback from '@/shared/ui/LoadingFallback';

const router = createBrowserRouter(routes);

function App() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <RouterProvider router={router} />
    </Suspense>
  );
}

export default App;
