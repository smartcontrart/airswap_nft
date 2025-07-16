// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import "./interfaces/IAirswapNFT.sol";
import "solady/src/utils/SafeTransferLib.sol";

/**
 * @title AirswapMinter
 * @dev Contract that allows users to mint AirswapNFT tokens
 * @notice Users can mint a specified quantity of NFTs per wallet if they have the required sAST balance
 */
contract AirswapMinter {
    using SafeTransferLib for address;

    // ============ EVENTS ============

    /**
     * @dev Emitted when a user successfully mints an NFT
     * @param user The address of the user who minted
     * @param tokenId The ID of the token that was minted
     * @param quantity The quantity of tokens minted
     */
    event NFTMinted(
        address indexed user,
        uint256 indexed tokenId,
        uint256 quantity
    );

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

    /**
     * @dev Emitted when the mintable token ID is updated
     * @param oldTokenId The previous token ID
     * @param newTokenId The new token ID
     */
    event MintableTokenIdUpdated(uint256 oldTokenId, uint256 newTokenId);

    /**
     * @dev Emitted when the mint quantity is updated
     * @param oldQuantity The previous mint quantity
     * @param newQuantity The new mint quantity
     */
    event MintQuantityUpdated(uint256 oldQuantity, uint256 newQuantity);

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

    /**
     * @dev Error thrown when trying to set invalid mint quantity
     */
    error InvalidMintQuantity();

    // ============ STATE VARIABLES ============

    /// @dev The AirswapNFT contract
    IAirswapNFT public immutable nftContract;

    /// @dev The sAST token contract address
    address public sastToken;

    /// @dev Required sAST balance to mint (1010 tokens)
    uint256 public requiredSASTBalance;

    /// @dev The token ID that can be minted through this contract
    uint256 public mintableTokenId;

    /// @dev The quantity of tokens to mint per user
    uint256 public mintQuantity;

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
        // Default tokenId to 0
        mintableTokenId = 0;
        // Default quantity to 1
        mintQuantity = 1;
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
     * @dev Allows a user to mint NFTs if they meet the requirements
     * @notice User must have sufficient sAST tokens and not have minted before
     */
    function mintNFT() external {
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
        totalMinted += mintQuantity;

        // Mint the NFT to the user
        nftContract.mint(msg.sender, mintableTokenId, mintQuantity, "");

        emit NFTMinted(msg.sender, mintableTokenId, mintQuantity);
    }

    /**
     * @dev Batch mint NFTs for multiple users (admin function)
     * @param users Array of user addresses
     * @notice Only owner can call this function
     */
    function batchMintNFTs(address[] calldata users) external onlyOwner {
        for (uint256 i = 0; i < users.length; i++) {
            address user = users[i];

            // Skip if user has already minted
            if (hasMinted[user]) {
                continue;
            }

            // Mark user as having minted
            hasMinted[user] = true;
            totalMinted += mintQuantity;

            // Mint the NFT to the user
            nftContract.mint(user, mintableTokenId, mintQuantity, "");

            emit NFTMinted(user, mintableTokenId, mintQuantity);
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
     * @dev Updates the mintable token ID
     * @param _mintableTokenId The new token ID that can be minted
     * @notice Only owner can call this function
     */
    function updateMintableTokenId(
        uint256 _mintableTokenId
    ) external onlyOwner {
        uint256 oldTokenId = mintableTokenId;
        mintableTokenId = _mintableTokenId;

        emit MintableTokenIdUpdated(oldTokenId, _mintableTokenId);
    }

    /**
     * @dev Updates the mint quantity
     * @param _mintQuantity The new quantity of tokens to mint per user
     * @notice Only owner can call this function
     */
    function updateMintQuantity(uint256 _mintQuantity) external onlyOwner {
        if (_mintQuantity == 0) {
            revert InvalidMintQuantity();
        }

        uint256 oldQuantity = mintQuantity;
        mintQuantity = _mintQuantity;

        emit MintQuantityUpdated(oldQuantity, _mintQuantity);
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
     * @dev Gets the total quantity of tokens minted through this contract
     * @return The total quantity of tokens minted
     */
    function getTotalTokensMinted() external view returns (uint256) {
        return totalMinted;
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
