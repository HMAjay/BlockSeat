// This module provides shared ethers provider/signer/contract access.
const { ethers } = require("ethers");
require("dotenv").config();

// Minimal ABI needed by backend routes.
const CONTRACT_ABI = [
  "function mint(address to,uint256 tokenId,string eventId,string seat,uint256 faceValue) external",
  "function resell(uint256 tokenId,address to,uint256 price) external",
  "function burnOnEntry(uint256 tokenId) external",
  "function ownerOf(uint256 tokenId) external view returns (address)",
  "function getTicketData(uint256 tokenId) external view returns ((uint256 tokenId,string eventId,string seat,uint256 faceValue,uint256 maxResalePrice,bool isUsed,uint256 transferCount))"
];

const provider = new ethers.JsonRpcProvider(process.env.POLYGON_RPC_URL);
const adminSigner = new ethers.Wallet(process.env.ADMIN_PRIVATE_KEY || "", provider);
const contract = new ethers.Contract(
  process.env.CONTRACT_ADDRESS || ethers.ZeroAddress,
  CONTRACT_ABI,
  adminSigner
);

module.exports = { provider, adminSigner, contract, CONTRACT_ABI };
