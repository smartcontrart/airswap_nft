const {
  loadFixture,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { expect } = require("chai");

describe("AirswapNFT", function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function deployNFTFixture() {
    const [owner, admin1, admin2, user1, user2] = await ethers.getSigners();

    const AirswapNFT = await ethers.getContractFactory("AirswapNFT");
    const nft = await AirswapNFT.deploy("Airswap NFT Collection", "ANFT");

    return { nft, owner, admin1, admin2, user1, user2 };
  }

  describe("Deployment", function () {
    it("Should set the right name and symbol", async function () {
      const { nft } = await loadFixture(deployNFTFixture);

      expect(await nft.name()).to.equal("Airswap NFT Collection");
      expect(await nft.symbol()).to.equal("ANFT");
    });

    it("Should set the right owner", async function () {
      const { nft, owner } = await loadFixture(deployNFTFixture);

      expect(await nft.owner()).to.equal(owner.address);
    });

    it("Should start with zero admins", async function () {
      const { nft } = await loadFixture(deployNFTFixture);

      expect(await nft.adminCount()).to.equal(0);
    });
  });

  describe("Admin Management", function () {
    describe("Adding Admins", function () {
      it("Should allow owner to add admin", async function () {
        const { nft, owner, admin1 } = await loadFixture(deployNFTFixture);

        await expect(nft.addAdmin(admin1.address))
          .to.emit(nft, "AdminAdded")
          .withArgs(admin1.address);

        expect(await nft.isAdmin(admin1.address)).to.be.true;
        expect(await nft.adminCount()).to.equal(1);
      });

      it("Should revert if non-owner tries to add admin", async function () {
        const { nft, user1, admin1 } = await loadFixture(deployNFTFixture);

        await expect(
          nft.connect(user1).addAdmin(admin1.address)
        ).to.be.revertedWithCustomError(nft, "Unauthorized");
      });

      it("Should revert if trying to add zero address as admin", async function () {
        const { nft } = await loadFixture(deployNFTFixture);

        await expect(
          nft.addAdmin(ethers.ZeroAddress)
        ).to.be.revertedWithCustomError(nft, "InvalidAdminAddress");
      });

      it("Should revert if trying to add existing admin", async function () {
        const { nft, owner, admin1 } = await loadFixture(deployNFTFixture);

        await nft.addAdmin(admin1.address);
        await expect(
          nft.addAdmin(admin1.address)
        ).to.be.revertedWithCustomError(nft, "AlreadyAdmin");
      });

      it("Should revert if trying to add owner as admin", async function () {
        const { nft, owner } = await loadFixture(deployNFTFixture);

        await expect(nft.addAdmin(owner.address)).to.be.revertedWithCustomError(
          nft,
          "OwnerAlreadyAdmin"
        );
      });

      it("Should allow adding multiple admins", async function () {
        const { nft, owner, admin1, admin2 } = await loadFixture(
          deployNFTFixture
        );

        await nft.addAdmin(admin1.address);
        await nft.addAdmin(admin2.address);

        expect(await nft.isAdmin(admin1.address)).to.be.true;
        expect(await nft.isAdmin(admin2.address)).to.be.true;
        expect(await nft.adminCount()).to.equal(2);
      });
    });

    describe("Removing Admins", function () {
      it("Should allow owner to remove admin", async function () {
        const { nft, owner, admin1 } = await loadFixture(deployNFTFixture);

        await nft.addAdmin(admin1.address);
        await expect(nft.removeAdmin(admin1.address))
          .to.emit(nft, "AdminRemoved")
          .withArgs(admin1.address);

        expect(await nft.isAdmin(admin1.address)).to.be.false;
        expect(await nft.adminCount()).to.equal(0);
      });

      it("Should revert if non-owner tries to remove admin", async function () {
        const { nft, owner, admin1, user1 } = await loadFixture(
          deployNFTFixture
        );

        await nft.addAdmin(admin1.address);
        await expect(
          nft.connect(user1).removeAdmin(admin1.address)
        ).to.be.revertedWithCustomError(nft, "Unauthorized");
      });

      it("Should revert if trying to remove non-admin", async function () {
        const { nft, owner, user1 } = await loadFixture(deployNFTFixture);

        await expect(
          nft.removeAdmin(user1.address)
        ).to.be.revertedWithCustomError(nft, "NotAdmin");
      });

      it("Should handle removing multiple admins", async function () {
        const { nft, owner, admin1, admin2 } = await loadFixture(
          deployNFTFixture
        );

        await nft.addAdmin(admin1.address);
        await nft.addAdmin(admin2.address);
        expect(await nft.adminCount()).to.equal(2);

        await nft.removeAdmin(admin1.address);
        expect(await nft.adminCount()).to.equal(1);
        expect(await nft.isAdmin(admin1.address)).to.be.false;
        expect(await nft.isAdmin(admin2.address)).to.be.true;

        await nft.removeAdmin(admin2.address);
        expect(await nft.adminCount()).to.equal(0);
        expect(await nft.isAdmin(admin2.address)).to.be.false;
      });
    });

    describe("Admin Status Checks", function () {
      it("Should correctly identify admins", async function () {
        const { nft, owner, admin1, user1 } = await loadFixture(
          deployNFTFixture
        );

        expect(await nft.isAdmin(owner.address)).to.be.false; // Owner is not in admin mapping
        expect(await nft.isAdmin(admin1.address)).to.be.false;
        expect(await nft.isAdmin(user1.address)).to.be.false;

        await nft.addAdmin(admin1.address);
        expect(await nft.isAdmin(admin1.address)).to.be.true;
      });
    });
  });

  describe("Minting with Admin System", function () {
    describe("Owner Minting", function () {
      it("Should allow owner to mint tokens", async function () {
        const { nft, owner, user1 } = await loadFixture(deployNFTFixture);
        const tokenId = 1;
        const amount = 100;

        await expect(nft.mint(user1.address, tokenId, amount, "0x"))
          .to.emit(nft, "TokenMinted")
          .withArgs(user1.address, tokenId, amount);

        expect(await nft.balanceOf(user1.address, tokenId)).to.equal(amount);
        expect(await nft.tokenExists(tokenId)).to.be.true;
      });

      it("Should allow owner to mint batch tokens", async function () {
        const { nft, owner, user1 } = await loadFixture(deployNFTFixture);
        const tokenIds = [1, 2, 3];
        const amounts = [100, 200, 300];

        await expect(nft.mintBatch(user1.address, tokenIds, amounts, "0x"))
          .to.emit(nft, "TokenMinted")
          .withArgs(user1.address, tokenIds[0], amounts[0])
          .to.emit(nft, "TokenMinted")
          .withArgs(user1.address, tokenIds[1], amounts[1])
          .to.emit(nft, "TokenMinted")
          .withArgs(user1.address, tokenIds[2], amounts[2]);

        for (let i = 0; i < tokenIds.length; i++) {
          expect(await nft.balanceOf(user1.address, tokenIds[i])).to.equal(
            amounts[i]
          );
          expect(await nft.tokenExists(tokenIds[i])).to.be.true;
        }
      });
    });

    describe("Admin Minting", function () {
      it("Should allow admin to mint tokens", async function () {
        const { nft, owner, admin1, user1 } = await loadFixture(
          deployNFTFixture
        );
        const tokenId = 1;
        const amount = 100;

        await nft.addAdmin(admin1.address);

        await expect(
          nft.connect(admin1).mint(user1.address, tokenId, amount, "0x")
        )
          .to.emit(nft, "TokenMinted")
          .withArgs(user1.address, tokenId, amount);

        expect(await nft.balanceOf(user1.address, tokenId)).to.equal(amount);
        expect(await nft.tokenExists(tokenId)).to.be.true;
      });

      it("Should allow admin to mint batch tokens", async function () {
        const { nft, owner, admin1, user1 } = await loadFixture(
          deployNFTFixture
        );
        const tokenIds = [1, 2, 3];
        const amounts = [100, 200, 300];

        await nft.addAdmin(admin1.address);

        await expect(
          nft.connect(admin1).mintBatch(user1.address, tokenIds, amounts, "0x")
        )
          .to.emit(nft, "TokenMinted")
          .withArgs(user1.address, tokenIds[0], amounts[0])
          .to.emit(nft, "TokenMinted")
          .withArgs(user1.address, tokenIds[1], amounts[1])
          .to.emit(nft, "TokenMinted")
          .withArgs(user1.address, tokenIds[2], amounts[2]);

        for (let i = 0; i < tokenIds.length; i++) {
          expect(await nft.balanceOf(user1.address, tokenIds[i])).to.equal(
            amounts[i]
          );
          expect(await nft.tokenExists(tokenIds[i])).to.be.true;
        }
      });

      it("Should revert if non-admin tries to mint", async function () {
        const { nft, user1, user2 } = await loadFixture(deployNFTFixture);
        const tokenId = 1;
        const amount = 100;

        await expect(
          nft.connect(user1).mint(user2.address, tokenId, amount, "0x")
        ).to.be.revertedWithCustomError(nft, "Unauthorized");
      });

      it("Should revert if removed admin tries to mint", async function () {
        const { nft, owner, admin1, user1 } = await loadFixture(
          deployNFTFixture
        );
        const tokenId = 1;
        const amount = 100;

        await nft.addAdmin(admin1.address);
        await nft.removeAdmin(admin1.address);

        await expect(
          nft.connect(admin1).mint(user1.address, tokenId, amount, "0x")
        ).to.be.revertedWithCustomError(nft, "Unauthorized");
      });
    });
  });

  describe("URI Management with Admin System", function () {
    describe("Owner URI Management", function () {
      it("Should allow owner to set URI", async function () {
        const { nft, owner } = await loadFixture(deployNFTFixture);
        const tokenId = 1;
        const baseURI = "https://api.example.com/metadata/";

        // Mint a token first
        await nft.mint(owner.address, tokenId, 1, "0x");

        await expect(nft.setURI(tokenId, baseURI))
          .to.emit(nft, "URISet")
          .withArgs(tokenId, baseURI);

        expect(await nft.getTokenURI(tokenId)).to.equal(baseURI);
        expect(await nft.uri(tokenId)).to.equal(
          baseURI + tokenId.toString() + ".json"
        );
      });
    });

    describe("Admin URI Management", function () {
      it("Should allow admin to set URI", async function () {
        const { nft, owner, admin1 } = await loadFixture(deployNFTFixture);
        const tokenId = 1;
        const baseURI = "https://api.example.com/metadata/";

        await nft.addAdmin(admin1.address);
        await nft.mint(owner.address, tokenId, 1, "0x");

        await expect(nft.connect(admin1).setURI(tokenId, baseURI))
          .to.emit(nft, "URISet")
          .withArgs(tokenId, baseURI);

        expect(await nft.getTokenURI(tokenId)).to.equal(baseURI);
        expect(await nft.uri(tokenId)).to.equal(
          baseURI + tokenId.toString() + ".json"
        );
      });

      it("Should revert if non-admin tries to set URI", async function () {
        const { nft, owner, user1 } = await loadFixture(deployNFTFixture);
        const tokenId = 1;
        const baseURI = "https://api.example.com/metadata/";

        await nft.mint(owner.address, tokenId, 1, "0x");

        await expect(
          nft.connect(user1).setURI(tokenId, baseURI)
        ).to.be.revertedWithCustomError(nft, "Unauthorized");
      });

      it("Should revert if removed admin tries to set URI", async function () {
        const { nft, owner, admin1 } = await loadFixture(deployNFTFixture);
        const tokenId = 1;
        const baseURI = "https://api.example.com/metadata/";

        await nft.addAdmin(admin1.address);
        await nft.mint(owner.address, tokenId, 1, "0x");
        await nft.removeAdmin(admin1.address);

        await expect(
          nft.connect(admin1).setURI(tokenId, baseURI)
        ).to.be.revertedWithCustomError(nft, "Unauthorized");
      });
    });
  });

  describe("ERC-1155 Standard Functions", function () {
    it("Should support safeTransferFrom", async function () {
      const { nft, owner, user1, user2 } = await loadFixture(deployNFTFixture);
      const tokenId = 1;
      const amount = 100;

      // Mint tokens to user1
      await nft.mint(user1.address, tokenId, amount, "0x");

      // Transfer from user1 to user2
      await nft
        .connect(user1)
        .safeTransferFrom(user1.address, user2.address, tokenId, 50, "0x");

      expect(await nft.balanceOf(user1.address, tokenId)).to.equal(50);
      expect(await nft.balanceOf(user2.address, tokenId)).to.equal(50);
    });

    it("Should support safeBatchTransferFrom", async function () {
      const { nft, owner, user1, user2 } = await loadFixture(deployNFTFixture);
      const tokenIds = [1, 2];
      const amounts = [100, 200];

      // Mint tokens to user1
      await nft.mintBatch(user1.address, tokenIds, amounts, "0x");

      // Transfer from user1 to user2
      await nft
        .connect(user1)
        .safeBatchTransferFrom(
          user1.address,
          user2.address,
          tokenIds,
          [50, 100],
          "0x"
        );

      expect(await nft.balanceOf(user1.address, tokenIds[0])).to.equal(50);
      expect(await nft.balanceOf(user1.address, tokenIds[1])).to.equal(100);
      expect(await nft.balanceOf(user2.address, tokenIds[0])).to.equal(50);
      expect(await nft.balanceOf(user2.address, tokenIds[1])).to.equal(100);
    });

    it("Should support setApprovalForAll", async function () {
      const { nft, user1, user2 } = await loadFixture(deployNFTFixture);

      await nft.connect(user1).setApprovalForAll(user2.address, true);
      expect(await nft.isApprovedForAll(user1.address, user2.address)).to.be
        .true;

      await nft.connect(user1).setApprovalForAll(user2.address, false);
      expect(await nft.isApprovedForAll(user1.address, user2.address)).to.be
        .false;
    });
  });

  describe("Complex Admin Scenarios", function () {
    it("Should handle multiple admins minting different tokens", async function () {
      const { nft, owner, admin1, admin2, user1, user2 } = await loadFixture(
        deployNFTFixture
      );

      await nft.addAdmin(admin1.address);
      await nft.addAdmin(admin2.address);

      // Admin1 mints token 1
      await nft.connect(admin1).mint(user1.address, 1, 100, "0x");
      expect(await nft.balanceOf(user1.address, 1)).to.equal(100);

      // Admin2 mints token 2
      await nft.connect(admin2).mint(user2.address, 2, 200, "0x");
      expect(await nft.balanceOf(user2.address, 2)).to.equal(200);

      // Owner mints token 3
      await nft.mint(user1.address, 3, 300, "0x");
      expect(await nft.balanceOf(user1.address, 3)).to.equal(300);

      // Check admin count
      expect(await nft.adminCount()).to.equal(2);
    });

    it("Should handle admin removal and re-addition", async function () {
      const { nft, owner, admin1, user1 } = await loadFixture(deployNFTFixture);

      await nft.addAdmin(admin1.address);
      expect(await nft.adminCount()).to.equal(1);

      // Admin can mint
      await nft.connect(admin1).mint(user1.address, 1, 100, "0x");

      // Remove admin
      await nft.removeAdmin(admin1.address);
      expect(await nft.adminCount()).to.equal(0);

      // Admin can no longer mint
      await expect(
        nft.connect(admin1).mint(user1.address, 2, 100, "0x")
      ).to.be.revertedWithCustomError(nft, "Unauthorized");

      // Re-add admin
      await nft.addAdmin(admin1.address);
      expect(await nft.adminCount()).to.equal(1);

      // Admin can mint again
      await nft.connect(admin1).mint(user1.address, 2, 100, "0x");
      expect(await nft.balanceOf(user1.address, 2)).to.equal(100);
    });

    it("Should handle URI management by multiple admins", async function () {
      const { nft, owner, admin1, admin2 } = await loadFixture(
        deployNFTFixture
      );

      await nft.addAdmin(admin1.address);
      await nft.addAdmin(admin2.address);

      // Mint tokens
      await nft.mint(owner.address, 1, 1, "0x");
      await nft.mint(owner.address, 2, 1, "0x");

      // Admin1 sets URI for token 1
      await nft.connect(admin1).setURI(1, "https://admin1.example.com/");
      expect(await nft.getTokenURI(1)).to.equal("https://admin1.example.com/");

      // Admin2 sets URI for token 2
      await nft.connect(admin2).setURI(2, "https://admin2.example.com/");
      expect(await nft.getTokenURI(2)).to.equal("https://admin2.example.com/");

      // Admin1 can update Admin2's URI
      await nft
        .connect(admin1)
        .setURI(2, "https://admin1-updated.example.com/");
      expect(await nft.getTokenURI(2)).to.equal(
        "https://admin1-updated.example.com/"
      );
    });

    it("Should revert when getting URI for non-existent token", async function () {
      const { nft } = await loadFixture(deployNFTFixture);
      const tokenId = 999;

      await expect(nft.uri(tokenId)).to.be.revertedWithCustomError(
        nft,
        "TokenDoesNotExist"
      );
    });
  });
});
