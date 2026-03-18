import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import CreateAuction from './pages/CreateAuction';
import AuctionDetails from './pages/AuctionDetails';
import Dashboard from './pages/Dashboard';
import { Web3Provider } from './context/Web3Context';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error("Caught by Error Boundary:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center p-8 bg-slate-900 text-white min-h-screen">
          <h1 className="text-3xl font-bold mb-4 text-red-500">Application Error</h1>
          <p className="text-slate-300 mb-6">An unexpected error occurred while rendering the page.</p>
          <div className="font-mono text-xs bg-black/50 p-4 rounded-xl max-w-2xl text-red-300 overflow-x-auto shadow-inner mb-6">
            {this.state.error && this.state.error.toString()}
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="px-6 py-2.5 bg-blue-600 font-medium text-white rounded-xl shadow-lg hover:bg-blue-500 transition-all"
          >
            Refresh Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function App() {
  return (
    <ErrorBoundary>
      <Web3Provider>
      <BrowserRouter>
        <div className="min-h-screen flex flex-col items-center bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-900 to-black">
          <div className="w-full max-w-7xl px-4 sm:px-6 lg:px-8 flex-grow">
            <Navbar />
            <main className="py-8 animate-in fade-in duration-500">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/create" element={<CreateAuction />} />
                <Route path="/auction/:id" element={<AuctionDetails />} />
                <Route path="/dashboard" element={<Dashboard />} />
              </Routes>
            </main>
          </div>
          <footer className="w-full py-6 mt-auto text-center text-slate-500 border-t border-slate-800 bg-slate-900/50 backdrop-blur-sm">
            <p>© {new Date().getFullYear()} Decentralized Auction DApp</p>
          </footer>
        </div>
      </BrowserRouter>
    </Web3Provider>
    </ErrorBoundary>
  );
}

export default App;
