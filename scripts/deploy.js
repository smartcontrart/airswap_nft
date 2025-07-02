const hre = require("hardhat");

async function main() {
  console.log("🚀 Starting deployment of AirswapNFT contract...");

  // Get the contract factory
  const AirswapNFT = await hre.ethers.getContractFactory("AirswapNFT");

  // Deploy the contract
  console.log("⏳ Deploying contract...");
  const nft = await AirswapNFT.deploy(name, symbol);

  // Wait for deployment to complete
  await nft.waitForDeployment();

  const contractAddress = await nft.getAddress();
  console.log("✅ Contract deployed successfully!");
  console.log(`📍 Contract address: ${contractAddress}`);

  // Verify the deployment
  console.log("🔍 Verifying deployment...");
  const deployedName = await nft.name();
  const deployedSymbol = await nft.symbol();
  const owner = await nft.owner();
  const adminCount = await nft.adminCount();

  console.log("📊 Deployment verification:");
  console.log(`   Contract name: ${deployedName}`);
  console.log(`   Contract symbol: ${deployedSymbol}`);
  console.log(`   Owner: ${owner}`);
  console.log(`   Initial admin count: ${adminCount}`);

  // Optional: Verify contract on Etherscan (if not on localhost)
  if (hre.network.name !== "localhost" && hre.network.name !== "hardhat") {
    console.log("🔍 Waiting for block confirmations before verification...");
    await nft.deploymentTransaction().wait(6); // Wait 6 block confirmations

    try {
      console.log("🔍 Verifying contract on Etherscan...");
      await hre.run("verify:verify", {
        address: contractAddress,
        constructorArguments: [name, symbol],
      });
      console.log("✅ Contract verified on Etherscan!");
    } catch (error) {
      console.log("⚠️  Contract verification failed:", error.message);
    }
  }

  return {
    contractAddress,
    name: deployedName,
    symbol: deployedSymbol,
    owner,
    adminCount,
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
