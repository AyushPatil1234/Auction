import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useWeb3 } from '../context/Web3Context';
import { ethers } from 'ethers';
import { Clock, TrendingUp, ImageIcon, Gavel } from 'lucide-react';

const Home = () => {
  const { contract, account } = useWeb3();
  const [auctions, setAuctions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAuctions();
  }, [contract]);

  const fetchAuctions = async () => {
    if (!contract) return;
    try {
      setLoading(true);
      const data = await contract.getAuctions();
      
      const formattedAuctions = data.map((item) => ({
        id: item.id.toString(),
        creator: item.creator,
        itemName: item.itemName,
        itemDescription: item.itemDescription,
        itemImage: item.itemImage,
        startingPrice: ethers.formatEther(item.startingPrice),
        highestBid: ethers.formatEther(item.highestBid),
        highestBidder: item.highestBidder,
        endTime: Number(item.endTime) * 1000, // Convert to JS ms timestamp
        ended: item.ended
      }));
      
      // Sort by active first, then by closest end time
      formattedAuctions.sort((a, b) => {
        if (a.ended !== b.ended) return a.ended ? 1 : -1;
        return a.endTime - b.endTime;
      });
      
      setAuctions(formattedAuctions);
    } catch (err) {
      console.error("Error fetching auctions:", err);
    } finally {
      setLoading(false);
    }
  };

  const getTimeLeft = (endTime) => {
    const now = Date.now();
    const distance = endTime - now;
    
    if (distance < 0) return "Ended";
    
    const days = Math.floor(distance / (1000 * 60 * 60 * 24));
    const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  if (loading && contract) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-slate-400">Loading auctions from blockchain...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
      
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 mb-2">
            Live Digital Auctions
          </h1>
          <p className="text-slate-400 text-lg">
            Discover, bid, and win exclusive decentralized items securely.
          </p>
        </div>
        
        {account ? (
          <Link to="/create" className="btn-primary flex items-center gap-2 whitespace-nowrap">
            Create Auction
          </Link>
        ) : (
          <div className="text-sm px-4 py-2 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-400">
            Connect wallet to bid or create items
          </div>
        )}
      </div>

      {!contract ? (
        <div className="glass-panel p-12 text-center rounded-2xl border-dashed border-2 border-slate-700">
          <h3 className="text-2xl font-bold mb-2">Wallet Disconnected</h3>
          <p className="text-slate-400 mb-6 max-w-md mx-auto">
            Please connect your MetaMask wallet using the button in the top right to view and interact with the decentralized auctions.
          </p>
        </div>
      ) : auctions.length === 0 ? (
        <div className="glass-panel p-12 text-center rounded-2xl border-dashed border-2 border-slate-700">
          <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <Gavel className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-2xl font-bold mb-2">No active auctions</h3>
          <p className="text-slate-400 mb-6">Be the first to create a decentralized auction!</p>
          <Link to="/create" className="btn-primary inline-flex">Start Selling</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {auctions.map((auction) => (
            <Link 
              key={auction.id} 
              to={`/auction/${auction.id}`}
              className="glass-card rounded-2xl overflow-hidden group block"
            >
              {/* Image Container */}
              <div className="relative aspect-[4/3] bg-slate-900 overflow-hidden">
                {auction.itemImage ? (
                  <img 
                    src={auction.itemImage} 
                    alt={auction.itemName}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextElementSibling.style.display = 'flex';
                    }}
                  />
                ) : null}
                
                {/* Fallback Image */}
                <div 
                  className={`absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900 ${auction.itemImage ? 'hidden' : 'flex'}`}
                >
                  <ImageIcon className="w-12 h-12 text-slate-600 mb-2" />
                  <span className="text-slate-500 text-sm">No image available</span>
                </div>
                
                {/* Status Badge */}
                <div className="absolute top-3 right-3">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold shadow-lg backdrop-blur-md border ${
                    auction.ended || Date.now() >= auction.endTime 
                      ? 'bg-red-500/20 text-red-400 border-red-500/30' 
                      : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                  }`}>
                    {auction.ended || Date.now() >= auction.endTime ? 'Ended' : 'Live'}
                  </span>
                </div>
              </div>

              {/* Content */}
              <div className="p-5">
                <h3 className="text-xl font-bold text-white mb-2 truncate group-hover:text-blue-400 transition-colors">
                  {auction.itemName}
                </h3>
                
                <div className="flex justify-between items-end mt-4 pt-4 border-t border-slate-700/50">
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">
                      {Number(auction.highestBid) > 0 ? 'Current Bid' : 'Starting Price'}
                    </p>
                    <div className="flex items-center text-white font-bold">
                      <TrendingUp className="w-4 h-4 text-blue-500 mr-1" />
                      {Number(auction.highestBid) > 0 ? auction.highestBid : auction.startingPrice} ETH
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Time Left</p>
                    <div className="flex items-center text-slate-300 font-mono text-sm">
                      <Clock className="w-3.5 h-3.5 mr-1 text-slate-400" />
                      {getTimeLeft(auction.endTime)}
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default Home;
