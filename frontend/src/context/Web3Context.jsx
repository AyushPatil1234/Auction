import React, { createContext, useState, useEffect, useContext } from 'react';
import { ethers } from 'ethers';
import AuctionManagerABI from '../contracts/AuctionManager.json';
import ContractAddress from '../contracts/contract-address.json';

const Web3Context = createContext();

export const Web3Provider = ({ children }) => {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [contract, setContract] = useState(null);
  const [account, setAccount] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState('');

  // Auto connect if already authorized
  useEffect(() => {
    checkIfWalletIsConnected();
    
    // Listen for account changes
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', () => window.location.reload());
    }

    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
      }
    };
  }, []);

  const handleAccountsChanged = async (accounts) => {
    if (accounts.length > 0) {
      setAccount(accounts[0]);
      await setupEthers(accounts[0]);
    } else {
      setAccount('');
      setSigner(null);
      setContract(null);
    }
  };

  const checkIfWalletIsConnected = async () => {
    try {
      if (!window.ethereum) return;
      const accounts = await window.ethereum.request({ method: 'eth_accounts' });
      if (accounts.length > 0) {
        await handleAccountsChanged(accounts);
      }
    } catch (err) {
      console.error("Error checking wallet connection", err);
    }
  };

  const setupEthers = async (currentAccount) => {
    try {
      const web3Provider = new ethers.BrowserProvider(window.ethereum);
      setProvider(web3Provider);
      
      const web3Signer = await web3Provider.getSigner(currentAccount);
      setSigner(web3Signer);
      
      const auctionContract = new ethers.Contract(
        ContractAddress.AuctionManager,
        AuctionManagerABI.abi,
        web3Signer
      );
      setContract(auctionContract);
      setError('');
    } catch (err) {
      console.error("Failed to setup ethers", err);
      setError("Failed to connect to network. Are you on the right network?");
    }
  };

  const connectWallet = async () => {
    if (!window.ethereum) {
      setError('Please install MetaMask to use this dApp');
      return;
    }

    try {
      setIsConnecting(true);
      setError('');
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      await handleAccountsChanged(accounts);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to connect wallet');
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <Web3Context.Provider value={{
      provider, signer, contract, account, connectWallet, isConnecting, error
    }}>
      {children}
    </Web3Context.Provider>
  );
};

export const useWeb3 = () => useContext(Web3Context);
