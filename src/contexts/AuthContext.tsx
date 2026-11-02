import { AuthProvider } from '@/app/providers/AuthProvider';
import { useAuth as useAuthFromProvider } from '@/app/providers/AuthProvider';

export type AuthContextValue = ReturnType<typeof useAuthFromProvider>;

export const AuthContextProvider = AuthProvider;
export const useAuth = useAuthFromProvider;

export default AuthProvider;
