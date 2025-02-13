const { ethers } = require("ethers");
require("dotenv").config();
const { readFileSync } = require("fs");

// Load environment variables
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const CONTRACT_ADDRESS = require("../../deployments/BSCTestnet.json").AirdropContractAddress;
const TOKEN_CONTRACT_ADDRESS = require("../../deployments/BSCTestnet.json").TheMemeTVContractAddress;
const ABI = require("../../artifacts/contracts/Airdrop.sol/Airdrop.json").abi; // Ensure you have the artifact of your contract
const TokenABI = require("../../artifacts/contracts/TheMemeTV.sol/TheMemeTV.json").abi; // Ensure you have the artifact of your contract

// Load recipients and amounts from JSON file
const { recipients, amounts } = JSON.parse(readFileSync('./ignition/modules/airdropAddresses&Amounts.json', 'utf8'));

async function executeBulkTransfer(recipients, amounts) {
    try {
        // Check for missing environment variables
        if (!PRIVATE_KEY) throw new Error("Private key not found in environment variables. Please set PRIVATE_KEY in your .env file.");
        if (!CONTRACT_ADDRESS) throw new Error("Contract address not found in deployment file. Ensure the deployments file is correctly configured.");
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
                throw new Error("Invalid or unsupported network provided. Check the NETWORK variable in your .env file.");
        }

        // Check provider readiness
        if (!provider) throw new Error("Provider initialization failed. Verify the RPC URLs in your .env file.");

        // Create a signer (wallet)
        const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

        // Connect to the contract
        const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, wallet);
        const tokenContract = new ethers.Contract(TOKEN_CONTRACT_ADDRESS, TokenABI, wallet);

        const contractOwner = await contract.owner();
        if(contractOwner!=wallet.address){
            throw new Error("Ownable: caller is not the owner");
        }
        // Check inputs
        if (recipients.length !== amounts.length) {
            throw new Error("Recipients and amounts array length mismatch. Ensure both arrays have the same number of entries.");
        }
        if (recipients.length === 0) {
            throw new Error("Recipients array is empty. Provide at least one recipient address.");
        }
        if (recipients.some(addr => !ethers.isAddress(addr))) {
            throw new Error("Invalid recipient address detected. Check that all addresses are valid Ethereum addresses.");
        }

        // Check for duplicate addresses
        const uniqueRecipients = new Set(recipients);
        if (uniqueRecipients.size !== recipients.length) {
            throw new Error("Duplicate recipient addresses detected. Ensure all addresses in the recipients array are unique.");
        }

        // Validate token allowance and balance
        const totalAmount = amounts.reduce((sum, amt) => sum + amt, 0);
        const allowance = await tokenContract.allowance(wallet.address, CONTRACT_ADDRESS);
        const allowanceInEther = ethers.formatEther(allowance);

        if (allowanceInEther < totalAmount) {
            throw new Error(
                `Insufficient allowance. Approve at least ${totalAmount} tokens to the contract address. Current allowance: ${allowanceInEther}.`
            );
        }

        // Execute the bulkTransfer function
        console.log("Initiating bulk transfer...");

        const tx = await contract.bulkTransfer(
            recipients,
            amounts
            // { gasLimit: 10000000 } // Adjust as necessary
        );

        // Wait for transaction confirmation
        console.log("Transaction sent. Waiting for confirmation...");
        const receipt = await tx.wait();
        console.log("Bulk transfer completed successfully.");
        console.log(`Transaction hash: ${receipt.transactionHash}`);
    } catch (error) {
        console.error("Error executing bulk transfer:", error.message || error);
        console.error("Stack trace:", error.stack);
    }
}

executeBulkTransfer(recipients, amounts);

