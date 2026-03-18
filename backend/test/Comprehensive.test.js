const { time, loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { expect } = require("chai");

describe("AuctionManager - Comprehensive Test Suite", function () {
  async function deployFixture() {
    const [owner, bidder1, bidder2, thirdParty] = await ethers.getSigners();
    const AuctionManager = await ethers.getContractFactory("AuctionManager");
    const auctionManager = await AuctionManager.deploy();
    return { auctionManager, owner, bidder1, bidder2, thirdParty };
  }

  describe("1. Auction Creation", function () {
    it("TC-1.1 (Happy Path): Should create an auction with valid parameters", async function () {
      const { auctionManager } = await loadFixture(deployFixture);
      await expect(auctionManager.createAuction("Item1", "Desc1", "Img1", ethers.parseEther("1"), 3600))
        .to.emit(auctionManager, "AuctionCreated");
    });
    
    it("TC-1.2 (Edge Case): Should create an auction with minimum duration (1s) and price (1 wei)", async function () {
      const { auctionManager } = await loadFixture(deployFixture);
      await expect(auctionManager.createAuction("Item2", "Desc2", "Img2", 1, 1))
        .to.emit(auctionManager, "AuctionCreated");
    });

    it("TC-1.3 (Failure): Should revert when duration is 0", async function () {
      const { auctionManager } = await loadFixture(deployFixture);
      await expect(auctionManager.createAuction("Item", "Desc", "Img", ethers.parseEther("1"), 0))
        .to.be.revertedWith("Duration must be > 0");
    });

    it("TC-1.4 (Failure): Should revert when price is 0", async function () {
      const { auctionManager } = await loadFixture(deployFixture);
      await expect(auctionManager.createAuction("Item", "Desc", "Img", 0, 3600))
        .to.be.revertedWith("Starting price must be > 0");
    });
  });

  describe("2. Bidding Mechanism", function () {
    async function deployAndCreate() {
      const fixture = await loadFixture(deployFixture);
      await fixture.auctionManager.createAuction("Item", "Desc", "Img", ethers.parseEther("1"), 3600);
      return fixture;
    }

    it("TC-2.1 (Happy Path): User places a valid bid equal to or greater than starting price", async function () {
      const { auctionManager, bidder1 } = await loadFixture(deployAndCreate);
      
      // Exact starting price is allowed by `require(msg.value >= auction.startingPrice)`
      await expect(auctionManager.connect(bidder1).bid(0, { value: ethers.parseEther("1") }))
        .to.emit(auctionManager, "HighestBidIncreased")
        .withArgs(0, bidder1.address, ethers.parseEther("1"));
    });

    it("TC-2.2 & 2.3: User 2 outbids User 1; User 1's funds go to pending returns", async function () {
      const { auctionManager, bidder1, bidder2 } = await loadFixture(deployAndCreate);
      
      await auctionManager.connect(bidder1).bid(0, { value: ethers.parseEther("1.5") });
      await auctionManager.connect(bidder2).bid(0, { value: ethers.parseEther("2.0") });
      
      const pending = await auctionManager.pendingReturns(0, bidder1.address);
      expect(pending).to.equal(ethers.parseEther("1.5"));
    });

    it("TC-2.4 (Failure): Reverts if bid is lower than starting price", async function () {
      const { auctionManager, bidder1 } = await loadFixture(deployAndCreate);
      await expect(auctionManager.connect(bidder1).bid(0, { value: ethers.parseEther("0.5") }))
        .to.be.revertedWith("Bid must be at least the starting price");
    });

    it("TC-2.5 (Failure): Reverts if bid is <= current highest bid", async function () {
      const { auctionManager, bidder1, bidder2 } = await loadFixture(deployAndCreate);
      await auctionManager.connect(bidder1).bid(0, { value: ethers.parseEther("2.0") });
      
      await expect(auctionManager.connect(bidder2).bid(0, { value: ethers.parseEther("1.5") }))
        .to.be.revertedWith("There already is a higher bid");
        
      await expect(auctionManager.connect(bidder2).bid(0, { value: ethers.parseEther("2.0") }))
        .to.be.revertedWith("There already is a higher bid");
    });

    it("TC-2.6 (Failure): Reverts if bidding on non-existent auction", async function () {
      const { auctionManager, bidder1 } = await loadFixture(deployAndCreate);
      await expect(auctionManager.connect(bidder1).bid(999, { value: ethers.parseEther("1") }))
        .to.be.revertedWith("Auction does not exist");
    });

    it("TC-2.7 (Failure): Reverts if bidding after endTime", async function () {
      const { auctionManager, bidder1 } = await loadFixture(deployAndCreate);
      await time.increase(3601);
      await expect(auctionManager.connect(bidder1).bid(0, { value: ethers.parseEther("2") }))
        .to.be.revertedWith("Auction already ended");
    });
  });

  describe("3. Withdrawal & Refund Pattern", function () {
    async function deployWithPendingReturns() {
      const fixture = await loadFixture(deployFixture);
      await fixture.auctionManager.createAuction("Item", "Desc", "Img", ethers.parseEther("1"), 3600);
      await fixture.auctionManager.connect(fixture.bidder1).bid(0, { value: ethers.parseEther("1.5") });
      await fixture.auctionManager.connect(fixture.bidder2).bid(0, { value: ethers.parseEther("2.0") });
      return fixture;
    }

    it("TC-3.1 (Happy Path): Outbid user successfully withdraws funds", async function () {
      const { auctionManager, bidder1 } = await loadFixture(deployWithPendingReturns);
      
      const beforeBalance = await ethers.provider.getBalance(bidder1.address);
      const tx = await auctionManager.connect(bidder1).withdraw(0);
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed * receipt.gasPrice;
      
      const afterBalance = await ethers.provider.getBalance(bidder1.address);
      
      // Should completely refund original amount minues gas consumed.
      expect(afterBalance).to.equal(beforeBalance + ethers.parseEther("1.5") - gasUsed);
      expect(await auctionManager.pendingReturns(0, bidder1.address)).to.equal(0);
    });

    it("TC-3.2 (Accumulation): Multiple outbids accumulate correctly", async function () {
      const { auctionManager, bidder1, bidder2 } = await loadFixture(deployWithPendingReturns);
      
      // bidder1 was outbid. Now bidder1 outbids bidder2, then bidder2 outbids bidder1 again.
      await auctionManager.connect(bidder1).bid(0, { value: ethers.parseEther("3.0") }); 
      await auctionManager.connect(bidder2).bid(0, { value: ethers.parseEther("4.0") }); 
      
      // bidder1 should have 1.5 + 3.0 = 4.5 in pending returns total
      expect(await auctionManager.pendingReturns(0, bidder1.address)).to.equal(ethers.parseEther("4.5"));
    });

    it("TC-3.3 (Zero Balance): Withdrawing with 0 balance does not fail but transfers nothing", async function () {
      const { auctionManager, thirdParty } = await loadFixture(deployWithPendingReturns);
      
      const beforeBalance = await ethers.provider.getBalance(thirdParty.address);
      const tx = await auctionManager.connect(thirdParty).withdraw(0);
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed * receipt.gasPrice;
      
      const afterBalance = await ethers.provider.getBalance(thirdParty.address);
      expect(afterBalance).to.equal(beforeBalance - gasUsed); // Only gas is deducted
    });
  });

  describe("4. Auction Settlement (Ending)", function () {
    async function setupEndedAuction() {
      const fixture = await loadFixture(deployFixture);
      await fixture.auctionManager.createAuction("Item", "Desc", "Img", ethers.parseEther("1"), 3600);
      await fixture.auctionManager.connect(fixture.bidder1).bid(0, { value: ethers.parseEther("2.0") });
      await time.increase(3601);
      return fixture;
    }

    it("TC-4.1 (Happy Path - With Bids): Highest bid goes to creator", async function () {
      const { auctionManager, owner } = await loadFixture(setupEndedAuction);
      
      const beforeBalance = await ethers.provider.getBalance(owner.address);
      const tx = await auctionManager.endAuction(0);
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed * receipt.gasPrice;
      
      const afterBalance = await ethers.provider.getBalance(owner.address);
      expect(afterBalance).to.equal(beforeBalance + ethers.parseEther("2.0") - gasUsed);
    });

    it("TC-4.2 (Happy Path - No Bids): Ends gracefully", async function () {
      const { auctionManager, owner } = await loadFixture(deployFixture);
      await auctionManager.createAuction("Item", "Desc", "Img", ethers.parseEther("1"), 3600);
      await time.increase(3601);
      
      await expect(auctionManager.endAuction(0))
        .to.emit(auctionManager, "AuctionEnded")
        .withArgs(0, ethers.ZeroAddress, 0);
    });

    it("TC-4.3 (Public Settlement): ANY user can end an expired auction", async function () {
      const { auctionManager, thirdParty, owner } = await loadFixture(setupEndedAuction);
      
      const beforeCreatorBalance = await ethers.provider.getBalance(owner.address);
      
      // Third party settles it
      await expect(auctionManager.connect(thirdParty).endAuction(0))
        .to.emit(auctionManager, "AuctionEnded");
        
      const afterCreatorBalance = await ethers.provider.getBalance(owner.address);
      
      // Even if third party called it, funds go to the creator
      expect(afterCreatorBalance).to.equal(beforeCreatorBalance + ethers.parseEther("2.0"));
    });

    it("TC-4.4 (Failure): Reverts if ended before time", async function () {
      const { auctionManager } = await loadFixture(deployFixture);
      await auctionManager.createAuction("Item", "Desc", "Img", ethers.parseEther("1"), 3600);
      await expect(auctionManager.endAuction(0))
        .to.be.revertedWith("Auction not yet ended");
    });

    it("TC-4.5 (Failure): Reverts if already ended", async function () {
      const { auctionManager } = await loadFixture(setupEndedAuction);
      await auctionManager.endAuction(0);
      await expect(auctionManager.endAuction(0))
        .to.be.revertedWith("endAuction has already been called");
    });
  });
});
