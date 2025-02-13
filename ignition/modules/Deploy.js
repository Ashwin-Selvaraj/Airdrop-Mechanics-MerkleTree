const { ethers } = require("hardhat");
require("dotenv").config();
const {writeFileSync } = require("fs");

async function main() {
  const private_key = process.env.PRIVATE_KEY;
  const network = process.env.NETWORK || "testnet"; // Default to testnet if no network is provided
  let provider;

  // Set provider based on the environment (Testnet or Mainnet)
  if (network === "mainnet") {
    provider = new ethers.JsonRpcProvider(process.env.MAINNET_RPC_URL);
  } else if (network === "sepolia") {
    provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
  } else if (network === "matic") {
    provider = new ethers.JsonRpcProvider(process.env.MATIC_RPC_URL);
  } else if (network === "BSCTestnet") {
    provider = new ethers.JsonRpcProvider(process.env.BSC_TESTNET_RPC_URL);
  } else if (network === "scrollSepolia") {
    provider = new ethers.JsonRpcProvider(process.env.SCROLL_SEPOLIA_RPC_URL);
  } else {
    console.error("Invalid network provided.");
    process.exit(1);
  }


  const deployer = new ethers.Wallet(private_key, provider);
  console.log(`Deploying contracts with the account: ${deployer.address}`);
  const balance = await provider.getBalance(deployer);
  console.log("Deployer Balance:", ethers.formatEther(balance),process.env.TOKEN_SYMBOL);

  function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Deploying TheMemeTV Contract
  const ASHFactory = await ethers.getContractFactory("AshToken");
  const ash = await ASHFactory.connect(deployer).deploy(); 
  await delay(2000); // Add delay here
  await ash.waitForDeployment();
  console.log(`ASH Token contract address: ${ash.target}`);

  // Deploying Airdrop Contract
  const AirdropFactory = await ethers.getContractFactory("AirdropSignature");
  const airdrop = await AirdropFactory.connect(deployer).deploy(deployer.address, ash.target);
  await delay(2000); // Add delay here
  await airdrop.waitForDeployment();
  console.log(`Airdrop contract address: ${airdrop.target}`);

  // Writing the contract addresses to a JSON file
  writeFileSync(
    `./deployments/${network}.json`,
    JSON.stringify(
      {
        network,
        TheMemeTVContractAddress: ash.target,
        AirdropContractAddress: airdrop.target
      },
      null,
      2
    )
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.log(error.message);
    process.exit(1);
});
  