// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import "solady/src/tokens/ERC1155.sol";
import "solady/src/auth/Ownable.sol";
import "solady/src/utils/LibString.sol";
import "./interfaces/IAirswapNFT.sol";

contract AirswapNFT is ERC1155, Ownable, IAirswapNFT {
    using LibString for uint256;

    // Token name and symbol for display purposes
    string public name;
    string public symbol;

    // Mapping to track if a token ID exists
    mapping(uint256 => bool) public tokenExists;

    // Mapping for individual token URIs
    mapping(uint256 => string) public URIs;

    // Admin system
    mapping(address => bool) public admins;
    uint256 public adminCount;

    // Modifiers
    modifier onlyOwnerOrAdmin() {
        if (msg.sender != owner() && !admins[msg.sender]) {
            revert Unauthorized();
        }
        _;
    }

    constructor(string memory _name, string memory _symbol) {
        name = _name;
        symbol = _symbol;
        _initializeOwner(msg.sender);
    }

    /**
     * @dev Admin management functions
     */

    /**
     * @dev Adds an admin (only owner)
     * @param admin Address to add as admin
     */
    function addAdmin(address admin) external onlyOwner {
        if (admin == address(0)) {
            revert InvalidAdminAddress();
        }
        if (admins[admin]) {
            revert AlreadyAdmin();
        }
        if (admin == owner()) {
            revert OwnerAlreadyAdmin();
        }

        admins[admin] = true;
        adminCount++;
        emit AdminAdded(admin);
    }

    /**
     * @dev Removes an admin (only owner)
     * @param admin Address to remove as admin
     */
    function removeAdmin(address admin) external onlyOwner {
        if (!admins[admin]) {
            revert NotAdmin();
        }

        admins[admin] = false;
        adminCount--;
        emit AdminRemoved(admin);
    }

    /**
     * @dev Checks if an address is an admin
     * @param account Address to check
     * @return bool True if admin
     */
    function isAdmin(address account) external view returns (bool) {
        return admins[account];
    }

    /**
     * @dev Mints new tokens (owner or admin)
     * @param to Address to mint tokens to
     * @param tokenId ID of the token to mint
     * @param amount Amount of tokens to mint
     * @param data Additional data to pass to the receiver
     */
    function mint(
        address to,
        uint256 tokenId,
        uint256 amount,
        bytes memory data
    ) external onlyOwnerOrAdmin {
        _mint(to, tokenId, amount, data);
        tokenExists[tokenId] = true;
        emit TokenMinted(to, tokenId, amount);
    }

    /**
     * @dev Mints multiple tokens in a batch (owner or admin)
     * @param to Address to mint tokens to
     * @param tokenIds Array of token IDs to mint
     * @param amounts Array of amounts to mint for each token ID
     * @param data Additional data to pass to the receiver
     */
    function mintBatch(
        address to,
        uint256[] memory tokenIds,
        uint256[] memory amounts,
        bytes memory data
    ) external onlyOwnerOrAdmin {
        _batchMint(to, tokenIds, amounts, data);
        for (uint256 i = 0; i < tokenIds.length; i++) {
            tokenExists[tokenIds[i]] = true;
            emit TokenMinted(to, tokenIds[i], amounts[i]);
        }
    }

    /**
     * @dev Returns the URI for a given token ID
     * @param tokenId ID of the token
     * @return URI string for the token metadata
     */
    function uri(
        uint256 tokenId
    ) public view virtual override returns (string memory) {
        if (!tokenExists[tokenId]) {
            revert TokenDoesNotExist();
        }
        return string.concat(URIs[tokenId], tokenId.toString(), ".json");
    }

    /**
     * @dev Updates the URI for a specific token ID (owner or admin)
     * @param tokenId ID of the token to update
     * @param newURI New URI for the token
     */
    function setURI(
        uint256 tokenId,
        string memory newURI
    ) external onlyOwnerOrAdmin {
        URIs[tokenId] = newURI;
        emit URISet(tokenId, newURI);
    }

    /**
     * @dev Returns the URI for a specific token ID
     * @param tokenId ID of the token
     * @return URI string for the token
     */
    function getTokenURI(uint256 tokenId) public view returns (string memory) {
        return URIs[tokenId];
    }
}
