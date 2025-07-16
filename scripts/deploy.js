const hre = require("hardhat");

async function main() {
  console.log("🚀 Starting deployment of Airswap contracts...");

  // Deploy the NFT contract first
  console.log("📋 Deploying AirswapNFT contract...");

  // Get the contract factory
  const AirswapNFT = await hre.ethers.getContractFactory("AirswapNFT");

  // Contract parameters
  const name = "Airswap NFT Collection";
  const symbol = "ANFT";

  console.log("📋 NFT Contract parameters:");
  console.log(`   Name: ${name}`);
  console.log(`   Symbol: ${symbol}`);

  // Deploy the NFT contract
  console.log("⏳ Deploying NFT contract...");
  const nft = await AirswapNFT.deploy(name, symbol);

  // Wait for deployment to complete
  await nft.waitForDeployment();

  const nftAddress = await nft.getAddress();
  console.log("✅ NFT Contract deployed successfully!");
  console.log(`📍 NFT Contract address: ${nftAddress}`);

  // Deploy the Minter contract
  console.log("📋 Deploying AirswapMinter contract...");

  const AirswapMinter = await hre.ethers.getContractFactory("AirswapMinter");

  // Minter contract parameters
  const sastTokenAddress = "0x0000000000000000000000000000000000000000"; // Replace with actual sAST token address

  console.log("📋 Minter Contract parameters:");
  console.log(`   NFT Contract: ${nftAddress}`);
  console.log(`   sAST Token: ${sastTokenAddress}`);
  console.log(`   Default Mintable Token ID: 0`);
  console.log(`   Default Mint Quantity: 1`);

  // Deploy the minter contract
  console.log("⏳ Deploying Minter contract...");
  const minter = await AirswapMinter.deploy(nftAddress, sastTokenAddress);

  // Wait for deployment to complete
  await minter.waitForDeployment();

  const minterAddress = await minter.getAddress();
  console.log("✅ Minter Contract deployed successfully!");
  console.log(`📍 Minter Contract address: ${minterAddress}`);

  // Verify the NFT deployment
  console.log("🔍 Verifying NFT deployment...");
  const deployedName = await nft.name();
  const deployedSymbol = await nft.symbol();
  const owner = await nft.owner();
  const adminCount = await nft.adminCount();

  console.log("📊 NFT Deployment verification:");
  console.log(`   Contract name: ${deployedName}`);
  console.log(`   Contract symbol: ${deployedSymbol}`);
  console.log(`   Owner: ${owner}`);
  console.log(`   Initial admin count: ${adminCount}`);

  // Verify the Minter deployment
  console.log("🔍 Verifying Minter deployment...");
  const minterNFTContract = await minter.nftContract();
  const minterSASTToken = await minter.sastToken();
  const minterTokenId = await minter.mintableTokenId();
  const minterQuantity = await minter.mintQuantity();
  const minterOwner = await minter.owner();

  console.log("📊 Minter Deployment verification:");
  console.log(`   NFT Contract: ${minterNFTContract}`);
  console.log(`   sAST Token: ${minterSASTToken}`);
  console.log(`   Mintable Token ID: ${minterTokenId}`);
  console.log(`   Mint Quantity: ${minterQuantity}`);
  console.log(`   Owner: ${minterOwner}`);

  // Optional: Verify contracts on Etherscan (if not on localhost)
  if (hre.network.name !== "localhost" && hre.network.name !== "hardhat") {
    console.log("🔍 Waiting for block confirmations before verification...");
    await nft.deploymentTransaction().wait(6); // Wait 6 block confirmations
    await minter.deploymentTransaction().wait(6);

    try {
      console.log("🔍 Verifying NFT contract on Etherscan...");
      await hre.run("verify:verify", {
        address: nftAddress,
        constructorArguments: [name, symbol],
      });
      console.log("✅ NFT Contract verified on Etherscan!");
    } catch (error) {
      console.log("⚠️  NFT Contract verification failed:", error.message);
    }

    try {
      console.log("🔍 Verifying Minter contract on Etherscan...");
      await hre.run("verify:verify", {
        address: minterAddress,
        constructorArguments: [nftAddress, sastTokenAddress],
      });
      console.log("✅ Minter Contract verified on Etherscan!");
    } catch (error) {
      console.log("⚠️  Minter Contract verification failed:", error.message);
    }
  }

  console.log("🎉 Deployment completed successfully!");
  console.log("📝 Next steps:");
  console.log("   1. Update the sAST token address in the minter contract");
  console.log("   2. Add admins to the NFT contract using addAdmin(address)");
  console.log("   3. Set up your metadata URIs using setURI(tokenId, uri)");
  console.log("   4. Test the minting functionality");

  return {
    nftAddress,
    minterAddress,
    name: deployedName,
    symbol: deployedSymbol,
    owner,
    adminCount,
    mintableTokenId: minterTokenId,
    mintQuantity: minterQuantity,
    minterOwner,
  };
}

// Handle errors
main()
  .then((result) => {
    console.log("🏁 Deployment script finished successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
