// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

/**
 * @title IAirswapNFT
 * @dev Interface for the AirswapNFT ERC-1155 contract with admin functionality
 * @notice This interface defines the custom functions, events, and errors for the AirswapNFT contract
 */
interface IAirswapNFT {
    // ============ EVENTS ============

    /**
     * @dev Emitted when a new token is minted
     * @param to The address receiving the tokens
     * @param tokenId The ID of the token being minted
     * @param amount The amount of tokens minted
     */
    event TokenMinted(
        address indexed to,
        uint256 indexed tokenId,
        uint256 amount
    );

    /**
     * @dev Emitted when a token URI is set or updated
     * @param tokenId The ID of the token
     * @param newURI The new URI for the token
     */
    event URISet(uint256 indexed tokenId, string newURI);

    /**
     * @dev Emitted when an admin is added
     * @param admin The address of the new admin
     */
    event AdminAdded(address indexed admin);

    /**
     * @dev Emitted when an admin is removed
     * @param admin The address of the removed admin
     */
    event AdminRemoved(address indexed admin);

    // ============ CUSTOM ERRORS ============

    /**
     * @dev Error thrown when trying to add an invalid admin address
     */
    error InvalidAdminAddress();

    /**
     * @dev Error thrown when trying to add an address that is already an admin
     */
    error AlreadyAdmin();

    /**
     * @dev Error thrown when trying to add the owner as an admin (owner is already admin)
     */
    error OwnerAlreadyAdmin();

    /**
     * @dev Error thrown when trying to remove an address that is not an admin
     */
    error NotAdmin();

    /**
     * @dev Error thrown when trying to access a token that does not exist
     */
    error TokenDoesNotExist();

    // ============ CUSTOM VIEW FUNCTIONS ============

    /**
     * @dev Returns the name of the token collection
     * @return The name of the collection
     */
    function name() external view returns (string memory);

    /**
     * @dev Returns the symbol of the token collection
     * @return The symbol of the collection
     */
    function symbol() external view returns (string memory);

    /**
     * @dev Returns the total number of admins
     * @return The number of admins
     */
    function adminCount() external view returns (uint256);

    /**
     * @dev Checks if an address is an admin
     * @param account The address to check
     * @return True if the address is an admin, false otherwise
     */
    function isAdmin(address account) external view returns (bool);

    /**
     * @dev Returns the admin status of an address
     * @param account The address to check
     * @return True if the address is an admin, false otherwise
     */
    function admins(address account) external view returns (bool);

    /**
     * @dev Checks if a token ID exists
     * @param tokenId The token ID to check
     * @return True if the token exists, false otherwise
     */
    function tokenExists(uint256 tokenId) external view returns (bool);

    /**
     * @dev Returns the URI for a specific token ID
     * @param tokenId The ID of the token
     * @return The URI string for the token
     */
    function getTokenURI(uint256 tokenId) external view returns (string memory);

    // ============ ADMIN MANAGEMENT FUNCTIONS ============

    /**
     * @dev Adds an admin (only owner can call)
     * @param admin The address to add as admin
     * @notice Only the contract owner can add admins
     * @notice Cannot add zero address or existing admins
     * @notice Cannot add the owner as admin (owner is already admin)
     */
    function addAdmin(address admin) external;

    /**
     * @dev Removes an admin (only owner can call)
     * @param admin The address to remove as admin
     * @notice Only the contract owner can remove admins
     * @notice Cannot remove non-admin addresses
     */
    function removeAdmin(address admin) external;

    // ============ MINTING FUNCTIONS ============

    /**
     * @dev Mints new tokens (owner or admin can call)
     * @param to The address to mint tokens to
     * @param tokenId The ID of the token to mint
     * @param amount The amount of tokens to mint
     * @param data Additional data to pass to the receiver
     * @notice Only the owner or admins can mint tokens
     * @notice Creates token existence record if token doesn't exist
     */
    function mint(
        address to,
        uint256 tokenId,
        uint256 amount,
        bytes memory data
    ) external;

    /**
     * @dev Mints multiple tokens in a batch (owner or admin can call)
     * @param to The address to mint tokens to
     * @param tokenIds Array of token IDs to mint
     * @param amounts Array of amounts to mint for each token ID
     * @param data Additional data to pass to the receiver
     * @notice Only the owner or admins can mint tokens
     * @notice Creates token existence records for all tokens
     * @notice Arrays must have the same length
     */
    function mintBatch(
        address to,
        uint256[] memory tokenIds,
        uint256[] memory amounts,
        bytes memory data
    ) external;

    // ============ URI MANAGEMENT FUNCTIONS ============

    /**
     * @dev Updates the URI for a specific token ID (owner or admin can call)
     * @param tokenId The ID of the token to update
     * @param newURI The new URI for the token
     * @notice Only the owner or admins can set URIs
     * @notice URI should be set before or after minting the token
     */
    function setURI(uint256 tokenId, string memory newURI) external;
}
