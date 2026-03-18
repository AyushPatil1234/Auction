import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useWeb3 } from '../context/Web3Context';
import { ethers } from 'ethers';
import { Clock, TrendingUp, User, HandCoins, AlertCircle, RefreshCw } from 'lucide-react';

const AuctionDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { contract, account } = useWeb3();
  
  const [auction, setAuction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [bidAmount, setBidAmount] = useState('');
  const [isBidding, setIsBidding] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [pendingReturn, setPendingReturn] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    // Update "now" every second for countdown timer
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (contract) {
      fetchAuctionDetails();
      checkPendingReturns();
    }
  }, [contract, id, account]);

  const fetchAuctionDetails = async () => {
    try {
      setLoading(true);
      setError('');
      
      const data = await contract.getAuction(id);
      
      setAuction({
        id: data.id.toString(),
        creator: data.creator,
        itemName: data.itemName,
        itemDescription: data.itemDescription,
        itemImage: data.itemImage,
        startingPrice: ethers.formatEther(data.startingPrice),
        highestBid: ethers.formatEther(data.highestBid),
        highestBidder: data.highestBidder,
        endTime: Number(data.endTime) * 1000,
        ended: data.ended
      });
      
    } catch (err) {
      console.error("Error fetching auction details:", err);
      setError("Failed to load auction details. It might not exist.");
    } finally {
      setLoading(false);
    }
  };

  const checkPendingReturns = async () => {
    if (!contract || !account) return;
    try {
      const amount = await contract.pendingReturns(id, account);
      setPendingReturn(Number(ethers.formatEther(amount)));
    } catch (err) {
      console.error("Error checking pending returns:", err);
    }
  };

  const handleBid = async (e) => {
    e.preventDefault();
    if (!contract || !account) {
      setError("Please connect wallet first");
      return;
    }
    
    setError('');
    setSuccess('');
    
    try {
      setIsBidding(true);
      const value = ethers.parseEther(bidAmount);
      
      const tx = await contract.bid(id, { value });
      await tx.wait();
      
      setSuccess("Bid placed successfully!");
      setBidAmount('');
      
      // Refresh data
      await fetchAuctionDetails();
      await checkPendingReturns();
      
    } catch (err) {
      console.error("Bidding failed:", err);
      const reason = err.reason || (err.data && err.data.message) || err.message;
      setError(`Failed to bid: ${reason}`);
    } finally {
      setIsBidding(false);
    }
  };

  const handleEndAuction = async () => {
    if (!contract || !account) return;
    try {
      setIsEnding(true);
      setError('');
      
      const tx = await contract.endAuction(id);
      await tx.wait();
      
      setSuccess("Auction ended and funds transferred successfully!");
      await fetchAuctionDetails();
      
    } catch (err) {
      console.error("Ending auction failed:", err);
      const reason = err.reason || (err.data && err.data.message) || err.message;
      setError(`Failed to end auction: ${reason}`);
    } finally {
      setIsEnding(false);
    }
  };

  const handleWithdraw = async () => {
    if (!contract || !account) return;
    try {
      setIsWithdrawing(true);
      setError('');
      
      const tx = await contract.withdraw(id);
      await tx.wait();
      
      setSuccess("Outbid funds withdrawn successfully!");
      await checkPendingReturns();
      
    } catch (err) {
      console.error("Withdrawal failed:", err);
      const reason = err.reason || (err.data && err.data.message) || err.message;
      setError(`Failed to withdraw: ${reason}`);
    } finally {
      setIsWithdrawing(false);
    }
  };

  const formatAddress = (addr) => {
    if (addr === ethers.ZeroAddress) return "No bids yet";
    if (addr.toLowerCase() === account?.toLowerCase()) return "You (Connected Account)";
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  const formatTimeLeft = (endTime) => {
    const distance = endTime - now;
    if (distance < 0) return "Auction Ended";
    
    const days = Math.floor(distance / (1000 * 60 * 60 * 24));
    const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((distance % (1000 * 60)) / 1000);
    
    return `${days}d ${hours}h ${minutes}m ${seconds}s`;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!auction) {
    return (
      <div className="text-center py-20">
        <AlertCircle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold">Auction Not Found</h2>
        <button onClick={() => navigate('/')} className="btn-secondary mt-6">Return to Home</button>
      </div>
    );
  }

  const isEndedOrExpired = auction.ended || now >= auction.endTime;
  const isCreator = account?.toLowerCase() === auction.creator.toLowerCase();

  return (
    <div className="max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-6 duration-700">
      
      {/* Header Controls */}
      <div className="mb-6 flex items-center justify-between">
        <button onClick={() => navigate('/')} className="text-slate-400 hover:text-white transition-colors flex items-center text-sm font-medium">
          ← Back to Auctions
        </button>
        <div className="flex gap-2">
           <button onClick={fetchAuctionDetails} className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors" title="Refresh">
             <RefreshCw className="w-4 h-4" />
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 relative">
        
        {/* Left Column: Image Area */}
        <div className="glass-panel p-2 rounded-3xl overflow-hidden aspect-square relative shadow-2xl flex items-center justify-center bg-slate-900 border-slate-700/50">
          {auction.itemImage ? (
             <img 
               src={auction.itemImage} 
               alt={auction.itemName}
               className="w-full h-full object-cover rounded-[22px]"
               onError={(e) => { e.target.style.display = 'none'; e.target.nextElementSibling.style.display = 'block'; }}
             />
          ) : null}
          <div className={`${auction.itemImage ? 'hidden' : 'block'} text-center px-4`}>
             <span className="text-slate-500 font-mono">NO IMAGE SPECIFIED</span>
             <h2 className="text-3xl font-bold text-slate-700 mt-2 break-words">{auction.itemName}</h2>
          </div>
          
          {/* Status Overlay Badge */}
          <div className="absolute top-6 right-6">
            <span className={`px-4 py-2 rounded-full text-sm font-bold shadow-2xl backdrop-blur-md border border-white/10 ${
              auction.ended ? 'bg-red-500/80 text-white' 
              : now >= auction.endTime ? 'bg-orange-500/80 text-white'
              : 'bg-emerald-500/80 text-white'
            }`}>
              {auction.ended ? 'Completed' : now >= auction.endTime ? 'Expired (Pending Settle)' : 'Live Auction'}
            </span>
          </div>
        </div>

        {/* Right Column: Details & Controls */}
        <div className="flex flex-col space-y-8">
          
          {/* Title and Descriptions */}
          <div>
            <h1 className="text-4xl lg:text-5xl font-extrabold text-white mb-4 tracking-tight">{auction.itemName}</h1>
            <p className="text-lg text-slate-400 leading-relaxed bg-slate-800/20 p-4 border-l-4 border-blue-500 rounded-r-lg">
              {auction.itemDescription}
            </p>
          </div>
          
          {/* Metadata Cards */}
          <div className="grid grid-cols-2 gap-4">
            <div className="glass-card p-4 rounded-xl">
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-2 flex items-center">
                <User className="w-3 h-3 mr-1" /> Creator
              </p>
              <p className="text-sm font-medium text-slate-300 truncate" title={auction.creator}>
                {formatAddress(auction.creator)}
              </p>
            </div>
            <div className="glass-card p-4 rounded-xl">
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-2 flex items-center">
                <Clock className="w-3 h-3 mr-1" /> Time Remaining
              </p>
              <p className={`text-sm font-mono font-bold ${isEndedOrExpired ? 'text-red-400' : 'text-blue-400'}`}>
                {formatTimeLeft(auction.endTime)}
              </p>
            </div>
          </div>

          {/* Current Bid Display */}
          <div className="glass-panel p-6 rounded-2xl border-blue-500/20 shadow-[0_0_30px_rgba(59,130,246,0.1)] relative overflow-hidden">
            {/* Background Glow */}
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-500/20 rounded-full blur-3xl pointer-events-none"></div>
            
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">
              {Number(auction.highestBid) > 0 ? 'Current Highest Bid' : 'Starting Price'}
            </h3>
            <div className="flex items-baseline gap-3 mb-2">
              <span className="text-4xl md:text-5xl font-black text-white">
                {Number(auction.highestBid) > 0 ? auction.highestBid : auction.startingPrice}
              </span>
              <span className="text-xl font-medium text-blue-400">ETH</span>
            </div>
            
            {Number(auction.highestBid) > 0 && (
              <p className="text-sm text-slate-400 flex items-center mt-4">
                <span className="w-2 h-2 rounded-full bg-green-500 mr-2 shadow-[0_0_8px_rgba(34,197,94,0.8)]"></span>
                Highest Bidder: <span className="text-white ml-2 font-mono bg-slate-800 px-2 py-0.5 rounded">{formatAddress(auction.highestBidder)}</span>
              </p>
            )}
          </div>

          {/* Action Area */}
          <div className="space-y-4 pt-4 border-t border-slate-700/50">
            {error && <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg text-sm">{error}</div>}
            {success && <div className="p-3 bg-green-500/10 border border-green-500/30 text-green-400 rounded-lg text-sm">{success}</div>}

            {!account ? (
              <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/30 text-center">
                <p className="text-orange-400 font-medium">Connect wallet to interact with this auction.</p>
              </div>
            ) : !isEndedOrExpired ? (
              <form onSubmit={handleBid} className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-grow">
                  <span className="absolute left-4 top-3 text-slate-400">Ξ</span>
                  <input 
                    type="number" 
                    step="0.0001"
                    min={Number(auction.highestBid) > 0 ? (Number(auction.highestBid) + 0.0001).toPrecision(5) : auction.startingPrice}
                    required
                    value={bidAmount}
                    onChange={(e) => setBidAmount(e.target.value)}
                    placeholder={`> ${Number(auction.highestBid) > 0 ? auction.highestBid : auction.startingPrice} ETH`}
                    className="w-full bg-slate-900 border border-slate-600 rounded-xl py-3 pl-10 pr-4 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  />
                </div>
                <button 
                  type="submit" 
                  disabled={isBidding}
                  className="btn-primary py-3 px-8 text-lg flex items-center justify-center min-w-[160px]"
                >
                  {isBidding ? <span className="animate-spin mr-2">⟳</span> : <HandCoins className="w-5 h-5 mr-2" />}
                  Place Bid
                </button>
              </form>
            ) : (
               <div className="space-y-4">
                 {/* Settle Action */}
                 <div className="p-5 glass-panel rounded-xl border border-dashed border-slate-600 bg-slate-800/50">
                   <h4 className="font-bold text-lg mb-2 text-white">Auction Ended</h4>
                   {!auction.ended ? (
                     <div>
                       <p className="text-sm text-slate-400 mb-4">The time has expired. Anyone can settle this auction to transfer funds and officially declare the winner.</p>
                       <button 
                         onClick={handleEndAuction}
                         disabled={isEnding}
                         className="btn-primary w-full shadow-orange-500/20 from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500"
                       >
                         {isEnding ? 'Settling...' : 'Settle Auction'}
                       </button>
                     </div>
                   ) : (
                     <p className="text-emerald-400 font-medium">This auction has been settled and funds are distributed.</p>
                   )}
                 </div>
               </div>
            )}

            {/* Withdraw Section */}
            {pendingReturn > 0 && (
              <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-purple-300">Outbid Funds Available</h4>
                  <p className="text-sm text-purple-400/80">You have {pendingReturn} ETH to withdraw from previous bids.</p>
                </div>
                <button 
                  onClick={handleWithdraw}
                  disabled={isWithdrawing}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-medium transition-all shadow-lg shadow-purple-600/30"
                >
                  {isWithdrawing ? 'Withdrawing...' : 'Withdraw Funds'}
                </button>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};

export default AuctionDetails;
