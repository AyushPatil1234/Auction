const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const AuctionManager = await hre.ethers.getContractFactory("AuctionManager");
  const auctionManager = await AuctionManager.deploy();

  await auctionManager.waitForDeployment();
  const address = await auctionManager.getAddress();

  console.log(`AuctionManager deployed to: ${address}`);

  // Save the contract's address and ABI for the frontend
  saveFrontendFiles(address);
}

function saveFrontendFiles(address) {
  const contractsDir = path.join(__dirname, "..", "..", "frontend", "src", "contracts");

  if (!fs.existsSync(contractsDir)) {
    fs.mkdirSync(contractsDir, { recursive: true });
  }

  // Save address
  fs.writeFileSync(
    path.join(contractsDir, "contract-address.json"),
    JSON.stringify({ AuctionManager: address }, undefined, 2)
  );

  // Save ABI
  const AuctionManagerArtifact = hre.artifacts.readArtifactSync("AuctionManager");

  fs.writeFileSync(
    path.join(contractsDir, "AuctionManager.json"),
    JSON.stringify(AuctionManagerArtifact, null, 2)
  );

  console.log("Saved ABI to frontend/src/contracts");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
