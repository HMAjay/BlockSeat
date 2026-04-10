// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// OpenZeppelin imports provide secure ERC721 ownership and access control.
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract BlockSeatTicket is ERC721, Ownable {
    // This struct stores complete metadata and state for each NFT ticket.
    struct TicketData {
        uint256 tokenId;
        string eventId;
        string seat;
        uint256 faceValue;
        uint256 maxResalePrice;
        bool isUsed;
        uint256 transferCount;
    }

    // Mapping from token ID to extended ticket metadata.
    mapping(uint256 => TicketData) public ticketData;

    // Hardcoded transfer window gate for now (acts as "48h window open/closed" switch).
    bool public resaleWindowOpen = true;

    event TicketMinted(uint256 indexed tokenId, address indexed to, string eventId, string seat);
    event TicketResold(uint256 indexed tokenId, address indexed from, address indexed to, uint256 price);
    event TicketUsed(uint256 indexed tokenId);

    constructor() ERC721("BlockSeat Ticket", "BSTIX") {}

    // Admin mints ticket NFTs while enforcing anti-hoarding limit of max 4 tickets per wallet.
    function mint(
        address to,
        uint256 tokenId,
        string memory eventId,
        string memory seat,
        uint256 faceValue
    ) external onlyOwner {
        require(to != address(0), "Invalid recipient");
        require(!_ownerExists(tokenId), "Token already minted");
        require(balanceOf(to) < 4, "Max 4 tickets per wallet");

        _safeMint(to, tokenId);
        uint256 cappedResalePrice = (faceValue * 110) / 100; // 10% cap above face value.

        ticketData[tokenId] = TicketData({
            tokenId: tokenId,
            eventId: eventId,
            seat: seat,
            faceValue: faceValue,
            maxResalePrice: cappedResalePrice,
            isUsed: false,
            transferCount: 0
        });

        emit TicketMinted(tokenId, to, eventId, seat);
    }

    // Ticket owner can resell only within allowed price cap and transfer window.
    function resell(uint256 tokenId, address to, uint256 price) external {
        require(_ownerExists(tokenId), "Token does not exist");
        require(ownerOf(tokenId) == msg.sender, "Not token owner");
        require(to != address(0), "Invalid buyer");
        require(!ticketData[tokenId].isUsed, "Ticket already used");
        require(resaleWindowOpen, "Resale window closed");
        require(price <= ticketData[tokenId].maxResalePrice, "Price exceeds cap");
        require(balanceOf(to) < 4, "Buyer exceeds wallet limit");

        _transfer(msg.sender, to, tokenId);
        ticketData[tokenId].transferCount += 1;

        emit TicketResold(tokenId, msg.sender, to, price);
    }

    // Admin marks ticket as consumed at gate; this action is irreversible.
    function burnOnEntry(uint256 tokenId) external onlyOwner {
        require(_ownerExists(tokenId), "Token does not exist");
        require(!ticketData[tokenId].isUsed, "Ticket already used");

        ticketData[tokenId].isUsed = true;
        emit TicketUsed(tokenId);
    }

    // Admin helper to control transfer window without redeploying contract.
    function setResaleWindowOpen(bool open) external onlyOwner {
        resaleWindowOpen = open;
    }

    // Public getter to fetch complete ticket metadata.
    function getTicketData(uint256 tokenId) external view returns (TicketData memory) {
        require(_ownerExists(tokenId), "Token does not exist");
        return ticketData[tokenId];
    }

    // Internal existence check compatible with OpenZeppelin ERC721 v5.
    function _ownerExists(uint256 tokenId) internal view returns (bool) {
        return _ownerOf(tokenId) != address(0);
    }
}
