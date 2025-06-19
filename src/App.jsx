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

  // Sample data for demonstration
  useEffect(() => {
    const savedExpenses = localStorage.getItem('financeAI_expenses');
    if (savedExpenses) {
      setExpenses(JSON.parse(savedExpenses));
    } else {
      const sampleExpenses = [
        { id: 1, amount: 25.50, category: 'Food', description: 'Lunch at cafe', date: '2025-06-10' },
        { id: 2, amount: 15.00, category: 'Transportation', description: 'Uber ride', date: '2025-06-11' },
        { id: 3, amount: 50.00, category: 'Entertainment', description: 'Movie tickets', date: '2025-06-12' },
        { id: 4, amount: 120.00, category: 'Bills', description: 'Internet bill', date: '2025-06-13' },
      ];
      setExpenses(sampleExpenses);
      localStorage.setItem('financeAI_expenses', JSON.stringify(sampleExpenses));
    }
  }, []);

  const saveToLocalStorage = (expensesData) => {
    localStorage.setItem('financeAI_expenses', JSON.stringify(expensesData));
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
      saveToLocalStorage(updatedExpenses);
      
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
    saveToLocalStorage(updatedExpenses);
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

  const importData = (event) => {
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
          saveToLocalStorage(mergedExpenses);
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
1. Budget recommendations
2. Spending pattern analysis  
3. Areas to reduce expenses
4. Saving strategies
5. Financial health assessment`;
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

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-start mb-4">
            <h1 className="text-3xl font-bold text-gray-800">Personal Finance AI</h1>
            <div className="flex items-center gap-2">
              {isSignedIn ? (
                <div className="flex items-center gap-2 text-green-600">
                  <Cloud className="h-5 w-5" />
                  <span className="text-sm">Synced</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-gray-500">
                  <CloudOff className="h-5 w-5" />
                  <span className="text-sm">Local</span>
                </div>
              )}
              <button
                onClick={() => setShowSettings(true)}
                className="p-2 text-gray-500 hover:text-gray-700"
              >
                <Settings className="h-5 w-5" />
              </button>
            </div>
          </div>

          {lastSync && (
            <p className="text-sm text-gray-500 mb-4">
              Last synced: {lastSync.toLocaleString()}
            </p>
          )}
          
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
              onClick={() => {
                console.log('Add Expense clicked!'); 
                setShowAddForm(true);
              }}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition-colors"
            >
              <PlusCircle className="h-5 w-5" />
              Add Expense
            </button>
            <button
              onClick={() => {
                console.log('AI Assistant clicked!'); 
                setShowAIChat(true);
              }}
              className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-green-700 transition-colors"
            >
              <MessageCircle className="h-5 w-5" />
              AI Assistant
            </button>
          </div>
          
          {/* Debug Info */}
          <div className="mt-4 text-sm text-gray-500">
            Debug: Add Form: {showAddForm ? 'OPEN' : 'CLOSED'} | AI Chat: {showAIChat ? 'OPEN' : 'CLOSED'}
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

        {/* Add Expense Modal */}
        {showAddForm && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4"
            style={{ 
              position: 'fixed', 
              top: 0, 
              left: 0, 
              right: 0, 
              bottom: 0, 
              zIndex: 9999,
              backgroundColor: 'rgba(0, 0, 0, 0.8)'
            }}
          >
            <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-2xl">
              <h3 className="text-lg font-semibold mb-4">Add New Expense</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newExpense.amount}
                    onChange={(e) => setNewExpense({...newExpense, amount: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select
                    value={newExpense.category}
                    onChange={(e) => setNewExpense({...newExpense, category: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <input
                    type="text"
                    value={newExpense.description}
                    onChange={(e) => setNewExpense({...newExpense, description: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="What did you spend on?"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                  <input
                    type="date"
                    value={newExpense.date}
                    onChange={(e) => setNewExpense({...newExpense, date: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={addExpense}
                    className="flex-1 bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition-colors"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Saving...' : 'Add Expense'}
                  </button>
                  <button
                    onClick={() => setShowAddForm(false)}
                    className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-md hover:bg-gray-400 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* AI Chat Modal */}
        {showAIChat && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4"
            style={{ 
              position: 'fixed', 
              top: 0, 
              left: 0, 
              right: 0, 
              bottom: 0, 
              zIndex: 9999,
              backgroundColor: 'rgba(0, 0, 0, 0.8)'
            }}
          >
            <div className="bg-white rounded-lg p-6 w-full max-w-4xl h-5/6 flex flex-col shadow-2xl">
              <div className="flex justify-between items-center mb-4 border-b pb-4">
                <h3 className="text-xl font-bold text-gray-800">🤖 AI Financial Assistant</h3>
                <button
                  onClick={() => {
                    console.log('Closing AI Chat');
                    setShowAIChat(false);
                  }}
                  className="text-gray-500 hover:text-gray-700 text-2xl px-3 py-1 hover:bg-gray-100 rounded"
                >
                  ✕
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto mb-4 space-y-3 border rounded-lg p-4 bg-gray-50">
                {aiMessages.length === 0 && (
                  <div className="text-gray-600 text-center py-8">
                    <h4 className="font-semibold mb-3 text-lg">💡 Smart Financial Assistant</h4>
                    <p className="text-sm mb-6">Get instant advice or export for Claude Pro analysis</p>
                    <div className="flex flex-wrap gap-3 justify-center">
                      <button 
                        onClick={() => {
                          console.log('Budget tips clicked');
                          handleSmartAdvice('budget');
                        }}
                        className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 transition-colors shadow"
                      >
                        💰 Budget Tips
                      </button>
                      <button 
                        onClick={() => {
                          console.log('Savings tips clicked');
                          handleSmartAdvice('savings');
                        }}
                        className="px-4 py-2 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600 transition-colors shadow"
                      >
                        🏦 Save Money
                      </button>
                      <button 
                        onClick={() => {
                          console.log('Trends clicked');
                          handleSmartAdvice('trends');
                        }}
                        className="px-4 py-2 bg-purple-500 text-white rounded-lg text-sm hover:bg-purple-600 transition-colors shadow"
                      >
                        📊 Spending Trends
                      </button>
                    </div>
                  </div>
                )}
                {aiMessages.map((msg, idx) => (
                  <div key={idx} className={`p-4 rounded-lg shadow-sm ${msg.type === 'user' ? 'bg-blue-100 ml-8 border-l-4 border-blue-500' : 'bg-white mr-8 border-l-4 border-green-500'}`}>
                    <div className="text-sm font-semibold text-gray-700 mb-2">
                      {msg.type === 'user' ? '👤 You' : '🤖 AI Assistant'}
                    </div>
                    <div className="whitespace-pre-wrap text-gray-800">{msg.content}</div>
                  </div>
                ))}
              </div>
              
              <div className="space-y-3 border-t pt-4">
                <button
                  onClick={() => {
                    const prompt = generateAIPrompt();
                    navigator.clipboard.writeText(prompt);
                    setAIMessages([...aiMessages, 
                      { type: 'ai', content: '📋 Financial analysis prompt copied to clipboard! Paste this into Claude Pro for detailed insights.' }
                    ]);
                    console.log('Claude Pro prompt copied!');
                  }}
                  className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 rounded-lg hover:from-purple-700 hover:to-blue-700 transition-colors font-semibold shadow-lg"
                >
                  📋 Copy Claude Pro Analysis Prompt
                </button>
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={aiInput}
                    onChange={(e) => setAIInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSmartAdvice(aiInput)}
                    className="flex-1 border-2 border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Ask: budget, savings, or trends..."
                  />
                  <button
                    onClick={() => {
                      console.log('Ask button clicked with:', aiInput);
                      handleSmartAdvice(aiInput); 
                      setAIInput('');
                    }}
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors font-semibold shadow"
                  >
                    Ask
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Settings Modal */}
        {showSettings && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Settings & Data</h3>
                <button
                  onClick={() => setShowSettings(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
              
              <div className="space-y-4">
                {/* Data Management */}
                <div className="border rounded-lg p-4">
                  <h4 className="font-medium mb-2">Data Management</h4>
                  <div className="space-y-2">
                    <button
                      onClick={exportData}
                      className="w-full bg-green-600 text-white py-2 rounded-md hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                    >
                      <Download className="h-4 w-4" />
                      Export Data
                    </button>
                    <label className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 cursor-pointer">
                      <Upload className="h-4 w-4" />
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
                <div className="border rounded-lg p-4">
                  <h4 className="font-medium mb-2">App Info</h4>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p>• Free personal finance tracker</p>
                    <p>• Data stored locally with export/import</p>
                    <p>• Export data for AI analysis with Claude Pro</p>
                    <p>• Works offline - no internet required</p>
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