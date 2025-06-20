import React, { useState, useEffect } from 'react';
import { PlusCircle, TrendingUp, DollarSign, Tag, Trash2, MessageCircle, CloudOff, Cloud, Download, Upload, Settings } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const FinanceApp = () => {
  const [expenses, setExpenses] = useState([]);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showAIChat, setShowAIChat] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [syncStatus, setSyncStatus] = useState('local'); // ← FIXED: Added missing state
  const [aiMessages, setAIMessages] = useState([]);
  const [aiInput, setAIInput] = useState('');
  const [newExpense, setNewExpense] = useState({
    amount: '',
    category: 'Food',
    description: '',
    date: new Date().toISOString().split('T')[0]
  });

  const categories = ['Food', 'Transportation', 'Entertainment', 'Shopping', 'Bills', 'Healthcare', 'Other'];
  const categoryColors = {
    'Food': '#FF6B6B',
    'Transportation': '#4ECDC4',
    'Entertainment': '#45B7D1',
    'Shopping': '#96CEB4',
    'Bills': '#FFEAA7',
    'Healthcare': '#DDA0DD',
    'Other': '#98D8C8'
  };

  // Google Drive API credentials (optional for now)
  const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;
  const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';
  const SCOPES = 'https://www.googleapis.com/auth/drive.file';

  // Add this to your App.jsx - Replace the Google API initialization section

  // Modern Google Identity Services approach
  useEffect(() => {
    loadFromLocalStorage();

    // Register service worker for PWA
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        const swUrl = `${import.meta.env.BASE_URL}sw.js`;
        navigator.serviceWorker.register(swUrl)
          .then((registration) => {
            console.log('SW registered: ', registration);
          })
          .catch((registrationError) => {
            console.log('SW registration failed: ', registrationError);
          });
      });
    }

    // Initialize Google API (only if credentials are available)
    if (GOOGLE_CLIENT_ID && GOOGLE_API_KEY) {
      initializeModernGoogleAPI();
    }
  }, []);

  const initializeModernGoogleAPI = async () => {
    try {
      // Load both the old gapi and new Google Identity Services
      await Promise.all([
        loadScript('https://apis.google.com/js/api.js'),
        loadScript('https://accounts.google.com/gsi/client')
      ]);

      // Initialize the drive API part with gapi
      await new Promise((resolve) => window.gapi.load('client', resolve));
      
      await window.gapi.client.init({
        apiKey: GOOGLE_API_KEY,
        discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
      });

      // Initialize Google Identity Services for auth
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleCredentialResponse,
      });

      console.log('Modern Google API initialized successfully');
    } catch (error) {
      console.error('Error initializing Google API:', error);
      setSyncStatus('local');
    }
  };

  const loadScript = (src) => {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) {
        resolve();
        return;
      }
      
      const script = document.createElement('script');
      script.src = src;
      script.onload = resolve;
      script.onerror = reject;
      document.body.appendChild(script);
    });
  };

  const handleCredentialResponse = (response) => {
    // Handle the JWT credential response
    console.log('Credential response:', response);
    setIsSignedIn(true);
    setSyncStatus('synced');
    // You would decode the JWT token here and set up the user session
  };

  // Updated sign-in method
  const signInToGoogle = async () => {
    try {
      // Use Google Identity Services for a more modern approach
      if (window.google && window.google.accounts) {
        window.google.accounts.oauth2.initTokenClient({
          client_id: GOOGLE_CLIENT_ID,
          scope: 'https://www.googleapis.com/auth/drive.file',
          callback: async (tokenResponse) => {
            console.log('Token response:', tokenResponse);
            
            if (tokenResponse.access_token) {
              // Set the access token for gapi client
              window.gapi.client.setToken({
                access_token: tokenResponse.access_token
              });
              
              setIsSignedIn(true);
              setSyncStatus('synced');
              await loadFromGoogleDrive();
            }
          },
        }).requestAccessToken();
      } else {
        // Fallback to old method
        alert('Google API not properly loaded. Please refresh the page.');
      }
    } catch (error) {
      console.error('Sign in failed:', error);
      setSyncStatus('error');
    }
  };

  // Updated sign-out method
  const signOutFromGoogle = async () => {
    try {
      if (window.google && window.google.accounts) {
        const token = window.gapi.client.getToken();
        if (token) {
          window.google.accounts.oauth2.revoke(token.access_token, () => {
            console.log('Token revoked');
          });
          window.gapi.client.setToken(null);
        }
      }
      setIsSignedIn(false);
      setSyncStatus('local');
    } catch (error) {
      console.error('Sign out failed:', error);
    }
  };

  const loadFromLocalStorage = () => {
    const savedExpenses = localStorage.getItem('financeAI_expenses');
    if (savedExpenses) {
      setExpenses(JSON.parse(savedExpenses));
    } else {
      // Sample data for demo
      const sampleExpenses = [
        { id: 1, amount: 25.50, category: 'Food', description: 'Lunch at cafe', date: '2025-06-10' },
        { id: 2, amount: 15.00, category: 'Transportation', description: 'Uber ride', date: '2025-06-11' },
        { id: 3, amount: 50.00, category: 'Entertainment', description: 'Movie tickets', date: '2025-06-12' },
        { id: 4, amount: 120.00, category: 'Bills', description: 'Internet bill', date: '2025-06-13' },
      ];
      setExpenses(sampleExpenses);
      localStorage.setItem('financeAI_expenses', JSON.stringify(sampleExpenses));
    }
    setSyncStatus('local');
  };

  const findOrCreateFinanceFile = async () => {
    try {
      // Search for existing file
      const response = await window.gapi.client.drive.files.list({
        q: "name='financeAI_expenses.json' and parents in 'appDataFolder'",
        spaces: 'appDataFolder'
      });

      if (response.result.files.length > 0) {
        return response.result.files[0].id;
      }

      // Create new file if doesn't exist
      const fileMetadata = {
        name: 'financeAI_expenses.json',
        parents: ['appDataFolder']
      };

      const createResponse = await window.gapi.client.drive.files.create({
        resource: fileMetadata
      });

      return createResponse.result.id;
    } catch (error) {
      console.error('Error finding/creating file:', error);
      throw error;
    }
  };

  const loadFromGoogleDrive = async () => {
    if (!window.gapi || !isSignedIn) return;
    
    setIsLoading(true);
    setSyncStatus('syncing');
    
    try {
      const fileId = await findOrCreateFinanceFile();
      
      const response = await window.gapi.client.drive.files.get({
        fileId: fileId,
        alt: 'media'
      });

      if (response.body) {
        const expensesData = JSON.parse(response.body);
        setExpenses(expensesData);
        saveToLocalStorage(expensesData);
        setLastSync(new Date());
        setSyncStatus('synced');
      } else {
        loadFromLocalStorage();
      }
    } catch (error) {
      console.error('Failed to load from Google Drive:', error);
      loadFromLocalStorage();
      setSyncStatus('error');
    }
    
    setIsLoading(false);
  };

  const saveToGoogleDrive = async (expensesData) => {
    if (!window.gapi || !isSignedIn) {
      saveToLocalStorage(expensesData);
      return;
    }

    setSyncStatus('syncing');
    
    try {
      const fileId = await findOrCreateFinanceFile();
      
      await window.gapi.client.request({
        path: `https://www.googleapis.com/upload/drive/v3/files/${fileId}`,
        method: 'PATCH',
        params: { uploadType: 'media' },
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(expensesData, null, 2)
      });

      setLastSync(new Date());
      setSyncStatus('synced');
      saveToLocalStorage(expensesData);
    } catch (error) {
      console.error('Failed to save to Google Drive:', error);
      setSyncStatus('error');
      saveToLocalStorage(expensesData);
    }
  };

  const addExpense = async () => {
    if (newExpense.amount && newExpense.description) {
      const expense = {
        id: Date.now(),
        ...newExpense,
        amount: parseFloat(newExpense.amount)
      };
      const updatedExpenses = [expense, ...expenses];
      setExpenses(updatedExpenses);
      
      if (isSignedIn) {
        await saveToGoogleDrive(updatedExpenses);
      } else {
        saveToLocalStorage(updatedExpenses);
      }
      
      setNewExpense({
        amount: '',
        category: 'Food',
        description: '',
        date: new Date().toISOString().split('T')[0]
      });
      setShowAddForm(false);
    }
  };

  const deleteExpense = async (id) => {
    const updatedExpenses = expenses.filter(exp => exp.id !== id);
    setExpenses(updatedExpenses);
    
    if (isSignedIn) {
      await saveToGoogleDrive(updatedExpenses);
    } else {
      saveToLocalStorage(updatedExpenses);
    }
  };

  const exportData = () => {
    const dataStr = JSON.stringify(expenses, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `finance_data_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
  };

  const importData = async (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const importedData = JSON.parse(e.target.result);
          const mergedExpenses = [...importedData, ...expenses].reduce((acc, current) => {
            const x = acc.find(item => item.id === current.id);
            if (!x) {
              return acc.concat([current]);
            } else {
              return acc;
            }
          }, []);
          setExpenses(mergedExpenses);
          
          if (isSignedIn) {
            await saveToGoogleDrive(mergedExpenses);
          } else {
            saveToLocalStorage(mergedExpenses);
          }
        } catch (error) {
          alert('Invalid file format');
        }
      };
      reader.readAsText(file);
    }
  };

  const generateAIPrompt = () => {
    const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    const categoryBreakdown = categories.map(cat => ({
      name: cat,
      value: expenses.filter(exp => exp.category === cat).reduce((sum, exp) => sum + exp.amount, 0)
    })).filter(item => item.value > 0);

    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const thisMonthExpenses = expenses.filter(exp => {
      const expDate = new Date(exp.date);
      return expDate.getMonth() === currentMonth && expDate.getFullYear() === currentYear;
    });
    const thisMonthTotal = thisMonthExpenses.reduce((sum, exp) => sum + exp.amount, 0);

    return `Here's my expense data for financial analysis:

MONTHLY SUMMARY:
- This month spending: $${thisMonthTotal.toFixed(2)}
- Total tracked: $${totalExpenses.toFixed(2)}
- Transaction count: ${expenses.length}
- Average per transaction: $${expenses.length > 0 ? (totalExpenses / expenses.length).toFixed(2) : '0.00'}

CATEGORY BREAKDOWN:
${categoryBreakdown.map(cat => `- ${cat.name}: $${cat.value.toFixed(2)} (${((cat.value/totalExpenses)*100).toFixed(1)}%)`).join('\n')}

RECENT TRANSACTIONS:
${expenses.slice(0, 5).map(exp => `- ${exp.date}: ${exp.description} - $${exp.amount} (${exp.category})`).join('\n')}

Please provide personalized financial advice including:
1. Budget recommendations based on the 50/30/20 rule
2. Spending pattern analysis and trends
3. Specific areas where I can reduce expenses
4. Savings strategies tailored to my spending habits
5. Financial health assessment and improvement suggestions`;
  };

  const handleSmartAdvice = (topic) => {
    let advice = '';
    const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    const categoryData = categories.map(cat => ({
      name: cat,
      value: expenses.filter(exp => exp.category === cat).reduce((sum, exp) => sum + exp.amount, 0)
    })).filter(item => item.value > 0).sort((a, b) => b.value - a.value);

    switch (topic) {
      case 'budget':
        const monthlyAvg = totalExpenses / (expenses.length > 0 ? Math.max(1, new Set(expenses.map(e => e.date.substring(0, 7))).size) : 1);
        advice = `💡 **Budget Recommendation**

Based on your spending of $${monthlyAvg.toFixed(2)}/month average:
• Essential expenses (50%): $${(monthlyAvg * 0.5).toFixed(2)}
• Discretionary (30%): $${(monthlyAvg * 0.3).toFixed(2)}  
• Savings (20%): $${(monthlyAvg * 0.2).toFixed(2)}

Your top category is ${categoryData[0]?.name || 'Food'} at $${categoryData[0]?.value.toFixed(2) || '0'}.`;
        break;
      
      case 'savings':
        const topCategory = categoryData[0];
        advice = `💰 **Savings Opportunities**

Quick wins to save money:
• Reduce ${topCategory?.name || 'Food'} spending by 15% → Save $${((topCategory?.value || 100) * 0.15).toFixed(2)}/month
• Use the 24-hour rule for purchases over $50
• Review subscriptions and cancel unused services
• Cook at home 2 more days/week → Save ~$120/month`;
        break;
        
      case 'trends':
        const avgExpense = totalExpenses / expenses.length;
        advice = `📊 **Spending Analysis**

Your spending patterns:
• Average transaction: $${avgExpense.toFixed(2)}
• Most frequent category: ${categoryData[0]?.name || 'Food'}
• Total transactions: ${expenses.length}
• Spending distribution looks ${categoryData.length > 5 ? 'well-diversified' : 'concentrated'}

Consider tracking smaller expenses for better visibility.`;
        break;
        
      default:
        advice = `🤖 **AI Financial Assistant**

I can help you with:
• Budget planning and recommendations
• Spending analysis and trends
• Money-saving strategies
• Financial goal setting

Try asking: "budget", "savings", or "trends"`;
    }

    setAIMessages([...aiMessages, 
      { type: 'user', content: topic },
      { type: 'ai', content: advice }
    ]);
  };

  const getSyncStatusDisplay = () => {
    switch (syncStatus) {
      case 'syncing':
        return { icon: Cloud, text: 'Syncing...', color: 'text-blue-600' };
      case 'synced':
        return { icon: Cloud, text: 'Synced', color: 'text-green-600' };
      case 'error':
        return { icon: CloudOff, text: 'Sync Error', color: 'text-red-600' };
      default:
        return { icon: CloudOff, text: 'Local Only', color: 'text-gray-500' };
    }
  };

  // Calculate totals and analytics
  const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const thisMonthExpenses = expenses.filter(exp => {
    const expDate = new Date(exp.date);
    return expDate.getMonth() === currentMonth && expDate.getFullYear() === currentYear;
  });
  const thisMonthTotal = thisMonthExpenses.reduce((sum, exp) => sum + exp.amount, 0);

  const categoryData = categories.map(cat => ({
    name: cat,
    value: expenses.filter(exp => exp.category === cat).reduce((sum, exp) => sum + exp.amount, 0),
    color: categoryColors[cat]
  })).filter(item => item.value > 0);

  const dailyData = expenses.reduce((acc, exp) => {
    const date = exp.date;
    acc[date] = (acc[date] || 0) + exp.amount;
    return acc;
  }, {});

  const chartData = Object.entries(dailyData)
    .map(([date, amount]) => ({ date, amount }))
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(-7);

  const StatusIcon = getSyncStatusDisplay().icon;

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-start mb-4">
            <h1 className="text-3xl font-bold text-gray-800">Personal Finance AI</h1>
            <div className="flex items-center gap-2">
              <div className={`flex items-center gap-2 ${getSyncStatusDisplay().color}`}>
                <StatusIcon className="h-5 w-5" />
                <span className="text-sm">{getSyncStatusDisplay().text}</span>
              </div>
              <button
                onClick={() => {
                  console.log('Settings button clicked! State:', showSettings);
                  setShowSettings(true);
                  console.log('setShowSettings(true) called');
                }}
                className="p-2 text-gray-500 hover:text-gray-700 bg-yellow-200 border border-yellow-400"
                style={{ minWidth: '40px', minHeight: '40px' }}
              >
                ⚙️
              </button>
            </div>
          </div>

          {lastSync && (
            <p className="text-sm text-gray-500 mb-4">
              Last synced: {lastSync.toLocaleString()}
            </p>
          )}
          
          {/* Debug Info */}
          <div className="mb-4 text-sm text-gray-500 bg-gray-100 p-2 rounded">
            Debug: Settings Modal: {showSettings ? 'OPEN' : 'CLOSED'} | Add Form: {showAddForm ? 'OPEN' : 'CLOSED'} | AI Chat: {showAIChat ? 'OPEN' : 'CLOSED'}
          </div>
          
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-600 text-sm font-medium">This Month</p>
                  <p className="text-2xl font-bold text-blue-800">${thisMonthTotal.toFixed(2)}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-blue-600" />
              </div>
            </div>
            
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-600 text-sm font-medium">Total Tracked</p>
                  <p className="text-2xl font-bold text-green-800">${totalExpenses.toFixed(2)}</p>
                </div>
                <DollarSign className="h-8 w-8 text-green-600" />
              </div>
            </div>
            
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-600 text-sm font-medium">Transactions</p>
                  <p className="text-2xl font-bold text-purple-800">{expenses.length}</p>
                </div>
                <Tag className="h-8 w-8 text-purple-600" />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setShowAddForm(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition-colors"
            >
              <PlusCircle className="h-5 w-5" />
              Add Expense
            </button>
            <button
              onClick={() => setShowAIChat(true)}
              className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-green-700 transition-colors"
            >
              <MessageCircle className="h-5 w-5" />
              AI Assistant
            </button>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold mb-4">Spending Trend (Last 7 Days)</h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip formatter={(value) => [`$${value.toFixed(2)}`, 'Amount']} />
                <Line type="monotone" dataKey="amount" stroke="#3B82F6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold mb-4">Spending by Category</h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="value"
                  label={({ name, value }) => `${name}: $${value.toFixed(0)}`}
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `$${value.toFixed(2)}`} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Expenses */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4">Recent Expenses</h3>
          <div className="space-y-3">
            {expenses.slice(0, 10).map((expense) => (
              <div key={expense.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: categoryColors[expense.category] }}
                  ></div>
                  <div>
                    <p className="font-medium">{expense.description}</p>
                    <p className="text-sm text-gray-500">{expense.category} • {expense.date}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-red-600">${expense.amount.toFixed(2)}</span>
                  <button
                    onClick={() => deleteExpense(expense.id)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Add Expense Modal - FIXED CONTRAST */}
        {showAddForm && (
          <div 
            className="fixed inset-0 flex items-center justify-center p-4"
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 10001,
              backgroundColor: 'rgba(0, 0, 0, 0.7)'
            }}
          >
            <div 
              className="rounded-xl shadow-2xl w-full max-w-lg mx-auto"
              style={{
                backgroundColor: '#ffffff',
                maxWidth: '480px',
                width: '95%',
                maxHeight: '90vh',
                overflow: 'auto'
              }}
            >
              {/* Header */}
              <div 
                className="px-6 py-4 rounded-t-xl"
                style={{ backgroundColor: '#3B82F6', color: '#ffffff' }}
              >
                <div className="flex justify-between items-center">
                  <h3 className="text-xl font-bold" style={{ color: '#ffffff' }}>💰 Add New Expense</h3>
                  <button
                    onClick={() => setShowAddForm(false)}
                    className="font-bold w-8 h-8 flex items-center justify-center rounded-full hover:bg-white hover:bg-opacity-20 transition-colors"
                    style={{ color: '#ffffff', fontSize: '24px' }}
                  >
                    ×
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 space-y-5" style={{ backgroundColor: '#ffffff' }}>
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: '#374151' }}>
                    💵 Amount
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={newExpense.amount}
                    onChange={(e) => setNewExpense({...newExpense, amount: e.target.value})}
                    className="w-full rounded-lg px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                    style={{ 
                      border: '2px solid #D1D5DB',
                      backgroundColor: '#ffffff',
                      color: '#111827'
                    }}
                    placeholder="0.00"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: '#374151' }}>
                    🏷️ Category
                  </label>
                  <select
                    value={newExpense.category}
                    onChange={(e) => setNewExpense({...newExpense, category: e.target.value})}
                    className="w-full rounded-lg px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                    style={{ 
                      border: '2px solid #D1D5DB',
                      backgroundColor: '#ffffff',
                      color: '#111827'
                    }}
                  >
                    {categories.map(cat => (
                      <option key={cat} value={cat} style={{ color: '#111827', backgroundColor: '#ffffff' }}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: '#374151' }}>
                    📝 Description
                  </label>
                  <input
                    type="text"
                    value={newExpense.description}
                    onChange={(e) => setNewExpense({...newExpense, description: e.target.value})}
                    className="w-full rounded-lg px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                    style={{ 
                      border: '2px solid #D1D5DB',
                      backgroundColor: '#ffffff',
                      color: '#111827'
                    }}
                    placeholder="What did you spend on?"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: '#374151' }}>
                    📅 Date
                  </label>
                  <input
                    type="date"
                    value={newExpense.date}
                    onChange={(e) => setNewExpense({...newExpense, date: e.target.value})}
                    className="w-full rounded-lg px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                    style={{ 
                      border: '2px solid #D1D5DB',
                      backgroundColor: '#ffffff',
                      color: '#111827'
                    }}
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 pb-6" style={{ backgroundColor: '#ffffff' }}>
                <div className="flex gap-3">
                  <button
                    onClick={addExpense}
                    className="flex-1 py-3 px-4 rounded-lg font-semibold text-lg shadow-lg transition-all duration-200"
                    style={{ 
                      backgroundColor: '#3B82F6',
                      color: '#ffffff'
                    }}
                    onMouseOver={(e) => e.target.style.backgroundColor = '#2563EB'}
                    onMouseOut={(e) => e.target.style.backgroundColor = '#3B82F6'}
                    disabled={isLoading}
                  >
                    {isLoading ? '⏳ Saving...' : '✅ Add Expense'}
                  </button>
                  <button
                    onClick={() => setShowAddForm(false)}
                    className="flex-1 py-3 px-4 rounded-lg font-semibold text-lg transition-colors"
                    style={{ 
                      backgroundColor: '#F3F4F6',
                      color: '#374151'
                    }}
                    onMouseOver={(e) => e.target.style.backgroundColor = '#E5E7EB'}
                    onMouseOut={(e) => e.target.style.backgroundColor = '#F3F4F6'}
                  >
                    ❌ Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* AI Chat Modal - FIXED CONTRAST */}
        {showAIChat && (
          <div 
            className="fixed inset-0 flex items-center justify-center p-4"
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 10002,
              backgroundColor: 'rgba(0, 0, 0, 0.7)'
            }}
          >
            <div 
              className="rounded-xl shadow-2xl w-full h-full max-w-4xl flex flex-col"
              style={{
                backgroundColor: '#ffffff',
                maxWidth: '900px',
                width: '95%',
                height: '85vh'
              }}
            >
              {/* Header */}
              <div 
                className="px-6 py-4 rounded-t-xl"
                style={{ backgroundColor: '#10B981', color: '#ffffff' }}
              >
                <div className="flex justify-between items-center">
                  <h3 className="text-xl font-bold" style={{ color: '#ffffff' }}>🤖 AI Financial Assistant</h3>
                  <button
                    onClick={() => setShowAIChat(false)}
                    className="font-bold w-8 h-8 flex items-center justify-center rounded-full hover:bg-white hover:bg-opacity-20 transition-colors"
                    style={{ color: '#ffffff', fontSize: '24px' }}
                  >
                    ×
                  </button>
                </div>
              </div>
              
              {/* Chat Area */}
              <div className="flex-1 overflow-y-auto p-6" style={{ backgroundColor: '#F9FAFB' }}>
                {aiMessages.length === 0 && (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">🤖</div>
                    <h4 className="text-xl font-bold mb-3" style={{ color: '#111827' }}>
                      Smart Financial Assistant
                    </h4>
                    <p className="mb-8 text-lg" style={{ color: '#6B7280' }}>
                      Get instant advice or export for Claude Pro analysis
                    </p>
                    <div className="flex flex-wrap gap-4 justify-center">
                      <button 
                        onClick={() => handleSmartAdvice('budget')}
                        className="px-6 py-3 rounded-xl text-base font-semibold shadow-lg transition-all duration-200"
                        style={{ backgroundColor: '#3B82F6', color: '#ffffff' }}
                        onMouseOver={(e) => e.target.style.backgroundColor = '#2563EB'}
                        onMouseOut={(e) => e.target.style.backgroundColor = '#3B82F6'}
                      >
                        💰 Budget Tips
                      </button>
                      <button 
                        onClick={() => handleSmartAdvice('savings')}
                        className="px-6 py-3 rounded-xl text-base font-semibold shadow-lg transition-all duration-200"
                        style={{ backgroundColor: '#10B981', color: '#ffffff' }}
                        onMouseOver={(e) => e.target.style.backgroundColor = '#059669'}
                        onMouseOut={(e) => e.target.style.backgroundColor = '#10B981'}
                      >
                        🏦 Save Money
                      </button>
                      <button 
                        onClick={() => handleSmartAdvice('trends')}
                        className="px-6 py-3 rounded-xl text-base font-semibold shadow-lg transition-all duration-200"
                        style={{ backgroundColor: '#8B5CF6', color: '#ffffff' }}
                        onMouseOver={(e) => e.target.style.backgroundColor = '#7C3AED'}
                        onMouseOut={(e) => e.target.style.backgroundColor = '#8B5CF6'}
                      >
                        📊 Spending Trends
                      </button>
                    </div>
                  </div>
                )}
                
                <div className="space-y-4">
                  {aiMessages.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div 
                        className="max-w-xs lg:max-w-md px-4 py-3 rounded-2xl"
                        style={msg.type === 'user' 
                          ? { backgroundColor: '#3B82F6', color: '#ffffff' }
                          : { backgroundColor: '#ffffff', color: '#111827', border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }
                        }
                      >
                        <div className="text-xs font-semibold mb-1" style={{ opacity: 0.75 }}>
                          {msg.type === 'user' ? '👤 You' : '🤖 AI Assistant'}
                        </div>
                        <div className="whitespace-pre-wrap">{msg.content}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Footer */}
              <div className="border-t px-6 py-4 rounded-b-xl" style={{ backgroundColor: '#ffffff', borderColor: '#E5E7EB' }}>
                <div className="space-y-3">
                  <button
                    onClick={() => {
                      const prompt = generateAIPrompt();
                      navigator.clipboard.writeText(prompt);
                      setAIMessages([...aiMessages, 
                        { type: 'ai', content: '📋 Financial analysis prompt copied to clipboard! Paste this into Claude Pro for detailed insights.' }
                      ]);
                    }}
                    className="w-full py-3 rounded-lg font-semibold text-lg shadow-lg transition-all duration-200"
                    style={{ backgroundColor: '#8B5CF6', color: '#ffffff' }}
                    onMouseOver={(e) => e.target.style.backgroundColor = '#7C3AED'}
                    onMouseOut={(e) => e.target.style.backgroundColor = '#8B5CF6'}
                  >
                    📋 Copy Claude Pro Analysis Prompt
                  </button>
                  <div className="flex gap-3">
                    <input
                      type="text"
                      value={aiInput}
                      onChange={(e) => setAIInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSmartAdvice(aiInput)}
                      className="flex-1 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      style={{ 
                        border: '2px solid #D1D5DB',
                        backgroundColor: '#ffffff',
                        color: '#111827'
                      }}
                      placeholder="Ask about budget, savings, or trends..."
                    />
                    <button
                      onClick={() => {handleSmartAdvice(aiInput); setAIInput('');}}
                      className="px-6 py-2 rounded-lg font-semibold transition-colors"
                      style={{ backgroundColor: '#3B82F6', color: '#ffffff' }}
                      onMouseOver={(e) => e.target.style.backgroundColor = '#2563EB'}
                      onMouseOut={(e) => e.target.style.backgroundColor = '#3B82F6'}
                    >
                      Ask 🚀
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Settings Modal - FIXED CONTRAST */}
        {showSettings && (
          <div 
            className="fixed inset-0 flex items-center justify-center p-4"
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 10000,
              backgroundColor: 'rgba(0, 0, 0, 0.7)'
            }}
          >
            <div 
              className="rounded-xl shadow-2xl w-full max-w-lg mx-auto"
              style={{
                backgroundColor: '#ffffff',
                maxWidth: '500px',
                width: '95%',
                maxHeight: '90vh',
                overflow: 'auto'
              }}
            >
              {/* Header */}
              <div 
                className="px-6 py-4 rounded-t-xl"
                style={{ backgroundColor: '#6B7280', color: '#ffffff' }}
              >
                <div className="flex justify-between items-center">
                  <h3 className="text-xl font-bold" style={{ color: '#ffffff' }}>⚙️ Settings & Data</h3>
                  <button
                    onClick={() => setShowSettings(false)}
                    className="font-bold w-8 h-8 flex items-center justify-center rounded-full hover:bg-white hover:bg-opacity-20 transition-colors"
                    style={{ color: '#ffffff', fontSize: '24px' }}
                  >
                    ×
                  </button>
                </div>
              </div>
              
              {/* Content */}
              <div className="p-6 space-y-6" style={{ backgroundColor: '#ffffff' }}>
                {/* Google Drive Connection */}
                {GOOGLE_CLIENT_ID && GOOGLE_API_KEY ? (
                  <div className="rounded-xl p-5" style={{ border: '2px solid #DBEAFE', backgroundColor: '#EFF6FF' }}>
                    <h4 className="font-bold mb-3 text-lg" style={{ color: '#1E40AF' }}>☁️ Cloud Sync</h4>
                    {isSignedIn ? (
                      <div className="space-y-3">
                        <div className="flex items-center gap-3" style={{ color: '#059669' }}>
                          <Cloud className="h-5 w-5" />
                          <span className="font-semibold">Connected to Google Drive</span>
                        </div>
                        <div 
                          className="text-sm p-3 rounded-lg" 
                          style={{ backgroundColor: '#ffffff', color: '#374151' }}
                        >
                          ✅ Data automatically syncs across all your devices
                        </div>
                        <button
                          onClick={signOutFromGoogle}
                          className="w-full py-3 rounded-lg font-semibold transition-colors"
                          style={{ backgroundColor: '#F3F4F6', color: '#374151' }}
                          onMouseOver={(e) => e.target.style.backgroundColor = '#E5E7EB'}
                          onMouseOut={(e) => e.target.style.backgroundColor = '#F3F4F6'}
                        >
                          Disconnect
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex items-center gap-3" style={{ color: '#6B7280' }}>
                          <CloudOff className="h-5 w-5" />
                          <span>Using local storage only</span>
                        </div>
                        <button
                          onClick={signInToGoogle}
                          className="w-full py-3 rounded-lg font-semibold shadow-lg transition-all duration-200"
                          style={{ backgroundColor: '#3B82F6', color: '#ffffff' }}
                          onMouseOver={(e) => e.target.style.backgroundColor = '#2563EB'}
                          onMouseOut={(e) => e.target.style.backgroundColor = '#3B82F6'}
                        >
                          Connect Google Drive
                        </button>
                        <p className="text-xs text-center" style={{ color: '#6B7280' }}>
                          Sync your data across devices securely
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="rounded-xl p-5" style={{ border: '2px solid #FDE68A', backgroundColor: '#FFFBEB' }}>
                    <h4 className="font-bold mb-3 text-lg" style={{ color: '#92400E' }}>☁️ Cloud Sync Setup</h4>
                    <p className="text-sm mb-3" style={{ color: '#6B7280' }}>
                      To enable Google Drive sync, add your credentials to the .env file:
                    </p>
                    <div 
                      className="p-3 rounded-lg text-xs font-mono"
                      style={{ backgroundColor: '#F3F4F6', color: '#374151' }}
                    >
                      VITE_GOOGLE_CLIENT_ID=your-client-id<br/>
                      VITE_GOOGLE_API_KEY=your-api-key
                    </div>
                  </div>
                )}

                {/* Data Management */}
                <div className="rounded-xl p-5" style={{ border: '2px solid #D1FAE5', backgroundColor: '#ECFDF5' }}>
                  <h4 className="font-bold mb-3 text-lg" style={{ color: '#047857' }}>💾 Data Management</h4>
                  <div className="space-y-3">
                    <button
                      onClick={exportData}
                      className="w-full py-3 rounded-lg font-semibold shadow-lg transition-all duration-200 flex items-center justify-center gap-2"
                      style={{ backgroundColor: '#10B981', color: '#ffffff' }}
                      onMouseOver={(e) => e.target.style.backgroundColor = '#059669'}
                      onMouseOut={(e) => e.target.style.backgroundColor = '#10B981'}
                    >
                      <Download className="h-5 w-5" />
                      Export Data
                    </button>
                    <label 
                      className="w-full py-3 rounded-lg font-semibold cursor-pointer shadow-lg transition-all duration-200 flex items-center justify-center gap-2"
                      style={{ backgroundColor: '#3B82F6', color: '#ffffff' }}
                      onMouseOver={(e) => e.target.style.backgroundColor = '#2563EB'}
                      onMouseOut={(e) => e.target.style.backgroundColor = '#3B82F6'}
                    >
                      <Upload className="h-5 w-5" />
                      Import Data
                      <input
                        type="file"
                        accept=".json"
                        onChange={importData}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                {/* App Info */}
                <div className="rounded-xl p-5" style={{ border: '2px solid #E9D5FF', backgroundColor: '#FAF5FF' }}>
                  <h4 className="font-bold mb-3 text-lg" style={{ color: '#7C2D12' }}>ℹ️ App Info</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <span style={{ color: '#10B981' }}>•</span>
                      <span style={{ color: '#374151' }}>Free personal finance tracker</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span style={{ color: '#10B981' }}>•</span>
                      <span style={{ color: '#374151' }}>
                        {isSignedIn ? 'Data synced with Google Drive' : 'Data stored locally'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span style={{ color: '#10B981' }}>•</span>
                      <span style={{ color: '#374151' }}>Export data for AI analysis with Claude Pro</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span style={{ color: '#10B981' }}>•</span>
                      <span style={{ color: '#374151' }}>Works offline with automatic sync</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span style={{ color: '#10B981' }}>•</span>
                      <span className="font-semibold" style={{ color: '#111827' }}>
                        {expenses.length} transactions tracked
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default FinanceApp;