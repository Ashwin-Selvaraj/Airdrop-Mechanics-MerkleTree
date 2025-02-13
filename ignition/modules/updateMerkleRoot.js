const { ethers } = require("ethers");
require("dotenv").config();
const { StandardMerkleTree } = require("@openzeppelin/merkle-tree");
const {readFileSync} = require("fs");

// Load environment variables
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const CONTRACT_ADDRESS = require("../../deployments/BSCTestnet.json").TheMemeTVContractAddress;
const ABI = require("../../artifacts/contracts/TheMemeTV.sol/TheMemeTV.json").abi; // Ensure you have the artifact of your contract

async function updateMerkleRoot() {
    try {
        // Check for missing environment variables
        if (!PRIVATE_KEY) throw new Error("Private key not found in environment variables.");
        if (!CONTRACT_ADDRESS) throw new Error("Contract address not found in deployment file.");
        if (!ABI) throw new Error("Contract ABI not found. Ensure the artifact file is correctly referenced.");

        let provider;
        const network = process.env.NETWORK || "testnet"; // Default to testnet if no network is provided

        // Set provider based on the environment (Testnet or Mainnet)
        switch (network) {
            case "mainnet":
                provider = new ethers.JsonRpcProvider(process.env.MAINNET_RPC_URL);
                break;
            case "sepolia":
                provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
                break;
            case "matic":
                provider = new ethers.JsonRpcProvider(process.env.MATIC_RPC_URL);
                break;
            case "BSCTestnet":
                provider = new ethers.JsonRpcProvider(process.env.BSC_TESTNET_RPC_URL);
                break;
            case "scrollSepolia":
                provider = new ethers.JsonRpcProvider(process.env.SCROLL_SEPOLIA_RPC_URL);
                break;
            default:
                throw new Error("Invalid or unsupported network provided. Check the NETWORK variable.");
        }

        // Check provider readiness
        if (!provider) throw new Error("Provider initialization failed. Verify the RPC URLs.");

        // Create a signer (wallet)
        const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

        // Connect to the contract
        const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, wallet);

        // Read Merkle root from the JSON file
        const merkleTreeData = StandardMerkleTree.load(JSON.parse(readFileSync("./MerkleTree/tree.json")));
        const newMerkleRoot = merkleTreeData.root;

        // Validate the new Merkle root
        if (!ethers.isHexString(newMerkleRoot) || newMerkleRoot.length !== 66) {
            throw new Error("Invalid Merkle root format. Ensure it is a 32-byte hexadecimal string.");
        }

        // Get current on-chain state
        const currentMerkleRoot = await contract.merkleRoot();
        const lastUpdatedDay = await contract.lastUpdatedDay();
        const currentDay = Math.floor(Date.now() / (1000 * 60 * 60 * 24)); // Current day in UTC

        // Check contract conditions
        if (currentDay <= lastUpdatedDay) {
            throw new Error(
                "Merkle root can only be updated once per day. Wait until the next day to update."
            );
        }
        if (currentMerkleRoot === newMerkleRoot) {
            throw new Error("The new Merkle root is the same as the current one. Provide a different root.");
        }

        // Call the updateMerkleRoot function
        console.log(`Updating Merkle Root to: ${newMerkleRoot}`);
        const tx = await contract.updateMerkleRoot(newMerkleRoot);

        // Wait for the transaction to be mined
        console.log("Transaction sent. Waiting for confirmation...");
        const receipt = await tx.wait();

        console.log("Merkle Root updated successfully!");
        console.log(`Transaction Hash: ${receipt.transactionHash}`);
    } catch (error) {
        if (error.reason) {
            // Error from the contract or provider
            console.error("Smart contract error:", error.reason);
        } else {
            // General error
            console.error("Error updating Merkle Root:", error.message || error);
        }
    }
}

// Execute the function
updateMerkleRoot();
