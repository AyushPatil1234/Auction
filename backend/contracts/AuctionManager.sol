// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract AuctionManager {
    struct Auction {
        uint256 id;
        address payable creator;
        string itemName;
        string itemDescription;
        string itemImage;
        uint256 startingPrice;
        uint256 highestBid;
        address payable highestBidder;
        uint256 endTime;
        bool ended;
    }

    Auction[] public auctions;
    
    // Mapping to store pending returns for each user in an auction
    // pendingReturns[auctionId][userAddress] = amount
    mapping(uint256 => mapping(address => uint256)) public pendingReturns;

    event AuctionCreated(uint256 id, string itemName, uint256 startingPrice, uint256 endTime);
    event HighestBidIncreased(uint256 id, address bidder, uint256 amount);
    event AuctionEnded(uint256 id, address winner, uint256 amount);
    
    /// Create a new auction
    function createAuction(
        string memory _itemName,
        string memory _itemDescription,
        string memory _itemImage,
        uint256 _startingPrice,
        uint256 _durationSeconds
    ) external {
        require(_durationSeconds > 0, "Duration must be > 0");
        require(_startingPrice > 0, "Starting price must be > 0");

        uint256 auctionId = auctions.length;
        
        auctions.push(Auction({
            id: auctionId,
            creator: payable(msg.sender),
            itemName: _itemName,
            itemDescription: _itemDescription,
            itemImage: _itemImage,
            startingPrice: _startingPrice,
            highestBid: 0,
            highestBidder: payable(address(0)),
            endTime: block.timestamp + _durationSeconds,
            ended: false
        }));

        emit AuctionCreated(auctionId, _itemName, _startingPrice, block.timestamp + _durationSeconds);
    }

    /// Bid on an auction
    function bid(uint256 _auctionId) external payable {
        require(_auctionId < auctions.length, "Auction does not exist");
        Auction storage auction = auctions[_auctionId];
        
        require(block.timestamp < auction.endTime, "Auction already ended");
        require(msg.value > auction.highestBid, "There already is a higher bid");
        require(msg.value >= auction.startingPrice, "Bid must be at least the starting price");

        // Refund the previous highest bidder
        if (auction.highestBidder != address(0)) {
            pendingReturns[_auctionId][auction.highestBidder] += auction.highestBid;
        }

        auction.highestBid = msg.value;
        auction.highestBidder = payable(msg.sender);
        
        emit HighestBidIncreased(_auctionId, msg.sender, msg.value);
    }

    /// Withdraw bids that were outbid
    function withdraw(uint256 _auctionId) external returns (bool) {
        uint256 amount = pendingReturns[_auctionId][msg.sender];
        if (amount > 0) {
            // It is important to set this to zero because the recipient
            // can call this function again as part of the receiving call
            // before `send` returns.
            pendingReturns[_auctionId][msg.sender] = 0;

            if (!payable(msg.sender).send(amount)) {
                // No need to call throw here, just reset the amount owing
                pendingReturns[_auctionId][msg.sender] = amount;
                return false;
            }
        }
        return true;
    }

    /// End the auction and send the highest bid to the creator
    function endAuction(uint256 _auctionId) external {
        require(_auctionId < auctions.length, "Auction does not exist");
        Auction storage auction = auctions[_auctionId];

        // 1. Conditions
        require(block.timestamp >= auction.endTime, "Auction not yet ended");
        require(!auction.ended, "endAuction has already been called");

        // 2. Effects
        auction.ended = true;
        emit AuctionEnded(_auctionId, auction.highestBidder, auction.highestBid);

        // 3. Interaction
        if (auction.highestBid > 0) {
            auction.creator.transfer(auction.highestBid);
        }
    }

    /// Get all auctions
    function getAuctions() external view returns (Auction[] memory) {
        return auctions;
    }
    
    /// Get details of a single auction
    function getAuction(uint256 _auctionId) external view returns (Auction memory) {
        require(_auctionId < auctions.length, "Auction does not exist");
        return auctions[_auctionId];
    }
}
