// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IMarketHubProtocol {
    function reserve(uint256 amount) external;
    function list(uint256 lotId, uint256 price) external;
    function take(uint256 listingId) external;
    function trade(uint256 listingId) external;
    function collect(uint256 stakeId) external;
}

/// @title MarketHubProtocol
/// @notice Off-chain ledger is live today. This contract is the on-chain settlement surface
///         for Reserve / List / Take / Trade / Collect. Deploy behind PROTOCOL_ADDRESS.
contract MarketHubProtocol is IMarketHubProtocol {
    event Reserved(address indexed account, uint256 amount);
    event Listed(address indexed seller, uint256 indexed lotId, uint256 price);
    event Taken(address indexed buyer, uint256 indexed listingId);
    event Traded(address indexed buyer, uint256 indexed listingId);
    event Collected(address indexed account, uint256 indexed stakeId);

    mapping(address => uint256) public reserved;
    mapping(uint256 => address) public lotOwner;
    mapping(uint256 => uint256) public listingPrice;

    function reserve(uint256 amount) external {
        reserved[msg.sender] += amount;
        emit Reserved(msg.sender, amount);
    }

    function list(uint256 lotId, uint256 price) external {
        lotOwner[lotId] = msg.sender;
        listingPrice[lotId] = price;
        emit Listed(msg.sender, lotId, price);
    }

    function take(uint256 listingId) external {
        emit Taken(msg.sender, listingId);
    }

    function trade(uint256 listingId) external {
        emit Traded(msg.sender, listingId);
    }

    function collect(uint256 stakeId) external {
        emit Collected(msg.sender, stakeId);
    }
}
