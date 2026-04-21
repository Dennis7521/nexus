import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

interface Transaction {
  id: string;
  type: 'earned' | 'spent';
  description: string;
  credits: number;
  date: string;
  fullDate: string;
  status: string;
  transactionType: string;
  partnerName?: string;
  exchangeRequestId?: number;
}

interface TransactionSummary {
  totalEarned: number;
  totalSpent: number;
  totalPurchased: number;
  currentBalance: number;
}

export const TransactionHistory: React.FC = () => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState<TransactionSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'earned' | 'purchased' | 'spent'>('all');

  // Fetch transactions and summary on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch transactions
        const transactionsResponse = await axios.get('/transactions');
        if (transactionsResponse.data.success) {
          setTransactions(transactionsResponse.data.transactions);
        }

        // Fetch summary
        const summaryResponse = await axios.get('/transactions/summary');
        if (summaryResponse.data.success) {
          setSummary(summaryResponse.data.summary);
        }
      } catch (err: any) {
        console.error('Error fetching transaction data:', err);
        setError(err.response?.data?.message || 'Failed to load transaction data');
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchData();
    }
  }, [user]);

  return (
    <div className="max-w-4xl mx-auto px-12 py-16">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-semibold text-primary-900 mb-4 tracking-tighter">
          Credit Ledger
        </h1>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
          <p className="mt-4 text-gray-600">Loading transactions...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Credit Balance Card */}
      {!loading && summary && (
        <>
          <div className="max-w-md mx-auto mb-6">
            <div className="card text-center">
              <div className="font-bold mb-2 tracking-tighter" style={{ 
                fontSize: 'var(--text-3xl)', 
                color: 'var(--gray-900)' 
              }}>
                {Number(summary.currentBalance).toFixed(2)}
              </div>
              <div className="uppercase font-medium tracking-wider" style={{ 
                fontSize: 'var(--text-sm)', 
                color: 'var(--gray-500)',
                letterSpacing: '0.05em'
              }}>
                Your Balance
              </div>
            </div>
          </div>

          {/* Summary Statistics */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div 
              onClick={() => setFilter(filter === 'earned' ? 'all' : 'earned')}
              className={`bg-white rounded-xl p-6 border cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-1 ${filter === 'earned' ? 'border-green-500 ring-2 ring-green-200' : 'border-gray-200'}`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Credits Earned</p>
                  <p className="text-3xl font-bold text-green-600">+{Number(summary.totalEarned).toFixed(2)}</p>
                </div>
                <div className="w-12 h-12 border-2 border-green-600 rounded-full flex items-center justify-center">
                  <span className="text-2xl text-green-600">↓</span>
                </div>
              </div>
            </div>
            <div 
              onClick={() => setFilter(filter === 'purchased' ? 'all' : 'purchased')}
              className={`bg-white rounded-xl p-6 border cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-1 ${filter === 'purchased' ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200'}`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Credits Purchased</p>
                  <p className="text-3xl font-bold text-blue-600">+{Number(summary.totalPurchased || 0).toFixed(2)}</p>
                </div>
                <div className="w-12 h-12 border-2 border-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-2xl text-blue-600">★</span>
                </div>
              </div>
            </div>
            <div 
              onClick={() => setFilter(filter === 'spent' ? 'all' : 'spent')}
              className={`bg-white rounded-xl p-6 border cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-1 ${filter === 'spent' ? 'border-red-500 ring-2 ring-red-200' : 'border-gray-200'}`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Spent</p>
                  <p className="text-3xl font-bold text-red-600">{Number(summary.totalSpent) > 0 ? '-' : ''}{Number(summary.totalSpent).toFixed(2)}</p>
                </div>
                <div className="w-12 h-12 border-2 border-red-600 rounded-full flex items-center justify-center">
                  <span className="text-2xl text-red-600">↑</span>
                </div>
              </div>
            </div>
          </div>

          {/* Filter indicator */}
          {filter !== 'all' && (
            <div className="mb-4 flex items-center gap-2">
              <span className="text-sm text-gray-600">Showing:</span>
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${
                filter === 'earned' ? 'border-green-500 text-green-700' :
                filter === 'purchased' ? 'border-blue-500 text-blue-700' :
                'border-red-500 text-red-700'
              }`}>
                {filter === 'earned' ? 'Credits Earned' : filter === 'purchased' ? 'Credits Purchased' : 'Total Spent'}
                <button 
                  onClick={() => setFilter('all')}
                  className="ml-2 text-xs hover:opacity-75"
                >
                  ✕
                </button>
              </span>
            </div>
          )}
        </>
      )}

      {/* Transaction History */}
      <div className="bg-secondary-100 rounded-2xl p-6">
        <h3 className="text-xl font-semibold text-secondary-900 mb-6">
          Recent Transactions
        </h3>

        <div className="space-y-3">
          {!loading && transactions.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-secondary-500 mb-2">No transactions yet</div>
              <div className="text-sm text-secondary-400">Your transaction history will appear here</div>
            </div>
          ) : (
            <>
              {(() => {
                const filteredTransactions = transactions.filter(tx => {
                  if (filter === 'all') return true;
                  if (filter === 'purchased') return tx.transactionType === 'purchase' || tx.transactionType === 'welcome_bonus' || tx.transactionType === 'opening_balance';
                  if (filter === 'earned') return tx.type === 'earned' && tx.transactionType !== 'purchase' && tx.transactionType !== 'welcome_bonus' && tx.transactionType !== 'opening_balance';
                  if (filter === 'spent') return tx.type === 'spent';
                  return true;
                });

                if (filteredTransactions.length === 0) {
                  return (
                    <div className="text-center py-8">
                      <div className="text-secondary-500 mb-2">No {filter} transactions found</div>
                      <div className="text-sm text-secondary-400">Click another card to filter by a different type</div>
                    </div>
                  );
                }

                return filteredTransactions.map((tx, index) => {
                // Calculate balances for this transaction
                // Transactions are ordered DESC (newest first)
                // For the first transaction (index 0), balance after = current balance
                // For others, balance after = current balance - sum of all newer transactions
                const newerTransactions = transactions.slice(0, index);
                const creditsFromNewerTransactions = newerTransactions.reduce((acc, t) => acc + Number(t.credits || 0), 0);
                const balanceAfter = summary ? Number(summary.currentBalance || 0) - creditsFromNewerTransactions : 0;
                const balanceBefore = balanceAfter - Number(tx.credits || 0);
                
                // Determine display category: purchased (blue), earned (green), or spent (red)
                const isPurchased = tx.transactionType === 'purchase' || tx.transactionType === 'welcome_bonus' || tx.transactionType === 'opening_balance';
                const isEarned = tx.type === 'earned' && !isPurchased;
                const isSpent = tx.type === 'spent';
                
                return (
                <div
                  key={tx.id}
                  className="bg-neutral-white rounded-xl p-5 border border-secondary-200 hover:shadow-md transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold border-2 ${
                        isEarned
                          ? "border-green-600 text-green-600" 
                          : isPurchased
                            ? "border-blue-600 text-blue-600"
                            : "border-red-600 text-red-600"
                      }`}>
                        {isSpent ? "↑" : "↓"}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-base font-semibold ${
                            isEarned ? "text-green-700" : isPurchased ? "text-blue-700" : "text-red-700"
                          }`}>
                            {isEarned ? "Incoming Credit" : isPurchased ? "Credits Purchased" : "Outgoing Credit"}
                          </span>
                          <span className="text-xs text-gray-500">•</span>
                          <span className="text-xs text-gray-500">{tx.date}</span>
                        </div>
                        
                        {tx.partnerName && (
                          <div className="text-sm text-gray-700 mb-2">
                            {isPurchased ? "Via: " : isEarned ? "From: " : "To: "}
                            <span className="font-medium">{tx.partnerName}</span>
                          </div>
                        )}
                        
                        <div className="text-xs text-gray-500 mt-2 flex items-center gap-3">
                          <span>Type: <span className="capitalize font-medium text-gray-700">{tx.transactionType}</span></span>
                          <span>•</span>
                          <span>Balance before: <span className="font-medium text-gray-700">{Number(balanceBefore).toFixed(2)}</span></span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right ml-4">
                      <div className={`text-2xl font-bold ${
                        isEarned
                          ? 'text-green-600' 
                          : isPurchased
                            ? 'text-blue-600'
                            : 'text-red-600'
                      }`}>
                        {isSpent ? "-" : "+"}{Number(Math.abs(tx.credits)).toFixed(2)}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        After: {Number(balanceAfter).toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>
              );
              });
            })()}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default TransactionHistory;
