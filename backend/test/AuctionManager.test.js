const {
  time,
  loadFixture,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { expect } = require("chai");

describe("AuctionManager", function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function deployAuctionManagerFixture() {
    // Contracts are deployed using the first signer/account by default
    const [owner, bidder1, bidder2] = await ethers.getSigners();

    const AuctionManager = await ethers.getContractFactory("AuctionManager");
    const auctionManager = await AuctionManager.deploy();

    return { auctionManager, owner, bidder1, bidder2 };
  }

  describe("Deployment", function () {
    it("Should deploy successfully", async function () {
      const { auctionManager } = await loadFixture(deployAuctionManagerFixture);
      expect(await auctionManager.getAddress()).to.be.properAddress;
    });
  });

  describe("Creating Auctions", function () {
    it("Should create a new auction correctly", async function () {
      const { auctionManager, owner } = await loadFixture(deployAuctionManagerFixture);
      
      const itemName = "Rare Digital Art";
      const itemDesc = "A completely unique piece of digital art.";
      const itemImage = "ipfs://Qm...";
      const startingPrice = ethers.parseEther("1");
      const durationSeconds = 60 * 60; // 1 hour
      
      await expect(auctionManager.createAuction(
        itemName, itemDesc, itemImage, startingPrice, durationSeconds
      )).to.emit(auctionManager, "AuctionCreated");

      const auctions = await auctionManager.getAuctions();
      expect(auctions.length).to.equal(1);
      
      const auction = auctions[0];
      expect(auction.creator).to.equal(owner.address);
      expect(auction.itemName).to.equal(itemName);
      expect(auction.startingPrice).to.equal(startingPrice);
      expect(auction.highestBid).to.equal(0);
      expect(auction.ended).to.equal(false);
    });

    it("Should fail if duration or starting price is zero", async function () {
      const { auctionManager } = await loadFixture(deployAuctionManagerFixture);
      
      await expect(auctionManager.createAuction(
        "Item", "Desc", "Img", ethers.parseEther("1"), 0
      )).to.be.revertedWith("Duration must be > 0");

      await expect(auctionManager.createAuction(
        "Item", "Desc", "Img", 0, 3600
      )).to.be.revertedWith("Starting price must be > 0");
    });
  });

  describe("Bidding", function () {
    it("Should allow a user to bid and become the highest bidder", async function () {
      const { auctionManager, bidder1 } = await loadFixture(deployAuctionManagerFixture);
      
      // Create an auction
      await auctionManager.createAuction("Item", "Desc", "Img", ethers.parseEther("1"), 3600);
      
      // Bidder 1 bids 1.5 ETH
      await expect(auctionManager.connect(bidder1).bid(0, { value: ethers.parseEther("1.5") }))
        .to.emit(auctionManager, "HighestBidIncreased")
        .withArgs(0, bidder1.address, ethers.parseEther("1.5"));
        
      const auction = await auctionManager.getAuction(0);
      expect(auction.highestBidder).to.equal(bidder1.address);
      expect(auction.highestBid).to.equal(ethers.parseEther("1.5"));
    });

    it("Should reject bids lower than or equal to the current highest bid", async function () {
      const { auctionManager, bidder1, bidder2 } = await loadFixture(deployAuctionManagerFixture);
      
      await auctionManager.createAuction("Item", "Desc", "Img", ethers.parseEther("1"), 3600);
      
      await auctionManager.connect(bidder1).bid(0, { value: ethers.parseEther("1.5") });
      
      // Bidder 2 tries to bid 1.2 ETH (lower than highest bid)
      await expect(auctionManager.connect(bidder2).bid(0, { value: ethers.parseEther("1.2") }))
        .to.be.revertedWith("There already is a higher bid");
        
      // Bidder 2 tries to bid 1.5 ETH (equal to highest bid)
      await expect(auctionManager.connect(bidder2).bid(0, { value: ethers.parseEther("1.5") }))
        .to.be.revertedWith("There already is a higher bid");
    });

    it("Should track pending returns for outbid users", async function () {
      const { auctionManager, bidder1, bidder2 } = await loadFixture(deployAuctionManagerFixture);
      
      await auctionManager.createAuction("Item", "Desc", "Img", ethers.parseEther("1"), 3600);
      
      // Bidder 1 bids 1.5 ETH
      await auctionManager.connect(bidder1).bid(0, { value: ethers.parseEther("1.5") });
      
      // Bidder 2 outbids with 2.0 ETH
      await auctionManager.connect(bidder2).bid(0, { value: ethers.parseEther("2.0") });
      
      // Bidder 1 should have 1.5 ETH in pending returns
      expect(await auctionManager.pendingReturns(0, bidder1.address)).to.equal(ethers.parseEther("1.5"));
    });
  });

  describe("Ending Auctions", function () {
    it("Should not end an auction before the end time", async function () {
      const { auctionManager } = await loadFixture(deployAuctionManagerFixture);
      
      await auctionManager.createAuction("Item", "Desc", "Img", ethers.parseEther("1"), 3600);
      
      await expect(auctionManager.endAuction(0)).to.be.revertedWith("Auction not yet ended");
    });

    it("Should successfully end an auction after time passes", async function () {
      const { auctionManager, owner, bidder1 } = await loadFixture(deployAuctionManagerFixture);
      
      await auctionManager.createAuction("Item", "Desc", "Img", ethers.parseEther("1"), 3600);
      
      await auctionManager.connect(bidder1).bid(0, { value: ethers.parseEther("2.0") });
      
      // Fast forward time
      await time.increase(3601);
      
      // End auction
      await expect(auctionManager.endAuction(0))
        .to.emit(auctionManager, "AuctionEnded")
        .withArgs(0, bidder1.address, ethers.parseEther("2.0"));
        
      const auction = await auctionManager.getAuction(0);
      expect(auction.ended).to.equal(true);
    });

    it("Should transfer funds to the creator when auction ends", async function () {
      const { auctionManager, owner, bidder1 } = await loadFixture(deployAuctionManagerFixture);
      
      await auctionManager.createAuction("Item", "Desc", "Img", ethers.parseEther("1"), 3600);
      
      const bidAmount = ethers.parseEther("5.0");
      await auctionManager.connect(bidder1).bid(0, { value: bidAmount });
      
      await time.increase(3601);
      
      // End auction and check balance change for owner
      await expect(auctionManager.endAuction(0)).to.changeEtherBalance(owner, bidAmount);
    });
  });

  describe("Withdrawing", function () {
    it("Should allow outbid users to withdraw their funds", async function () {
      const { auctionManager, bidder1, bidder2 } = await loadFixture(deployAuctionManagerFixture);
      
      await auctionManager.createAuction("Item", "Desc", "Img", ethers.parseEther("1"), 3600);
      
      const bid1Amount = ethers.parseEther("1.5");
      await auctionManager.connect(bidder1).bid(0, { value: bid1Amount });
      await auctionManager.connect(bidder2).bid(0, { value: ethers.parseEther("2.0") });
      
      // Bidder 1 withdraws
      await expect(auctionManager.connect(bidder1).withdraw(0)).to.changeEtherBalance(bidder1, bid1Amount);
      
      // Pending returns should be 0
      expect(await auctionManager.pendingReturns(0, bidder1.address)).to.equal(0);
    });
  });
});
