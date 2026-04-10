const hre = require("hardhat");
async function main() {
  const Contract = await hre.ethers.getContractFactory("BlockSeatTicket");
  const contract = await Contract.deploy();
  await contract.waitForDeployment();
  const address = await contract.getAddress();
  console.log("BlockSeatTicket deployed to:", address);
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});