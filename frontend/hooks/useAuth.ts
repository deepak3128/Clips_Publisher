import { useAuthStore } from '@/lib/auth-store';
import { apiClient } from '@/lib/api';
import { useRouter } from 'next/navigation';

export const useAuth = () => {
  const router = useRouter();
  const { user, token, error, setUser, setToken, setIsLoading, setError, logout } = useAuthStore();

  const register = async (email: string, name: string, password: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await apiClient.register(email, name, password);
      const { user: newUser, token: newToken } = response.data;
      setUser(newUser);
      setToken(newToken);
      router.push('/clips');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await apiClient.login(email, password);
      const { user: newUser, token: newToken } = response.data;
      setUser(newUser);
      setToken(newToken);
      router.push('/clips');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/auth/login');
  };

  return {
    user,
    token,
    error,
    register,
    login,
    logout: handleLogout,
  };
};
