const { StandardMerkleTree } = require("@openzeppelin/merkle-tree");
const fs = require("fs");
const readline = require("readline");

// readline interface for interacting with the user through the terminal
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question("Enter the address: ", (inputAddress) => {
  const tree = StandardMerkleTree.load(JSON.parse(fs.readFileSync("./MerkleTree/tree.json")));

  // Get the Merkle root of the tree
  const merkleRoot = tree.root;

  for (const [i, v] of tree.entries()) {
    if (v[0] === inputAddress) {
      const proof = tree.getProof(i);

      // Create an object to store the address, proof, and root in json
      const proofData = {
        root: merkleRoot,
        address: v[0],
        proof: proof
      };

      // Write the proof data to a JSON file
      fs.writeFileSync("./MerkleTree/generatedProofData.json", JSON.stringify(proofData, null, 2));
      
      rl.close();
      return;
    }
  }

  console.error("Error: Address not found in the Merkle Tree.");
  rl.close();
});
