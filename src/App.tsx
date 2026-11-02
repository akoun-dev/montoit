import { RouterProvider, createBrowserRouter } from 'react-router-dom';
import { routes } from '@/app/routes';
import { Toaster } from 'sonner';

const router = createBrowserRouter(routes);

function App() {
  return (
    <>
      <RouterProvider router={router} />
      <Toaster position="top-right" richColors closeButton />
    </>
  );
}

export default App;
