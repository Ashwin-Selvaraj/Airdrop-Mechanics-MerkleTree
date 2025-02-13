const { ethers } = require("hardhat");
require("dotenv").config();
const {readFileSync,writeFileSync } = require("fs");
const { StandardMerkleTree } = require("@openzeppelin/merkle-tree");

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

  // Read Merkle root from the JSON file
  const merkleTreeData = StandardMerkleTree.load(JSON.parse(readFileSync("./MerkleTree/tree.json")));
  const merkleRoot = merkleTreeData.root;
  
  if (!merkleRoot) {
    console.error("Merkle root is missing in the tree JSON.");
    process.exit(1);
  }

  function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Deploying TheMemeTV Contract
  const TMTVFactory = await ethers.getContractFactory("TheMemeTV");
  const tmtv = await TMTVFactory.connect(deployer).deploy(merkleRoot); // Pass the Merkle root as argument
  await delay(2000); // Add delay here
  await tmtv.waitForDeployment();
  console.log(`TMTV contract address: ${tmtv.target}`);

  // Deploying Airdrop Contract
  const AirdropFactory = await ethers.getContractFactory("Airdrop");
  const airdrop = await AirdropFactory.connect(deployer).deploy(tmtv.target);
  await delay(2000); // Add delay here
  await airdrop.waitForDeployment();
  console.log(`Airdrop contract address: ${airdrop.target}`);

  // Writing the contract addresses to a JSON file
  writeFileSync(
    `./deployments/${network}.json`,
    JSON.stringify(
      {
        network,
        TheMemeTVContractAddress: tmtv.target,
        AirdropContractAddress: airdrop.target,
        MerkleRoot: merkleRoot, // Include the Merkle root in the output
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
  