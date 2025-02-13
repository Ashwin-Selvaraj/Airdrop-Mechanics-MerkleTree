const { StandardMerkleTree } = require("@openzeppelin/merkle-tree");
const fs = require("fs");
// (1) Load values from JSON file
const data = JSON.parse(fs.readFileSync("./MerkleTree/whitelistValues.json", "utf8"));

// (2) Convert JSON data into an array format compatible with the Merkle Tree
const values = data.map(({ address, id, value }) => [address, id, value]);

// (3) Create the Merkle Tree
const tree = StandardMerkleTree.of(values, ["address", "uint256", "uint256"]);

// (5) Save the tree structure to a JSON file
fs.writeFileSync("./MerkleTree/tree.json", JSON.stringify(tree.dump()));
