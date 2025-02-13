const { ethers } = require("ethers");
require("dotenv").config();
const {readFileSync, writeFileSync } = require("fs");

// Load JSON data
const jsonData = JSON.parse(readFileSync("./AirdropFiles/Airdrop.json", "utf8"));

// Private key of the admin who will sign the messages
const private_key = process.env.PRIVATE_KEY;
// Initialize signer
const wallet = new ethers.Wallet(private_key);

async function generateSignatures() {
    const signatures = [];
    for (let i = 0; i < jsonData.recipients.length; i++) {
        const recipient = jsonData.recipients[i];
        const amount = jsonData.amounts[i];

        // Encode the data
        // const messageHash = ethers.keccak256(
        //     abiCoder.encode(["address", "uint256"], [recipient, amount])
        // );
        const messageHash = ethers.solidityPackedKeccak256(["address", "uint256"], [recipient, amount]);

        // Sign the message (Ethereum Signed Message)
        //This line is not required for creaating signatures
        // const ethSignedMessage = ethers.hashMessage(ethers.getBytes(messageHash));

        const signature = await wallet.signMessage(ethers.getBytes(messageHash));
        signatures.push({
            recipient,
            amount,
            signature
        });

        console.log(`Signed for ${recipient}: ${signature}`);
    }

    // Save results
    writeFileSync("./AirdropFiles/SignedAirdrop.json", JSON.stringify(signatures, null, 2));
    console.log("Signatures saved to signed_airdrop.json");
}

// Run the script
generateSignatures()
  .then(() => process.exit(0))
  .catch((error) => {
    console.log(error.message);
    process.exit(1);
});
