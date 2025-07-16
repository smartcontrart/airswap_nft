const {
  loadFixture,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { expect } = require("chai");

describe("AirswapMinter", function () {
  // We define a fixture to reuse the same setup in every test.
  async function deployMinterFixture() {
    const [owner, user1, user2, user3, user4] = await ethers.getSigners();

    // Deploy the NFT contract
    const AirswapNFT = await ethers.getContractFactory("AirswapNFT");
    const nft = await AirswapNFT.deploy("Airswap NFT Collection", "ANFT");

    // Deploy the mock ERC20 token (sAST)
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const sastToken = await MockERC20.deploy();

    // Deploy the minter contract
    const AirswapMinter = await ethers.getContractFactory("AirswapMinter");
    const minter = await AirswapMinter.deploy(nft.target, sastToken.target);

    // Add the minter as an admin to the NFT contract
    await nft.addAdmin(minter.target);

    return { nft, sastToken, minter, owner, user1, user2, user3, user4 };
  }

  describe("Deployment", function () {
    it("Should deploy with correct initial values", async function () {
      const { nft, sastToken, minter, owner } = await loadFixture(
        deployMinterFixture
      );

      expect(await minter.nftContract()).to.equal(nft.target);
      expect(await minter.sastToken()).to.equal(sastToken.target);
      expect(await minter.owner()).to.equal(owner.address);
      expect(await minter.totalMinted()).to.equal(0);
      expect(await minter.requiredSASTBalance()).to.equal(1010n * 10n ** 4n);
      expect(await minter.mintableTokenId()).to.equal(0);
      expect(await minter.mintQuantity()).to.equal(1);
    });

    it("Should revert if deploying with zero addresses", async function () {
      const { nft, sastToken } = await loadFixture(deployMinterFixture);
      const AirswapMinter = await ethers.getContractFactory("AirswapMinter");

      // Deploy with zero NFT address
      await expect(
        AirswapMinter.deploy(ethers.ZeroAddress, sastToken.target)
      ).to.be.revertedWithCustomError(
        await AirswapMinter.deploy(nft.target, sastToken.target),
        "InvalidTokenAddress"
      );

      // Deploy with zero sAST address
      await expect(
        AirswapMinter.deploy(nft.target, ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(
        await AirswapMinter.deploy(nft.target, sastToken.target),
        "InvalidTokenAddress"
      );
    });
  });

  describe("Minting", function () {
    describe("Successful Minting", function () {
      it("Should allow user with sufficient sAST balance to mint", async function () {
        const { nft, sastToken, minter, user1 } = await loadFixture(
          deployMinterFixture
        );
        const tokenId = 1;
        const requiredBalance = await minter.requiredSASTBalance();

        // Give user1 sufficient sAST balance
        await sastToken.mint(user1.address, requiredBalance);

        // Check user can mint
        expect(await minter.canMint(user1.address)).to.be.true;

        // Mint NFT
        await expect(minter.connect(user1).mintNFT())
          .to.emit(minter, "NFTMinted")
          .withArgs(user1.address, 0, 1);

        // Verify NFT was minted
        expect(await nft.balanceOf(user1.address, 0)).to.equal(1);
        expect(await nft.tokenExists(0)).to.be.true;

        // Verify user is marked as having minted
        expect(await minter.hasMinted(user1.address)).to.be.true;
        expect(await minter.totalMinted()).to.equal(1);
      });

      it("Should allow multiple users to mint different token IDs", async function () {
        const { nft, sastToken, minter, user1, user2 } = await loadFixture(
          deployMinterFixture
        );
        const requiredBalance = await minter.requiredSASTBalance();

        // Give users sufficient sAST balance
        await sastToken.mint(user1.address, requiredBalance);
        await sastToken.mint(user2.address, requiredBalance);

        // User1 mints token 0
        await minter.connect(user1).mintNFT();
        expect(await nft.balanceOf(user1.address, 0)).to.equal(1);

        // User2 mints token 0 (same token ID for all users)
        await minter.connect(user2).mintNFT();
        expect(await nft.balanceOf(user2.address, 0)).to.equal(1);

        // Verify total minted
        expect(await minter.totalMinted()).to.equal(2);
      });
    });

    describe("Minting Restrictions", function () {
      it("Should revert if user has already minted", async function () {
        const { sastToken, minter, user1 } = await loadFixture(
          deployMinterFixture
        );
        const requiredBalance = await minter.requiredSASTBalance();

        // Give user1 sufficient sAST balance
        await sastToken.mint(user1.address, requiredBalance);

        // First mint should succeed
        await minter.connect(user1).mintNFT();

        // Second mint should fail
        await expect(
          minter.connect(user1).mintNFT()
        ).to.be.revertedWithCustomError(minter, "AlreadyMinted");
      });

      it("Should revert if user has insufficient sAST balance", async function () {
        const { sastToken, minter, user1 } = await loadFixture(
          deployMinterFixture
        );
        const requiredBalance = await minter.requiredSASTBalance();

        // Give user1 insufficient sAST balance (1000 instead of 1010)
        await sastToken.mint(user1.address, 1000n * 10n ** 4n);

        // Check user cannot mint
        expect(await minter.canMint(user1.address)).to.be.false;

        // Mint should fail
        await expect(
          minter.connect(user1).mintNFT()
        ).to.be.revertedWithCustomError(minter, "InsufficientSASTBalance");
      });

      it("Should revert if user has zero sAST balance", async function () {
        const { minter, user1 } = await loadFixture(deployMinterFixture);

        // Check user cannot mint
        expect(await minter.canMint(user1.address)).to.be.false;

        // Mint should fail
        await expect(
          minter.connect(user1).mintNFT()
        ).to.be.revertedWithCustomError(minter, "InsufficientSASTBalance");
      });
    });

    describe("Edge Cases", function () {
      it("Should handle minting with exact required balance", async function () {
        const { sastToken, minter, user1 } = await loadFixture(
          deployMinterFixture
        );
        const requiredBalance = await minter.requiredSASTBalance();

        // Give user1 exactly the required sAST balance
        await sastToken.mint(user1.address, requiredBalance);

        // Mint should succeed
        await expect(minter.connect(user1).mintNFT())
          .to.emit(minter, "NFTMinted")
          .withArgs(user1.address, 0, 1);
      });

      it("Should handle minting with more than required balance", async function () {
        const { sastToken, minter, user1 } = await loadFixture(
          deployMinterFixture
        );
        const requiredBalance = await minter.requiredSASTBalance();

        // Give user1 more than the required sAST balance
        await sastToken.mint(
          user1.address,
          requiredBalance + 1000n * 10n ** 4n
        );

        // Mint should succeed
        await expect(minter.connect(user1).mintNFT())
          .to.emit(minter, "NFTMinted")
          .withArgs(user1.address, 0, 1);
      });

      it("Should handle minting the configured token ID", async function () {
        const { sastToken, minter, user1 } = await loadFixture(
          deployMinterFixture
        );
        const requiredBalance = await minter.requiredSASTBalance();

        await sastToken.mint(user1.address, requiredBalance);

        await expect(minter.connect(user1).mintNFT())
          .to.emit(minter, "NFTMinted")
          .withArgs(user1.address, 0, 1);
      });

      it("Should handle minting with different configured token ID", async function () {
        const { sastToken, minter, user1 } = await loadFixture(
          deployMinterFixture
        );
        const requiredBalance = await minter.requiredSASTBalance();

        await sastToken.mint(user1.address, requiredBalance);

        await expect(minter.connect(user1).mintNFT())
          .to.emit(minter, "NFTMinted")
          .withArgs(user1.address, 0, 1);
      });
    });
  });

  describe("Batch Minting", function () {
    it("Should allow owner to batch mint for multiple users", async function () {
      const { nft, sastToken, minter, owner, user1, user2, user3 } =
        await loadFixture(deployMinterFixture);
      const requiredBalance = await minter.requiredSASTBalance();

      // Give users sufficient sAST balance
      await sastToken.mint(user1.address, requiredBalance);
      await sastToken.mint(user2.address, requiredBalance);
      await sastToken.mint(user3.address, requiredBalance);

      const users = [user1.address, user2.address, user3.address];

      // Batch mint
      await expect(minter.connect(owner).batchMintNFTs(users))
        .to.emit(minter, "NFTMinted")
        .withArgs(user1.address, 0, 1)
        .to.emit(minter, "NFTMinted")
        .withArgs(user2.address, 0, 1)
        .to.emit(minter, "NFTMinted")
        .withArgs(user3.address, 0, 1);

      // Verify NFTs were minted
      expect(await nft.balanceOf(user1.address, 0)).to.equal(1);
      expect(await nft.balanceOf(user2.address, 0)).to.equal(1);
      expect(await nft.balanceOf(user3.address, 0)).to.equal(1);

      // Verify total minted
      expect(await minter.totalMinted()).to.equal(3);
    });

    it("Should skip users who have already minted in batch", async function () {
      const { sastToken, minter, owner, user1, user2 } = await loadFixture(
        deployMinterFixture
      );
      const requiredBalance = await minter.requiredSASTBalance();

      // Give users sufficient sAST balance
      await sastToken.mint(user1.address, requiredBalance);
      await sastToken.mint(user2.address, requiredBalance);

      // User1 mints individually first
      await minter.connect(user1).mintNFT();

      const users = [user1.address, user2.address];

      // Batch mint - should skip user1, mint for user2
      await expect(minter.connect(owner).batchMintNFTs(users))
        .to.emit(minter, "NFTMinted")
        .withArgs(user2.address, 0, 1);

      // Verify only user2 got the new NFT
      expect(await minter.hasMinted(user1.address)).to.be.true;
      expect(await minter.hasMinted(user2.address)).to.be.true;
      expect(await minter.totalMinted()).to.equal(2);
    });

    it("Should revert if non-owner tries to batch mint", async function () {
      const { minter, user1 } = await loadFixture(deployMinterFixture);

      const users = [user1.address];

      await expect(
        minter.connect(user1).batchMintNFTs(users)
      ).to.be.revertedWithCustomError(minter, "Unauthorized");
    });
  });

  describe("Admin Functions", function () {
    describe("SAST Token Management", function () {
      it("Should allow owner to update sAST token address", async function () {
        const { minter, owner, user1 } = await loadFixture(deployMinterFixture);
        const newTokenAddress = user1.address; // Using user1 as mock new token

        await expect(minter.connect(owner).updateSASTToken(newTokenAddress))
          .to.emit(minter, "SASTTokenUpdated")
          .withArgs(await minter.sastToken(), newTokenAddress);

        expect(await minter.sastToken()).to.equal(newTokenAddress);
      });

      it("Should revert if non-owner tries to update sAST token", async function () {
        const { minter, user1 } = await loadFixture(deployMinterFixture);

        await expect(
          minter.connect(user1).updateSASTToken(user1.address)
        ).to.be.revertedWithCustomError(minter, "Unauthorized");
      });

      it("Should revert if trying to set zero address as sAST token", async function () {
        const { minter, owner } = await loadFixture(deployMinterFixture);

        await expect(
          minter.connect(owner).updateSASTToken(ethers.ZeroAddress)
        ).to.be.revertedWithCustomError(minter, "InvalidTokenAddress");
      });
    });

    describe("Required Balance Management", function () {
      it("Should allow owner to update required balance", async function () {
        const { minter, owner } = await loadFixture(deployMinterFixture);
        const newBalance = 2000n * 10n ** 4n;

        await expect(minter.connect(owner).updateRequiredBalance(newBalance))
          .to.emit(minter, "RequiredBalanceUpdated")
          .withArgs(await minter.requiredSASTBalance(), newBalance);

        expect(await minter.requiredSASTBalance()).to.equal(newBalance);
      });

      it("Should revert if non-owner tries to update required balance", async function () {
        const { minter, user1 } = await loadFixture(deployMinterFixture);

        await expect(
          minter.connect(user1).updateRequiredBalance(2000n * 10n ** 4n)
        ).to.be.revertedWithCustomError(minter, "Unauthorized");
      });
    });

    describe("Ownership Management", function () {
      it("Should allow owner to transfer ownership", async function () {
        const { minter, owner, user1 } = await loadFixture(deployMinterFixture);

        await minter.connect(owner).transferOwnership(user1.address);

        expect(await minter.owner()).to.equal(user1.address);
      });

      it("Should revert if non-owner tries to transfer ownership", async function () {
        const { minter, user1, user2 } = await loadFixture(deployMinterFixture);

        await expect(
          minter.connect(user1).transferOwnership(user2.address)
        ).to.be.revertedWithCustomError(minter, "Unauthorized");
      });

      it("Should revert if trying to transfer ownership to zero address", async function () {
        const { minter, owner } = await loadFixture(deployMinterFixture);

        await expect(
          minter.connect(owner).transferOwnership(ethers.ZeroAddress)
        ).to.be.revertedWithCustomError(minter, "InvalidTokenAddress");
      });
    });

    describe("Mintable Token ID Management", function () {
      it("Should allow owner to update mintable token ID", async function () {
        const { minter, owner } = await loadFixture(deployMinterFixture);
        const newTokenId = 5;

        await expect(minter.connect(owner).updateMintableTokenId(newTokenId))
          .to.emit(minter, "MintableTokenIdUpdated")
          .withArgs(0, newTokenId);

        expect(await minter.mintableTokenId()).to.equal(newTokenId);
      });

      it("Should revert if non-owner tries to update mintable token ID", async function () {
        const { minter, user1 } = await loadFixture(deployMinterFixture);

        await expect(
          minter.connect(user1).updateMintableTokenId(5)
        ).to.be.revertedWithCustomError(minter, "Unauthorized");
      });
    });

    describe("Mint Quantity Management", function () {
      it("Should allow owner to update mint quantity", async function () {
        const { minter, owner } = await loadFixture(deployMinterFixture);
        const newQuantity = 3;

        await expect(minter.connect(owner).updateMintQuantity(newQuantity))
          .to.emit(minter, "MintQuantityUpdated")
          .withArgs(1, newQuantity);

        expect(await minter.mintQuantity()).to.equal(newQuantity);
      });

      it("Should revert if non-owner tries to update mint quantity", async function () {
        const { minter, user1 } = await loadFixture(deployMinterFixture);

        await expect(
          minter.connect(user1).updateMintQuantity(3)
        ).to.be.revertedWithCustomError(minter, "Unauthorized");
      });

      it("Should revert if trying to set zero mint quantity", async function () {
        const { minter, owner } = await loadFixture(deployMinterFixture);

        await expect(
          minter.connect(owner).updateMintQuantity(0)
        ).to.be.revertedWithCustomError(minter, "InvalidMintQuantity");
      });
    });
  });

  describe("View Functions", function () {
    it("Should correctly check if user can mint", async function () {
      const { sastToken, minter, user1 } = await loadFixture(
        deployMinterFixture
      );
      const requiredBalance = await minter.requiredSASTBalance();

      // Initially user cannot mint (no balance)
      expect(await minter.canMint(user1.address)).to.be.false;

      // Give user insufficient balance
      await sastToken.mint(user1.address, 1000n * 10n ** 4n);
      expect(await minter.canMint(user1.address)).to.be.false;

      // Give user sufficient balance
      await sastToken.mint(user1.address, requiredBalance);
      expect(await minter.canMint(user1.address)).to.be.true;

      // User mints
      await minter.connect(user1).mintNFT();
      expect(await minter.canMint(user1.address)).to.be.false;
    });

    it("Should correctly get user sAST balance", async function () {
      const { sastToken, minter, user1 } = await loadFixture(
        deployMinterFixture
      );
      const balance = 1000n * 10n ** 4n;

      await sastToken.mint(user1.address, balance);

      expect(await minter.getUserSASTBalance(user1.address)).to.equal(balance);
    });

    it("Should correctly get required balance", async function () {
      const { minter } = await loadFixture(deployMinterFixture);

      expect(await minter.requiredSASTBalance()).to.equal(1010n * 10n ** 4n);
    });
  });

  describe("Integration Tests", function () {
    it("Should work correctly with updated required balance", async function () {
      const { nft, sastToken, minter, owner, user1 } = await loadFixture(
        deployMinterFixture
      );
      const newRequiredBalance = 500n * 10n ** 4n;

      // Update required balance
      await minter.connect(owner).updateRequiredBalance(newRequiredBalance);

      // Give user1 the new required balance
      await sastToken.mint(user1.address, newRequiredBalance);

      // User should be able to mint
      expect(await minter.canMint(user1.address)).to.be.true;

      await expect(minter.connect(user1).mintNFT())
        .to.emit(minter, "NFTMinted")
        .withArgs(user1.address, 0, 1);
    });

    it("Should work correctly with updated sAST token", async function () {
      const { nft, sastToken, minter, owner, user1 } = await loadFixture(
        deployMinterFixture
      );
      const requiredBalance = await minter.requiredSASTBalance();

      // Deploy new mock token
      const MockERC20 = await ethers.getContractFactory("MockERC20");
      const newSastToken = await MockERC20.deploy();

      // Update sAST token address
      await minter.connect(owner).updateSASTToken(newSastToken.target);

      // Give user1 balance in new token
      await newSastToken.mint(user1.address, requiredBalance);

      // User should be able to mint
      expect(await minter.canMint(user1.address)).to.be.true;

      await expect(minter.connect(user1).mintNFT())
        .to.emit(minter, "NFTMinted")
        .withArgs(user1.address, 0, 1);
    });
  });
});
