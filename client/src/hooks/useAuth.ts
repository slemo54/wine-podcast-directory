import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { User, LoginUser, RegisterUser } from "@shared/schema";

export function useAuth() {
  const { data: user, isLoading, error } = useQuery<User>({
    queryKey: ["/api/user"],
    retry: false,
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginUser) => {
      const response = await apiRequest('POST', '/api/login', credentials);
      const data = await response.json();
      return data.user;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (userData: RegisterUser) => {
      const response = await apiRequest('POST', '/api/register', userData);
      const data = await response.json();
      return data.user;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest('POST', '/api/logout');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      queryClient.clear(); // Clear all cached data on logout
    },
  });

  const login = async (credentials: LoginUser) => {
    try {
      await loginMutation.mutateAsync(credentials);
      return { success: true };
    } catch (error: any) {
      return { 
        success: false, 
        error: error.message || 'Login failed' 
      };
    }
  };

  const register = async (userData: RegisterUser) => {
    try {
      await registerMutation.mutateAsync(userData);
      return { success: true };
    } catch (error: any) {
      return { 
        success: false, 
        error: error.message || 'Registration failed' 
      };
    }
  };

  const logout = async () => {
    try {
      await logoutMutation.mutateAsync();
      return { success: true };
    } catch (error: any) {
      return { 
        success: false, 
        error: error.message || 'Logout failed' 
      };
    }
  };

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    isAdmin: !!user?.isAdmin,
    login,
    register,
    logout,
    loginPending: loginMutation.isPending,
    registerPending: registerMutation.isPending,
    logoutPending: logoutMutation.isPending,
  };
}