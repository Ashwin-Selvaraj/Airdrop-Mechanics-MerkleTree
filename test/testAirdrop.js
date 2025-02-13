const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Airdrop Contract", function () {
    let Airdrop, airdrop, TheMemeTV, memeTV, owner, addr1, addr2, recipient;
    let merkleRoot = "0x451a40b23dd7e251843c8612d7008aa9af09565e2b0b71b1b50c4aa2e52cd1f2";
    beforeEach(async function () {
        [owner, addr1, addr2, recipient] = await ethers.getSigners();
        //Deploy MemeToken Contract
        TheMemeTV = await ethers.getContractFactory('TheMemeTV');
        memeTV = await TheMemeTV.deploy(merkleRoot);
        await memeTV.waitForDeployment();
        // Deploy Airdrop contract
        Airdrop = await ethers.getContractFactory("Airdrop");
        airdrop = await Airdrop.deploy(await memeTV.target);
        await airdrop.waitForDeployment();
    });

    it("should deploy the contract with the correct memeTV address", async function () {
        expect(await airdrop.token()).to.equal(memeTV.target);
    });

    it("should allow the owner to pause and unpause the contract", async function () {
        await airdrop.pause();
        expect(await airdrop.paused()).to.equal(true);

        await airdrop.unpause();
        expect(await airdrop.paused()).to.equal(false);
    });

    it("should transfer tokens in bulk to valid recipients", async function () {
        const recipients = [addr1.address, addr2.address];
        const amounts = [10n, 20n];

        const amount = 1000n;//Use BigInt
        const amountWithDecimals = amount* 10n ** 18n;

        await memeTV.approve(airdrop.target, amountWithDecimals);
        const initialBalance1 = await memeTV.balanceOf(addr1.address);
        const initialBalance2 = await memeTV.balanceOf(addr2.address);

        await airdrop.bulkTransfer(recipients, amounts);

        const finalBalance1 = await memeTV.balanceOf(addr1.address);
        const finalBalance2 = await memeTV.balanceOf(addr2.address);

        expect(BigInt(finalBalance1)).to.equal(BigInt(initialBalance1) + amounts[0] * 10n**18n);
        expect(BigInt(finalBalance2)).to.equal(BigInt(initialBalance2) + amounts[1] * 10n**18n);
    });

    it("should fail if recipients and amounts arrays are mismatched", async function () {
        const recipients = [addr1.address];
        const amounts = [10, 20]; // Mismatch

        await expect(
            airdrop.bulkTransfer(recipients, amounts)
        ).to.be.revertedWith("The number of recipients should be equal to the number of amounts");
    });

    it("should return the correct allowance for the contract", async function () {
        const amount = 1000n;//Use BigInt
        const amountWithDecimals = amount* 10n ** 18n;
        await memeTV.approve(airdrop.target, amountWithDecimals);
        const allowance = await airdrop.checkAllowance(owner.address);
        expect(BigInt(allowance)).to.equal(amountWithDecimals);
    });

    it("should allow the owner to recover tokens", async function () {
        const amount = 10n;//Use BigInt
        const amountWithDecimals = amount* 10n ** 18n;
        await memeTV.transfer(airdrop.target,amountWithDecimals);

        const initialRecipientBalance = await memeTV.balanceOf(recipient.address);

        await airdrop.recoverTokens(memeTV.target, recipient.address);

        const finalRecipientBalance = await memeTV.balanceOf(recipient.address);
        expect(BigInt(finalRecipientBalance)).to.equal(BigInt(initialRecipientBalance) + amountWithDecimals);
    });

    it("should fail if recoverTokens is called by non-owner", async function () {
        await expect(
            airdrop.connect(addr1).recoverTokens(memeTV.target, recipient.address)
        ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("should not allow bulkTransfer when paused", async function () {
        const recipients = [addr1.address];
        const amounts = [10n];
    
        // Pause the contract
        await airdrop.pause();
    
        // Expect the bulkTransfer function to revert with the custom error EnforcedPause
        await expect(
            airdrop.bulkTransfer(recipients, amounts)
        ).to.be.revertedWithCustomError(airdrop, "EnforcedPause");
    
        // Unpause the contract to ensure normal functionality
        await airdrop.unpause();
    });
    

    it("should reject Ether sent to the contract", async function () {
        const amount = 10n;//Use BigInt
        const amountWithDecimals = amount* 10n ** 18n;
        await expect(
            owner.sendTransaction({ to: airdrop.target, value: amountWithDecimals })
        ).to.be.revertedWith("Contract cannot accept Ether");
    });
});
