import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWeb3 } from '../context/Web3Context';
import { ethers } from 'ethers';
import { Upload, Calendar, DollarSign, PenTool } from 'lucide-react';

const CreateAuction = () => {
  const { contract, account } = useWeb3();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    itemName: '',
    itemDescription: '',
    itemImage: '',
    startingPrice: '',
    durationHours: '24'
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const calculateEndDate = (hours) => {
    const date = new Date(Date.now() + Number(hours) * 60 * 60 * 1000);
    return date.toLocaleString();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!contract) {
      setError("Please connect your wallet first");
      return;
    }

    try {
      setIsLoading(true);
      
      const priceInWei = ethers.parseEther(formData.startingPrice.toString());
      const durationSeconds = Number(formData.durationHours) * 60 * 60;
      
      const tx = await contract.createAuction(
        formData.itemName,
        formData.itemDescription,
        formData.itemImage,
        priceInWei,
        durationSeconds
      );
      
      // Wait for transaction to be mined
      await tx.wait();
      
      // Navigate home after success
      navigate('/');
      
    } catch (err) {
      console.error("Creation failed:", err);
      // Try to parse readable error from MetaMask
      const reason = err.reason || (err.data && err.data.message) || err.message;
      setError(`Failed to create auction: ${reason}`);
    } finally {
      setIsLoading(false);
    }
  };

  if (!account) {
    return (
      <div className="max-w-md mx-auto text-center py-20">
        <div className="w-20 h-20 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <PenTool className="w-10 h-10 text-blue-500" />
        </div>
        <h2 className="text-3xl font-bold mb-4">Connect Wallet Required</h2>
        <p className="text-slate-400">You need to connect your MetaMask wallet to mint a new decentralized auction.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      <div className="mb-8 relative">
        <h1 className="text-3xl font-bold text-white mb-2">Create New Auction</h1>
        <p className="text-slate-400">List an item securely on the blockchain. Funds are handled automatically via smart contracts.</p>
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/20 blur-[60px] rounded-full pointer-events-none -z-10" />
      </div>

      <div className="glass-panel p-6 sm:p-8 rounded-2xl relative overflow-hidden">
        {/* Decorative corner accent */}
        <div className="absolute top-0 right-0 border-t-[80px] border-r-[80px] border-t-transparent border-r-blue-500/10"></div>
        
        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-500 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
          
          <div className="space-y-2">
            <label className="text-sm font-medium pr-1 text-slate-300">Item Name</label>
            <input 
              type="text" 
              name="itemName"
              required
              placeholder="e.g. Exclusive CryptoPunk NFT"
              value={formData.itemName}
              onChange={handleChange}
              className="input-field"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium pr-1 text-slate-300">Description</label>
            <textarea 
              name="itemDescription"
              required
              rows={4}
              placeholder="Describe the item, conditions, origin..."
              value={formData.itemDescription}
              onChange={handleChange}
              className="input-field resize-none"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium pr-1 flex items-center gap-2 text-slate-300">
              <Upload className="w-4 h-4 text-slate-400" />
              Image URL (Optional)
            </label>
            <input 
              type="url" 
              name="itemImage"
              placeholder="https://example.com/image.png or ipfs://"
              value={formData.itemImage}
              onChange={handleChange}
              className="input-field"
            />
            {formData.itemImage && (
              <div className="mt-4 rounded-xl overflow-hidden shadow-lg border border-slate-700/50 aspect-video relative max-w-sm">
                <img 
                  src={formData.itemImage} 
                  alt="Preview" 
                  className="w-full h-full object-cover"
                  onError={(e) => e.target.style.display = 'none'}
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            
            <div className="space-y-2">
              <label className="text-sm font-medium pr-1 flex items-center gap-2 text-slate-300">
                <DollarSign className="w-4 h-4 text-slate-400" />
                Starting Price (ETH)
              </label>
              <div className="relative">
                <input 
                  type="number" 
                  step="0.0001"
                  min="0.0001"
                  name="startingPrice"
                  required
                  placeholder="0.1"
                  value={formData.startingPrice}
                  onChange={handleChange}
                  className="input-field pl-10"
                />
                <span className="absolute left-3 top-2.5 text-slate-500 font-bold">Ξ</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium pr-1 flex items-center gap-2 text-slate-300">
                <Calendar className="w-4 h-4 text-slate-400" />
                Duration (Hours)
              </label>
              <input 
                type="number" 
                min="1"
                max="720"
                name="durationHours"
                required
                value={formData.durationHours}
                onChange={handleChange}
                className="input-field"
              />
              <p className="text-xs text-slate-500 mt-1">
                Ends approx: {calculateEndDate(formData.durationHours)}
              </p>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-700/50">
            <button 
              type="submit" 
              disabled={isLoading}
              className="btn-primary w-full py-3 text-lg flex justify-center items-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Deploying to Blockchain...
                </>
              ) : (
                <>Mint Auction</>
              )}
            </button>
            <p className="text-center text-xs text-slate-500 mt-4 leading-relaxed">
              * Creating an auction requires a slight gas fee to execute the smart contract on the Ethereum network. Make sure your MetaMesk has enough Sepolia ETH.
            </p>
          </div>
          
        </form>
      </div>
    </div>
  );
};

export default CreateAuction;
