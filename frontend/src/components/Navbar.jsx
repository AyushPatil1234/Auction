import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useWeb3 } from '../context/Web3Context';
import { Wallet, PlusCircle, Gavel, LayoutDashboard } from 'lucide-react';

const Navbar = () => {
  const { account, connectWallet, isConnecting } = useWeb3();
  const location = useLocation();

  const navLinks = [
    { name: 'Auctions', path: '/', icon: <Gavel className="w-4 h-4 mr-2" /> },
    { name: 'Create', path: '/create', icon: <PlusCircle className="w-4 h-4 mr-2" /> },
    { name: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard className="w-4 h-4 mr-2" /> },
  ];

  const formatAddress = (addr) => {
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  return (
    <nav className="sticky top-0 z-50 py-4 mb-8">
      <div className="glass-panel rounded-2xl px-6 py-4 flex items-center justify-between shadow-blue-900/10">
        
        {/* Logo/Brand */}
        <Link to="/" className="flex items-center group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-violet-600 flex items-center justify-center mr-3 shadow-lg group-hover:shadow-blue-500/50 transition-all duration-300">
            <Gavel className="text-white w-6 h-6" />
          </div>
          <span className="text-xl font-bold text-gradient hidden sm:block">DecentralAuction</span>
        </Link>
        
        {/* Navigation Links */}
        <div className="hidden md:flex space-x-1 border border-slate-700/50 bg-slate-800/50 rounded-lg p-1">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-all ${
                location.pathname === link.path
                  ? 'bg-slate-700/80 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700/40'
              }`}
            >
              {link.icon}
              {link.name}
            </Link>
          ))}
        </div>

        {/* Connect Wallet Button */}
        <div>
          {account ? (
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-xs text-slate-400">Connected as</span>
                <span className="text-sm font-semibold text-white bg-slate-800/80 px-3 py-1 rounded-full border border-slate-700">
                  {formatAddress(account)}
                </span>
              </div>
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-green-400 to-emerald-600 p-0.5 shadow-lg shadow-green-500/20">
                 <div className="w-full h-full bg-slate-900 rounded-full flex items-center justify-center">
                    <Wallet className="w-5 h-5 text-green-400" />
                 </div>
              </div>
            </div>
          ) : (
            <button
              onClick={connectWallet}
              disabled={isConnecting}
              className="btn-primary flex items-center gap-2 relative overflow-hidden group"
            >
              {/* Shine effect */}
              <div className="absolute inset-0 w-full h-full bg-white/20 translate-x-[-100%] skew-x-[-20deg] group-hover:animate-[shine_1.5s_ease-out_infinite]" />
              
              <Wallet className="w-5 h-5" />
              <span>{isConnecting ? 'Connecting...' : 'Connect Wallet'}</span>
            </button>
          )}
        </div>
      </div>
      
      {/* Mobile Navigation (Bottom Bar style or simple row) */}
      <div className="md:hidden flex justify-center mt-4">
         <div className="flex space-x-2 w-full justify-between glass-panel p-2 rounded-xl">
           {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`flex flex-col items-center justify-center p-2 rounded-lg flex-1 text-xs transition-all ${
                  location.pathname === link.path
                    ? 'bg-blue-600/20 text-blue-400'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="mb-1">{link.icon}</div>
                {link.name}
              </Link>
            ))}
         </div>
      </div>
    </nav>
  );
};

export default Navbar;
