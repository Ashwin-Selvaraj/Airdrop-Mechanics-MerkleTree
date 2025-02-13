const { expect } = require('chai');
// import { expect } from 'chai';
const { ethers } = require('hardhat');
// import { ethers } from 'hardhat';
require('dotenv').config();

describe('TheMemeTV Contract', function () {
    let TheMemeTV, memeTV;
    let owner, addr1, addr2, addr3, addr4, spender;
    const tokenName = "The Meme TV";
    const tokenSymbol = "MEMETV"
    const privateKey=process.env.PRIVATE_KEY;
    let merkleRoot = "0x451a40b23dd7e251843c8612d7008aa9af09565e2b0b71b1b50c4aa2e52cd1f2";

    beforeEach(async function () {
        // Get the ContractFactory and Signers here.
        TheMemeTV = await ethers.getContractFactory('TheMemeTV');
          // Provider for Sepolia Testnet
        const provider = new ethers.JsonRpcProvider(
            "https://restless-responsive-county.bsc-testnet.quiknode.pro/e8596af8dc28ad6ae70ea957eea500d4af507877"
        );
        // const owner = new ethers.Wallet(privateKey,provider);
        // Contracts are deployed using the first signer/account by default
        [owner, addr1, addr2, addr3, addr4, spender] = await ethers.getSigners();

        // Deploy the contract
        //deployment using my address to deploy it onchain
        // memeTV = await TheMemeTV.connect(owner).deploy(merkleRoot);
        memeTV = await TheMemeTV.deploy(merkleRoot);
        await memeTV.waitForDeployment();
        
    });

    describe('Deployment', function () {
        it('Should set the right owner', async function () {
            expect(await memeTV.owner()).to.equal(owner.address);
        });

        it('Should initialize with correct constructor values', async function () {
            expect(await memeTV.merkleRoot()).to.equal(merkleRoot);
        });

        it('Should initialize with correct Token name', async function () {
            expect(await memeTV.name()).to.equal(tokenName);
        });

        it('Should initialize with correct Token Symbol', async function () {
            expect(await memeTV.symbol()).to.equal(tokenSymbol);
        });

        it('Owner balance should match the team allocation tokens', async function () {
            const teamAllocation = await memeTV.TEAM_SUPPLY(); // Fetch the team allocation
            const ownerBalance = await memeTV.balanceOf(owner.address); // Fetch the owner's balance
        
            // Convert both values to BigInt for comparison
            expect(BigInt(ownerBalance)).to.equal(BigInt(teamAllocation) * BigInt(10 ** 18)); // Adjust for decimals
        });
    });

    describe('updateMerkleRoot', function () {
        it('Should update the merkle root when called by the owner and after a day has passed', async function () {
            const newMerkleRoot = "0xe826318f7ef5c07046101c31c001af65f32584983a05eb3db3d230f84d849888";
            const lastUpdatedDay = await memeTV.lastUpdatedDay();
            const unixTimestampSeconds = Math.floor((Date.now() / 1000) / 86400);
            if(unixTimestampSeconds>lastUpdatedDay){
                console.log(lastUpdatedDay,"lastUpdatedDay");
                console.log(unixTimestampSeconds,"unixTimeStampInSeconds");
                await memeTV.updateMerkleRoot(newMerkleRoot);
                const updatedMerkleRoot = await memeTV.merkleRoot();
                expect(updatedMerkleRoot).to.equal(newMerkleRoot);
            }
        });

        it('Should revert if called more than once in the same day', async function () {
            const newMerkleRoot = "0xe826318f7ef5c07046101c31c001af65f32584983a05eb3db3d230f84d849888";
            await expect(
                memeTV.updateMerkleRoot(newMerkleRoot)
            ).to.be.revertedWith('Merkle root can only be updated once per day');
        });
        
        it('Should revert if called by a non-owner', async function () {
            const newMerkleRoot = "0xe826318f7ef5c07046101c31c001af65f32584983a05eb3db3d230f84d849888";
            await expect(
                memeTV.connect(addr1).updateMerkleRoot(newMerkleRoot)
            ).to.be.revertedWith('Ownable: caller is not the owner');
        });
    });

    describe('distributeTokens', function () {
        it('Should transfer the correct amount of tokens to the distribution wallet', async function () {
            const distributionWallet = addr1.address;
            const supply = 1000n; // Use BigInt for large numbers
            const supplyWithDecimals = supply * 10n ** 18n;
        
            await memeTV.distributeTokens(distributionWallet, supply);
        
            const balance = await memeTV.balanceOf(distributionWallet);
            expect(BigInt(balance)).to.equal(supplyWithDecimals);
        });
    
        it('Should revert if the sender does not have enough tokens', async function () {
            const distributionWallet = addr1.address;
            const supply = 1000n; // Use BigInt for large numbers
            const supplyWithDecimals = supply * 10n ** 18n;
        
            await expect(
                memeTV.distributeTokens(distributionWallet, supplyWithDecimals)
            ).to.be.revertedWith('ERC20: transfer amount exceeds balance');
        });
    });
    

    describe('Minting Functions', function () {
        it('Should mint liquidity tokens up to the cap', async function () {
            const liquidityAmount = 1000n; // Use BigInt
            const liquidityAmountWithDecimals = liquidityAmount * 10n ** 18n; // Add decimals
    
            await memeTV.mintLiquidity(addr1.address, liquidityAmount);
            const balance = await memeTV.balanceOf(addr1.address);
            expect(BigInt(balance)).to.equal(liquidityAmountWithDecimals);
        });
    
        it('Should revert if liquidity cap is exceeded', async function () {
            const liquidityAmount = 42000000001n; // Use BigInt
            const liquidityAmountWithDecimals = liquidityAmount * 10n ** 18n;
    
            await expect(
                memeTV.mintLiquidity(owner.address, liquidityAmountWithDecimals)
            ).to.be.revertedWith('ERC20Capped: Liquidity cap exceeded');
        });
    
        it('Should mint marketing tokens up to the cap', async function () {
            const marketingAmount = 1000n; // Use BigInt
            const marketingAmountWithDecimals = marketingAmount * 10n ** 18n;
    
            await memeTV.mintMarketing(addr2.address, marketingAmount);
            const balance = await memeTV.balanceOf(addr2.address);
            expect(BigInt(balance)).to.equal(marketingAmountWithDecimals);
        });
    
        it('Should revert if marketing cap is exceeded', async function () {
            const marketingAmount = 10000000001n; // Use BigInt
            const marketingAmountWithDecimals = marketingAmount * 10n ** 18n;
    
            await expect(
                memeTV.mintMarketing(owner.address, marketingAmountWithDecimals)
            ).to.be.revertedWith('ERC20Capped: Marketing cap exceeded');
        });
    
        it('Should mint airdrop tokens up to the cap', async function () {
            const airdropAmount = 1000n; // Use BigInt
            const airdropAmountWithDecimals = airdropAmount * 10n ** 18n;
    
            await memeTV.mintAirdrop(addr3.address, airdropAmount);
            const balance = await memeTV.balanceOf(addr3.address);
            expect(BigInt(balance)).to.equal(airdropAmountWithDecimals);
        });
    
        it('Should revert if airdrop cap is exceeded', async function () {
            const airdropAmount = 11000000001n; // Use BigInt
            const airdropAmountWithDecimals = airdropAmount * 10n ** 18n;
    
            await expect(
                memeTV.mintAirdrop(owner.address, airdropAmountWithDecimals)
            ).to.be.revertedWith('ERC20Capped: Airdrop cap exceeded');
        });

        it("should mint proof of nothing tokens up to the cap", async function(){
            const proofOfNothingAmount = 1000n;
            const proofOfNothingAmountWithDecimals = (proofOfNothingAmount * 10n**18n);

            await memeTV.mintProofOfNothing(addr4.address, proofOfNothingAmount);
            const balance = await memeTV.balanceOf(addr4.address);
            expect(BigInt(balance)).to.equal(proofOfNothingAmountWithDecimals);
        })
    });


    describe('claimDistributionAirDrop', function () {
        it('Should allow whitelisted address to claim tokens with valid proof', async function () {
            const initialBalance = await memeTV.balanceOf(owner.address);
            const index = 2;
            const amount = 30n;
            const amountInDecimals = (amount*10n**18n);
            const proof = 
                [
                  "0x1df569a9544a2de72e77b0fc5b3e4d764aa2ca3104cab7a10a2c2d869704e755",
                  "0x2e47e4378a4fd6581269e896e0c255857bbecd0c40b7b609fd0cb42d105aede1",
                  "0xa58d900762c28d160cccbe927202329b3b0009e1a5206605befb410613cfa63a"
                ]; // Replace with a valid proof for testing
    
            await memeTV.claimDistributionAirDrop(proof, index, amount);
            const finalBalance = await memeTV.balanceOf(owner.address);
            expect(BigInt(initialBalance)+amountInDecimals).to.equal(BigInt(finalBalance));
        });
    
        it('Should revert if proof is invalid', async function () {
            const index = 0;
            const amount = 100;
            const proof = []; // Invalid proof
    
            await expect(
                memeTV.claimDistributionAirDrop(proof, index, amount)
            ).to.be.revertedWith('Invalid proof');
        });
    
        it('Should revert if tokens have already been claimed', async function () {
            const index = 2;
            const amount = 30n;
            const proof = 
                [
                  "0x1df569a9544a2de72e77b0fc5b3e4d764aa2ca3104cab7a10a2c2d869704e755",
                  "0x2e47e4378a4fd6581269e896e0c255857bbecd0c40b7b609fd0cb42d105aede1",
                  "0xa58d900762c28d160cccbe927202329b3b0009e1a5206605befb410613cfa63a"
                ]; // Replace with a valid proof for testing
    
            await memeTV.claimDistributionAirDrop(proof, index, amount);
            await expect(
                memeTV.claimDistributionAirDrop(proof, index, amount)
            ).to.be.revertedWith('Already claimed');
        });
    });

    describe("ERC20 Approve and Allowance Tests", function () {
    
        it("Should allow a spender to spend tokens on behalf of the owner", async function () {
            const amountInDecimals = 100n * (10n **18n); // Approve 100 tokens
            await memeTV.approve(spender.address, amountInDecimals);
    
            const allowance = await memeTV.allowance(owner.address, spender.address);
            expect(allowance).to.equal(amountInDecimals);
        });
    
        it("Should correctly update the allowance after multiple approvals", async function () {
            const initialAmountInDecimals = 50n * (10n **18n)
            const newAmountInDecimals  = 100n * (10n **18n);
    
            // Approve 50 tokens
            await memeTV.approve(spender.address, initialAmountInDecimals);
            let allowance = await memeTV.allowance(owner.address, spender.address);
            expect(allowance).to.equal(initialAmountInDecimals);
    
            // Update approval to 100 tokens
            await memeTV.approve(spender.address, newAmountInDecimals);
            allowance = await memeTV.allowance(owner.address, spender.address);
            expect(allowance).to.equal(newAmountInDecimals );
        });
    
        it("Should revert allowance to zero when approving a new amount", async function () {
            const initialAmountInDecimals = 50n * (10n **18n)
            const newAmountInDecimals  = 100n * (10n **18n);
    
            // Approve 200 tokens
            await memeTV.approve(spender.address, initialAmountInDecimals);
            let allowance = await memeTV.allowance(owner.address, spender.address);
            expect(allowance).to.equal(initialAmountInDecimals);
    
            // Approve 100 tokens (overrides previous allowance)
            await memeTV.approve(spender.address, newAmountInDecimals);
            allowance = await memeTV.allowance(owner.address, spender.address);
            expect(allowance).to.equal(newAmountInDecimals);
        });
    
        it("Should allow a spender to decrease allowance", async function () {
            const initialAmountInDecimals = 500n * (10n **18n)
            const newAmountInDecimals  = 100n * (10n **18n);
    
            // Approve 100 tokens
            await memeTV.approve(spender.address, initialAmountInDecimals);
    
            // Decrease allowance by 40 tokens
            await memeTV.decreaseAllowance(spender.address,  newAmountInDecimals);
    
            const allowance = await memeTV.allowance(owner.address, spender.address);
            // Verify the allowance after decrease
            expect(allowance).to.equal(initialAmountInDecimals - newAmountInDecimals);
        });
    
        it("Should revert when trying to decrease allowance below zero", async function () {
            const initialAmountInDecimals = 50n * (10n **18n)
            const newAmountInDecimals  = 100n * (10n **18n);
    
            // Approve 50 tokens
            await memeTV.approve(spender.address, initialAmountInDecimals);
    
            // Try to decrease allowance by 60 tokens (should fail)
            await expect(
                memeTV.decreaseAllowance(spender.address, newAmountInDecimals)
            ).to.be.revertedWith("ERC20: decreased allowance below zero");
        });
    
        it("Should allow a spender to increase allowance", async function () {
            const initialAmountInDecimals = 100n * (10n **18n)
            const newAmountInDecimals  = 50n * (10n **18n);
    
            // Approve 100 tokens
            await memeTV.approve(spender.address, initialAmountInDecimals);
    
            // Increase allowance by 50 tokens
            await memeTV.increaseAllowance(spender.address, newAmountInDecimals);
    
            const allowance = await memeTV.allowance(owner.address, spender.address);
            expect(allowance).to.equal(initialAmountInDecimals + newAmountInDecimals);
        });
    });
});