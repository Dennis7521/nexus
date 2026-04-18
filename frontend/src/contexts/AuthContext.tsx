import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import axios from 'axios';

export interface Transaction {
  id: string;
  type: 'earned' | 'spent';
  description: string;
  credits: number;
  date: string;
  status: 'pending' | 'completed' | 'cancelled';
}

export interface ExchangeRequest {
  id: string;
  skillTitle: string;
  requesterName: string;
  requesterId: string;
  requesterEmail: string;
  providerName: string;
  providerId: string;
  creditsRequired: number;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
  message?: string;
}

interface User {
  id: string;
  studentId: string;
  email: string;
  firstName: string;
  lastName: string;
  bio?: string;
  degreeProgram?: string;
  yearOfStudy?: number;
  timeCredits: number;
  totalRating: number;
  ratingCount: number;
  profilePictureUrl?: string;
  transcriptUrl?: string;
  skills?: string[]; // Legacy field, kept for backward compatibility
  skillsPossessing?: string[]; // Skills user can offer/teach
  skillsInterestedIn?: string[]; // Skills user wants to learn
  transactions?: Transaction[];
  incomingRequests?: ExchangeRequest[];
  outgoingRequests?: ExchangeRequest[];
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<{ mustChangePassword: boolean; user: any } | undefined>;
  register: (userData: RegisterData) => Promise<any>;
  verifyEmail: (email: string, otpCode: string) => Promise<any>;
  resendOTP: (email: string) => Promise<any>;
  logout: () => void;
  loading: boolean;
  updateUser: (userData: Partial<User>) => void;
  updateProfilePicture: (imageUrl: string | null) => Promise<void>;
  requestExchange: (skillTitle: string, partnerName: string, partnerId: string, creditsRequired: number) => Promise<boolean>;
  addCredits: (amount: number, description: string) => void;
  getTransactionHistory: () => Transaction[];
  confirmExchange: (transactionId: string) => void;
  cancelExchange: (transactionId: string) => void;
  getAvailableCredits: () => number;
  getIncomingRequests: () => ExchangeRequest[];
  acceptRequest: (requestId: string) => void;
  rejectRequest: (requestId: string) => void;
  sendExchangeRequest: (skillId: number, sessionCount?: number, message?: string) => Promise<boolean>;
  loadExchangeRequests: () => Promise<void>;
}

interface RegisterData {
  studentId: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  bio?: string;
  degreeProgram?: string;
  yearOfStudy?: number;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Configure axios defaults
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
axios.defaults.baseURL = API_BASE_URL;

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  // Set up axios interceptor for authentication
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  }, [token]);

  // Check if user is authenticated on app load
  useEffect(() => {
    const checkAuth = async () => {
      const storedToken = localStorage.getItem('token');
      if (storedToken) {
        try {
          setToken(storedToken);
          axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
          
          const response = await axios.get('/auth/me');
          const userData = response.data.user;
          
          // Convert full URL to relative path for profile picture
          if (userData.profilePictureUrl && userData.profilePictureUrl.startsWith('http')) {
            userData.profilePictureUrl = new URL(userData.profilePictureUrl).pathname;
          }
          
          // Initialize transactions if not present
          if (!userData.transactions) {
            userData.transactions = [
              {
                id: '1',
                type: 'earned',
                description: 'Welcome deposit — Initial 10 credits',
                credits: 10,
                date: 'Mar 4',
                status: 'completed'
              }
            ];
          }
          // Initialize empty requests arrays
          userData.incomingRequests = [];
          userData.outgoingRequests = [];
          
          setUser(userData);
          
          // Load exchange requests from database after setting user
          try {
            const response = await axios.get(`/exchanges/requests?userId=${userData.id}`);
            const { incoming, outgoing } = response.data;
              
              // Convert database format to frontend format
              const incomingRequests = incoming.map((req: any) => ({
                id: req.id.toString(),
                skillTitle: req.skill_title,
                requesterName: req.requester_name,
                requesterId: req.requester_id,
                requesterEmail: req.requester_email,
                providerName: `${userData.firstName} ${userData.lastName}`,
                providerId: userData.id,
                creditsRequired: req.credits_required,
                status: req.status,
                createdAt: req.created_at,
                message: req.message
              }));

              const outgoingRequests = outgoing.map((req: any) => ({
                id: req.id.toString(),
                skillTitle: req.skill_title,
                requesterName: `${userData.firstName} ${userData.lastName}`,
                requesterId: userData.id,
                requesterEmail: userData.email,
                providerName: req.instructor_name,
                providerId: req.instructor_id,
                creditsRequired: req.credits_required,
                status: req.status,
                createdAt: req.created_at,
                message: req.message
              }));

            setUser(prevUser => ({
              ...prevUser!,
              incomingRequests,
              outgoingRequests
            }));
          } catch (error) {
            console.error('Error loading exchange requests:', error);
          }
        } catch (error) {
          console.error('Auth check failed:', error);
          localStorage.removeItem('token');
          setToken(null);
          delete axios.defaults.headers.common['Authorization'];
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await axios.post('/auth/login', { email, password });
      console.log('📥 Login response data:', response.data);
      const { user: userData, token: userToken, mustChangePassword } = response.data;
      
      // If must change password, return early with flag
      if (mustChangePassword) {
        console.log('🔑 mustChangePassword flag detected:', mustChangePassword);
        setToken(userToken);
        // Don't set user yet - only set token so ProtectedRoute allows access
        localStorage.setItem('token', userToken);
        axios.defaults.headers.common['Authorization'] = `Bearer ${userToken}`;
        console.log('✅ Returning mustChangePassword result');
        return { mustChangePassword: true, user: userData };
      }
      
      console.log('✅ Normal login flow - no password change required');
      
      // Convert full URL to relative path for profile picture
      if (userData.profilePictureUrl && userData.profilePictureUrl.startsWith('http')) {
        userData.profilePictureUrl = new URL(userData.profilePictureUrl).pathname;
      }
      
      // Initialize transactions if not present
      if (!userData.transactions) {
        userData.transactions = [
          {
            id: '1',
            type: 'earned',
            description: 'Welcome deposit — Initial 10 credits',
            credits: 10,
            date: 'Mar 4',
            status: 'completed'
          }
        ];
      }
      // Initialize empty requests arrays
      userData.incomingRequests = [];
      userData.outgoingRequests = [];
      
      setUser(userData);
      setToken(userToken);
      localStorage.setItem('token', userToken);
      axios.defaults.headers.common['Authorization'] = `Bearer ${userToken}`;
      
      // Load exchange requests after login
      try {
        const exchangeResponse = await axios.get(`/exchanges/requests?userId=${userData.id}`);
        const { incoming, outgoing } = exchangeResponse.data;
        
        // Convert database format to frontend format
        const incomingRequests = incoming.map((req: any) => ({
          id: req.id.toString(),
          skillTitle: req.skill_title,
          requesterName: req.requester_name,
          requesterId: req.requester_id,
          requesterEmail: req.requester_email,
          providerName: `${userData.firstName} ${userData.lastName}`,
          providerId: userData.id,
          creditsRequired: req.credits_required,
          status: req.status,
          createdAt: req.created_at,
          message: req.message
        }));

        const outgoingRequests = outgoing.map((req: any) => ({
          id: req.id.toString(),
          skillTitle: req.skill_title,
          requesterName: `${userData.firstName} ${userData.lastName}`,
          requesterId: userData.id,
          requesterEmail: userData.email,
          providerName: req.instructor_name,
          providerId: req.instructor_id,
          creditsRequired: req.credits_required,
          status: req.status,
          createdAt: req.created_at,
          message: req.message
        }));

        setUser(prevUser => ({
          ...prevUser!,
          incomingRequests,
          outgoingRequests
        }));
      } catch (error) {
        console.error('Error loading exchange requests after login:', error);
      }
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Login failed');
    }
  };

  const register = async (userData: RegisterData) => {
    try {
      const response = await axios.post('/auth/register', userData);
      // New API returns: { message, email, nextStep: 'verify-email' }
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Registration failed');
    }
  };

  const verifyEmail = async (email: string, otpCode: string) => {
    try {
      const response = await axios.post('/auth/verify-email', { email, otpCode });
      const { user: newUser, token: userToken } = response.data;
      
            // Initialize transactions if not present
      if (!newUser.transactions) {
        newUser.transactions = [
          {
            id: '1',
            type: 'earned',
            description: 'Welcome deposit — Initial 10 credits',
            credits: 10,
            date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            status: 'completed'
          }
        ];
      }
      setUser(newUser);
      setToken(userToken);
      localStorage.setItem('token', userToken);
      axios.defaults.headers.common['Authorization'] = `Bearer ${userToken}`;
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Email verification failed');
    }
  };

  const resendOTP = async (email: string) => {
    try {
      const response = await axios.post('/auth/resend-otp', { email });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to resend OTP');
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
  };

  const updateUser = (userData: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...userData };
setUser(updatedUser);
    }
  };

  const updateProfilePicture = async (imageUrl: string | null) => {
    console.log('📸 AuthContext: updateProfilePicture called with:', imageUrl);
    if (user) {
      console.log('📸 AuthContext: Current user profilePictureUrl:', user.profilePictureUrl);
      
      // Update local state immediately for instant feedback
      const updatedUser = { ...user, profilePictureUrl: imageUrl || undefined };
      console.log('📸 AuthContext: Setting new user with profilePictureUrl:', updatedUser.profilePictureUrl);
      setUser(updatedUser);
      
      // Refetch user data from backend to ensure sync
      try {
        const response = await axios.get('/auth/me');
        const userData = response.data.user;
        
        // Convert full URL to relative path for profile picture
        if (userData.profilePictureUrl && userData.profilePictureUrl.startsWith('http')) {
          userData.profilePictureUrl = new URL(userData.profilePictureUrl).pathname;
        }
        
        // Preserve existing data that might not be in the response
        setUser(prevUser => ({
          ...prevUser!,
          ...userData
        }));
        console.log('📸 AuthContext: User data refreshed from backend');
      } catch (error) {
        console.error('📸 AuthContext: Failed to refresh user data:', error);
      }
    } else {
      console.log('📸 AuthContext: No user logged in');
    }
  };

  const requestExchange = async (skillTitle: string, partnerName: string, partnerId: string, creditsRequired: number): Promise<boolean> => {
    if (!user) return false;
    
    // Check if user has enough available credits (excluding reserved/pending credits)
    const availableCredits = getAvailableCredits();
    if (availableCredits < creditsRequired) {
      return false; // Insufficient credits
    }

    // Create pending transaction record (credits not deducted yet)
    const transaction: Transaction = {
      id: Date.now().toString(),
      type: 'spent',
      description: `${skillTitle} — ${partnerName}`,
      credits: -creditsRequired,
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      status: 'pending' // Credits reserved but not deducted
    };

    // Add transaction but DON'T deduct credits yet
    const updatedTransactions = [transaction, ...(user.transactions || [])];
    setUser({
      ...user,
      transactions: updatedTransactions
      // timeCredits remain unchanged until confirmation
    });

    // In a real app, you would send this to your backend API
    // await axios.post('/api/exchanges/request', { skillTitle, partnerId, creditsRequired });

    return true;
  };

  const addCredits = (amount: number, description: string) => {
    if (!user) return;

    const transaction: Transaction = {
      id: Date.now().toString(),
      type: 'earned',
      description,
      credits: amount,
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      status: 'completed'
    };

    const updatedTransactions = [transaction, ...(user.transactions || [])];
    setUser({
      ...user,
      timeCredits: user.timeCredits + amount,
      transactions: updatedTransactions
    });
  };

  const getTransactionHistory = (): Transaction[] => {
    return user?.transactions || [];
  };

  const confirmExchange = (transactionId: string) => {
    if (!user) return;

    const updatedTransactions = user.transactions?.map(tx => {
      if (tx.id === transactionId && tx.status === 'pending') {
        // Deduct credits when exchange is confirmed
        const updatedUser = {
          ...user,
          timeCredits: user.timeCredits + tx.credits, // tx.credits is negative for spent
          transactions: user.transactions?.map(t => 
            t.id === transactionId ? { ...t, status: 'completed' as const } : t
          ) || []
        };
        setUser(updatedUser);
        return { ...tx, status: 'completed' as const };
      }
      return tx;
    }) || [];
  };

  const cancelExchange = (transactionId: string) => {
    if (!user) return;

    // Remove the pending transaction (credits were never deducted)
    const updatedTransactions = user.transactions?.filter(tx => tx.id !== transactionId) || [];
    setUser({
      ...user,
      transactions: updatedTransactions
    });
  };

  const getAvailableCredits = (): number => {
    if (!user) return 0;
    
    // Calculate reserved credits from pending transactions
    const reservedCredits = user.transactions?.reduce((total, tx) => {
      if (tx.status === 'pending' && tx.type === 'spent') {
        return total + Math.abs(tx.credits);
      }
      return total;
    }, 0) || 0;

    return user.timeCredits - reservedCredits;
  };

  const getIncomingRequests = (): ExchangeRequest[] => {
    return user?.incomingRequests || [];
  };

  const loadExchangeRequests = async () => {
    if (!user) return;
    
    try {
      const response = await axios.get(`/exchanges/requests?userId=${user.id}`);
      const { incoming, outgoing } = response.data;
      
      // Convert database format to frontend format
      const incomingRequests = incoming.map((req: any) => ({
        id: req.id.toString(),
        skillTitle: req.skill_title,
        requesterName: req.requester_name,
        requesterId: req.requester_id,
        requesterEmail: req.requester_email,
        providerName: `${user.firstName} ${user.lastName}`,
        providerId: user.id,
        creditsRequired: req.credits_required,
        status: req.status,
        createdAt: req.created_at,
        message: req.message
      }));

      const outgoingRequests = outgoing.map((req: any) => ({
        id: req.id.toString(),
        skillTitle: req.skill_title,
        requesterName: `${user.firstName} ${user.lastName}`,
        requesterId: user.id,
        requesterEmail: user.email,
        providerName: req.instructor_name,
        providerId: req.instructor_id,
        creditsRequired: req.credits_required,
        status: req.status,
        createdAt: req.created_at,
        message: req.message
      }));

      setUser({
        ...user,
        incomingRequests,
        outgoingRequests
      });
    } catch (error) {
      console.error('Error loading exchange requests:', error);
    }
  };

  const acceptRequest = async (requestId: string) => {
    if (!user) return;

    try {
      // Call API to accept the request
      const response = await axios.put(`/exchanges/accept/${requestId}`);
      
      if (response.status === 200) {
        // Reload exchange requests to get updated data
        await loadExchangeRequests();
        
        // Add transaction record locally
        const request = user.incomingRequests?.find(req => req.id === requestId);
        if (request) {
          const updatedUser = {
            ...user,
            timeCredits: user.timeCredits + request.creditsRequired,
            transactions: [
              ...(user.transactions || []),
              {
                id: Date.now().toString(),
                type: 'earned' as const,
                description: `Exchange accepted: ${request.skillTitle} with ${request.requesterName}`,
                credits: request.creditsRequired,
                date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                status: 'completed' as const
              }
            ]
          };
          setUser(updatedUser);
        }

        // Initialize messaging by redirecting to Messages page
        setTimeout(() => {
          window.location.href = '/messages';
        }, 1000);
      }
    } catch (error) {
      console.error('Error accepting request:', error);
    }
  };

  const rejectRequest = async (requestId: string) => {
    if (!user) return;

    try {
      // Call API to decline the request
      await axios.put(`/exchanges/decline/${requestId}`);
      
      // Reload exchange requests to get updated data
      await loadExchangeRequests();
    } catch (error) {
      console.error('Error rejecting request:', error);
    }
  };

  const sendExchangeRequest = async (skillId: number, sessionCount: number = 1, message?: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const token = localStorage.getItem('token');
      const requestData = {
        skillId,
        sessionCount,
        message: message || ''
      };

      const response = await axios.post('/exchanges/request', requestData, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.status === 201) {
        // Reload exchange requests to get updated data
        await loadExchangeRequests();
        return true;
      }
      
      return false;
    } catch (error: any) {
      console.error('Error sending exchange request:', error);
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      return false;
    }
  };


  const value: AuthContextType = {
    user,
    token,
    login,
    register,
    verifyEmail,
    resendOTP,
    logout,
    loading,
    updateUser,
    updateProfilePicture,
    requestExchange,
    addCredits,
    getTransactionHistory,
    confirmExchange,
    cancelExchange,
    getAvailableCredits,
    getIncomingRequests,
    acceptRequest,
    rejectRequest,
    sendExchangeRequest,
    loadExchangeRequests
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
