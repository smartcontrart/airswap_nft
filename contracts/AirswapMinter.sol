// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import "./interfaces/IAirswapNFT.sol";
import "solady/src/utils/SafeTransferLib.sol";

/**
 * @title AirswapMinter
 * @dev Contract that allows users to mint AirswapNFT tokens
 * @notice Users can mint 1 NFT per wallet if they have the required sAST balance
 */
contract AirswapMinter {
    using SafeTransferLib for address;

    // ============ EVENTS ============

    /**
     * @dev Emitted when a user successfully mints an NFT
     * @param user The address of the user who minted
     * @param tokenId The ID of the token that was minted
     */
    event NFTMinted(address indexed user, uint256 indexed tokenId);

    /**
     * @dev Emitted when the sAST token address is updated
     * @param oldAddress The previous sAST token address
     * @param newAddress The new sAST token address
     */
    event SASTTokenUpdated(
        address indexed oldAddress,
        address indexed newAddress
    );

    /**
     * @dev Emitted when the required sAST balance is updated
     * @param oldBalance The previous required balance
     * @param newBalance The new required balance
     */
    event RequiredBalanceUpdated(uint256 oldBalance, uint256 newBalance);

    // ============ ERRORS ============

    /**
     * @dev Error thrown when user has already minted
     */
    error AlreadyMinted();

    /**
     * @dev Error thrown when user doesn't have sufficient sAST balance
     */
    error InsufficientSASTBalance();

    /**
     * @dev Error thrown when caller is not authorized
     */
    error Unauthorized();

    /**
     * @dev Error thrown when trying to set invalid token address
     */
    error InvalidTokenAddress();

    // ============ STATE VARIABLES ============

    /// @dev The AirswapNFT contract
    IAirswapNFT public immutable nftContract;

    /// @dev The sAST token contract address
    address public sastToken;

    /// @dev Required sAST balance to mint (1010 tokens)
    uint256 public requiredSASTBalance;

    /// @dev Mapping to track which addresses have already minted
    mapping(address => bool) public hasMinted;

    /// @dev Owner of the contract (can update settings)
    address public owner;

    /// @dev Total number of NFTs minted through this contract
    uint256 public totalMinted;

    // ============ CONSTRUCTOR ============

    /**
     * @dev Constructor
     * @param _nftContract The AirswapNFT contract address
     * @param _sastToken The sAST token contract address
     */
    constructor(address _nftContract, address _sastToken) {
        if (_nftContract == address(0)) {
            revert InvalidTokenAddress();
        }
        if (_sastToken == address(0)) {
            revert InvalidTokenAddress();
        }

        nftContract = IAirswapNFT(_nftContract);
        sastToken = _sastToken;
        requiredSASTBalance = 1010 * 10 ** 4;
        owner = msg.sender;
    }

    // ============ MODIFIERS ============

    /**
     * @dev Modifier to restrict access to owner only
     */
    modifier onlyOwner() {
        if (msg.sender != owner) {
            revert Unauthorized();
        }
        _;
    }

    // ============ MINTING FUNCTIONS ============

    /**
     * @dev Allows a user to mint 1 NFT if they meet the requirements
     * @param tokenId The token ID to mint
     * @notice User must have 1010 sAST tokens and not have minted before
     */
    function mintNFT(uint256 tokenId) external {
        // Check if user has already minted
        if (hasMinted[msg.sender]) {
            revert AlreadyMinted();
        }

        // Check sAST balance
        uint256 userBalance = IERC20(sastToken).balanceOf(msg.sender);
        if (userBalance < requiredSASTBalance) {
            revert InsufficientSASTBalance();
        }

        // Mark user as having minted
        hasMinted[msg.sender] = true;
        totalMinted++;

        // Mint the NFT to the user
        nftContract.mint(msg.sender, tokenId, 1, "");

        emit NFTMinted(msg.sender, tokenId);
    }

    /**
     * @dev Batch mint NFTs for multiple users (admin function)
     * @param users Array of user addresses
     * @param tokenIds Array of token IDs to mint
     * @notice Only owner can call this function
     */
    function batchMintNFTs(
        address[] calldata users,
        uint256[] calldata tokenIds
    ) external onlyOwner {
        require(users.length == tokenIds.length, "Arrays length mismatch");

        for (uint256 i = 0; i < users.length; i++) {
            address user = users[i];
            uint256 tokenId = tokenIds[i];

            // Skip if user has already minted
            if (hasMinted[user]) {
                continue;
            }

            // Mark user as having minted
            hasMinted[user] = true;
            totalMinted++;

            // Mint the NFT to the user
            nftContract.mint(user, tokenId, 1, "");

            emit NFTMinted(user, tokenId);
        }
    }

    // ============ ADMIN FUNCTIONS ============

    /**
     * @dev Updates the sAST token address
     * @param _sastToken The new sAST token address
     * @notice Only owner can call this function
     */
    function updateSASTToken(address _sastToken) external onlyOwner {
        if (_sastToken == address(0)) {
            revert InvalidTokenAddress();
        }

        address oldAddress = sastToken;
        sastToken = _sastToken;

        emit SASTTokenUpdated(oldAddress, _sastToken);
    }

    /**
     * @dev Updates the required sAST balance
     * @param _requiredBalance The new required balance
     * @notice Only owner can call this function
     */
    function updateRequiredBalance(
        uint256 _requiredBalance
    ) external onlyOwner {
        uint256 oldBalance = requiredSASTBalance;
        requiredSASTBalance = _requiredBalance;

        emit RequiredBalanceUpdated(oldBalance, _requiredBalance);
    }

    /**
     * @dev Transfers ownership of the contract
     * @param _newOwner The new owner address
     * @notice Only owner can call this function
     */
    function transferOwnership(address _newOwner) external onlyOwner {
        if (_newOwner == address(0)) {
            revert InvalidTokenAddress();
        }

        owner = _newOwner;
    }

    // ============ VIEW FUNCTIONS ============

    /**
     * @dev Checks if a user can mint (hasn't minted before and has sufficient balance)
     * @param user The address to check
     * @return True if user can mint, false otherwise
     */
    function canMint(address user) external view returns (bool) {
        if (hasMinted[user]) {
            return false;
        }

        uint256 userBalance = IERC20(sastToken).balanceOf(user);
        return userBalance >= requiredSASTBalance;
    }

    /**
     * @dev Gets the sAST balance of a user
     * @param user The address to check
     * @return The user's sAST balance
     */
    function getUserSASTBalance(address user) external view returns (uint256) {
        return IERC20(sastToken).balanceOf(user);
    }

    /**
     * @dev Gets the required sAST balance in a more readable format
     * @return The required balance divided by 10^18
     */
    function getRequiredBalanceInTokens() external view returns (uint256) {
        return requiredSASTBalance / 10 ** 18;
    }
}

// ============ INTERFACES ============

/**
 * @dev Minimal ERC20 interface for sAST token interactions
 */
interface IERC20 {
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
    function allowance(
        address owner,
        address spender
    ) external view returns (uint256);
}
