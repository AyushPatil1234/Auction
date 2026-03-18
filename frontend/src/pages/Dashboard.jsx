import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useWeb3 } from '../context/Web3Context';
import { ethers } from 'ethers';
import { LayoutDashboard, ShoppingBag, Gavel, FileX } from 'lucide-react';

const Dashboard = () => {
  const { contract, account } = useWeb3();
  
  const [myAuctions, setMyAuctions] = useState([]);
  const [myBids, setMyBids] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (contract && account) {
      fetchUserActivity();
    }
  }, [contract, account]);

  const fetchUserActivity = async () => {
    try {
      setLoading(true);
      const data = await contract.getAuctions();
      
      const userAuctions = [];
      const userBids = [];
      
      // Since evaluating mapping directly from array is hard in Ethers v6 without events,
      // we approximate active bids by checking if user is current highest bidder.
      // (For a production system, an Event indexer like The Graph is recommended).
      
      for (let item of data) {
        const auctionId = item.id.toString();
        const formattedItem = {
          id: auctionId,
          creator: item.creator,
          itemName: item.itemName,
          startingPrice: ethers.formatEther(item.startingPrice),
          highestBid: ethers.formatEther(item.highestBid),
          highestBidder: item.highestBidder,
          endTime: Number(item.endTime) * 1000,
          ended: item.ended
        };
        
        if (item.creator.toLowerCase() === account.toLowerCase()) {
          userAuctions.push(formattedItem);
        }
        
        if (item.highestBidder.toLowerCase() === account.toLowerCase()) {
          userBids.push(formattedItem);
        }
        
        // Also check if they have pending returns
        if (item.creator.toLowerCase() !== account.toLowerCase() && item.highestBidder.toLowerCase() !== account.toLowerCase()) {
           try {
              const pending = await contract.pendingReturns(auctionId, account);
              if (pending > 0n) {
                 formattedItem.pendingReturn = ethers.formatEther(pending);
                 if(!userBids.find(i => i.id === auctionId)) {
                    userBids.push(formattedItem);
                 }
              }
           } catch(e) { /* ignore */ }
        }
      }
      
      setMyAuctions(userAuctions);
      setMyBids(userBids);
      
    } catch (err) {
      console.error("Error fetching user activity:", err);
    } finally {
      setLoading(false);
    }
  };

  const getStatus = (auction) => {
    const isExpired = Date.now() >= auction.endTime;
    if (auction.ended) return <span className="text-slate-400 font-medium">Completed</span>;
    if (isExpired) return <span className="text-orange-400 font-medium">Pending Settle</span>;
    return <span className="text-emerald-400 font-medium glow-emerald">Live</span>;
  };

  if (!account) {
    return (
      <div className="text-center py-20 animate-in fade-in duration-500">
        <LayoutDashboard className="w-16 h-16 text-slate-600 mx-auto mb-4" />
        <h2 className="text-2xl font-bold mb-4">Dashboard Unavailable</h2>
        <p className="text-slate-400 mb-6">Connect your wallet to view your auctions and bids.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="w-full animate-in fade-in slide-in-from-bottom-8 duration-700 space-y-12">
      
      <div className="flex items-center gap-4 border-b border-slate-700/50 pb-6">
        <div className="w-12 h-12 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center justify-center">
          <LayoutDashboard className="text-blue-400 w-6 h-6" />
        </div>
        <div>
          <h1 className="text-3xl font-extrabold text-white">Your Dashboard</h1>
          <p className="text-slate-400">Manage your created auctions and track your active bids.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* My Auctions Panel */}
        <div className="glass-panel p-6 rounded-2xl flex flex-col h-full">
          <div className="flex items-center gap-3 mb-6">
            <ShoppingBag className="w-6 h-6 text-purple-400" />
            <h2 className="text-xl font-bold">My Created Auctions</h2>
          </div>
          
          {myAuctions.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-10 text-slate-500 border-2 border-dashed border-slate-700 rounded-xl">
              <FileX className="w-10 h-10 mb-2 opacity-50" />
              <p>You haven't created any auctions yet.</p>
              <Link to="/create" className="text-blue-400 hover:text-blue-300 mt-2 text-sm font-medium">Create one now</Link>
            </div>
          ) : (
            <div className="space-y-4 flex-1">
              {myAuctions.map(auction => (
                <Link 
                  key={`auc-${auction.id}`} 
                  to={`/auction/${auction.id}`}
                  className="flex items-center justify-between p-4 rounded-xl bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700 transition-colors"
                >
                  <div className="min-w-0 pr-4">
                    <h3 className="font-bold text-white truncate">{auction.itemName}</h3>
                    <div className="text-sm text-slate-400 mt-1 flex gap-4">
                      <span>Highest: <span className="text-white font-medium">{Number(auction.highestBid) > 0 ? auction.highestBid : auction.startingPrice} ETH</span></span>
                    </div>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <div className="text-sm mb-1">{getStatus(auction)}</div>
                    <div className="text-xs text-slate-500 font-mono">ID: #{auction.id}</div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* My Bids Panel */}
        <div className="glass-panel p-6 rounded-2xl flex flex-col h-full border-blue-500/10">
          <div className="flex items-center gap-3 mb-6">
            <Gavel className="w-6 h-6 text-blue-400" />
            <h2 className="text-xl font-bold">My Active Bids & Returns</h2>
          </div>
          
          {myBids.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-10 text-slate-500 border-2 border-dashed border-slate-700 rounded-xl">
              <FileX className="w-10 h-10 mb-2 opacity-50" />
              <p>You haven't participated in any auctions.</p>
              <Link to="/" className="text-blue-400 hover:text-blue-300 mt-2 text-sm font-medium">Browse live auctions</Link>
            </div>
          ) : (
            <div className="space-y-4 flex-1">
              {myBids.map(auction => {
                const isWinning = auction.highestBidder.toLowerCase() === account.toLowerCase();
                const hasReturn = !!auction.pendingReturn;
                
                return (
                <Link 
                  key={`bid-${auction.id}`} 
                  to={`/auction/${auction.id}`}
                  className={`flex items-center justify-between p-4 rounded-xl border transition-colors ${
                    isWinning 
                      ? 'bg-blue-900/20 border-blue-500/30 hover:bg-blue-900/40' 
                      : 'bg-slate-800/50 border-slate-700 hover:bg-slate-700/50'
                  }`}
                >
                  <div className="min-w-0 pr-4">
                    <h3 className="font-bold text-white truncate">{auction.itemName}</h3>
                    
                    <div className="text-sm mt-1 flex flex-wrap gap-x-4 gap-y-1">
                      {isWinning ? (
                        <span className="text-blue-400 font-medium text-xs bg-blue-500/10 px-2 py-0.5 rounded flex items-center">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mr-1.5 animate-pulse"></span>
                          Winning ({auction.highestBid} ETH)
                        </span>
                      ) : hasReturn ? (
                        <span className="text-purple-400 font-medium text-xs bg-purple-500/10 px-2 py-0.5 rounded">
                          Outbid. Claim {auction.pendingReturn} ETH
                        </span>
                      ) : (
                        <span className="text-slate-400">Outbid</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex-shrink-0 text-right">
                    <div className="text-sm mb-1">{getStatus(auction)}</div>
                    <div className="text-xs text-slate-500 font-mono">ID: #{auction.id}</div>
                  </div>
                </Link>
              )})}
            </div>
          )}
        </div>
        
      </div>
    </div>
  );
};

export default Dashboard;
