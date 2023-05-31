// SPDX-License-Identifier: MIT

pragma solidity ^0.8.18;

import "./interfaces/IYiqiBackground.sol";
import "./interfaces/IYiqiTreasury.sol";

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";
import "./access/Governable.sol";

contract Yiqi is ERC721, ERC2981, Governable {
    /// @notice Mapping for keeping track of the background of each token (TokenId => BackgroundTokenId)
    mapping(uint256 => uint256) internal s_tokenIdToYiqiBackgroundId;

    /// @notice Address of the YiqiBackground contract
    IYiqiBackground internal s_yiqiBackground;

    /// @notice Address of the YiqiTreasury contract
    IYiqiTreasury internal s_yiqiTreasury;

    /// @notice Counter for the token ID
    uint256 internal s_nextTokenId;

    /// @notice The base URI for the NFT metadata
    string internal BASE_URI;

    /// @notice The price for minting a new NFT
    uint256 public constant MINT_PRICE = 0.1 ether;

    /// @notice The max supply of NFTs
    uint256 public constant MAX_SUPPLY = 8888;

    /// @notice Boolean to check if the contract has been initialized
    bool internal initialized = false;

    event YiqiNFTMinted(address indexed owner, uint256 indexed tokenId, uint256 indexed backgroundId);

    event YiqiNFTBurned(
        uint256 indexed tokenId,
        address indexed owner,
        uint256 indexed backgroundId,
        uint256 ethAmountReturned
    );

    error ERC721__CallerIsNotOwnerOrApproved(uint256 tokenId);
    error Yiqi__NotEnoughETHForMint(uint256 price, uint256 amount);
    error Yiqi__MaxSupplyReached(uint256 maxSupply);
    error Yiqi__AlreadyInitialized();

    constructor() ERC721("Yiqi", "Yiqi") {}

    /**
     * @dev Initializes the contract
     */
    function initialize(
        IYiqiBackground _yiqiBackground,
        IYiqiTreasury _treasury,
        string memory _baseUri,
        uint96 _feeNumerator,
        address _yamGovernance
    ) external {
        if (initialized) revert Yiqi__AlreadyInitialized();
        // TODO: require msg.sender == hardcoded address to prevent frontrunning
        initialized = true;
        s_yiqiBackground = _yiqiBackground;
        s_yiqiTreasury = _treasury;
        BASE_URI = _baseUri;
        _setDefaultRoyalty(address(s_yiqiTreasury), _feeNumerator);
        _setGov(_yamGovernance);
    }

    /**
     * @notice Requests a new NFT mint
     * @dev The NFT will be minted after the VRF request is fulfilled
     */
    function mint() public payable {
        if (msg.value < MINT_PRICE) revert Yiqi__NotEnoughETHForMint(MINT_PRICE, msg.value);

        if (s_nextTokenId == MAX_SUPPLY) revert Yiqi__MaxSupplyReached(MAX_SUPPLY);

        uint256 tokenId = s_nextTokenId;
        s_nextTokenId++;

        uint256 backgroundId = s_yiqiBackground.mintBackgroundWithYiqi(msg.sender);

        s_tokenIdToYiqiBackgroundId[tokenId] = backgroundId;

        s_yiqiTreasury.depositETHFromMint{value: msg.value}();

        _safeMint(msg.sender, tokenId);
        emit YiqiNFTMinted(msg.sender, tokenId, backgroundId);
    }

    /**
     * @dev Burns `tokenId`. See {ERC721-_burn}.
     * @dev Imported from ERC721Burnable.sol
     * @param tokenId uint256 token being burned
     * @param minAmountOut uint256 minimum amount of ETH to receive
     *
     * Requirements:
     *
     * - The caller must own `tokenId` or be an approved operator.
     */
    function burn(uint256 tokenId, uint256 minAmountOut) public {
        if (!_isApprovedOrOwner(_msgSender(), tokenId))
            revert ERC721__CallerIsNotOwnerOrApproved(tokenId);

        uint256 backgroundId = s_tokenIdToYiqiBackgroundId[tokenId];

        _burn(tokenId);

        uint256 ethAmountReturned = s_yiqiTreasury.withdrawByYiqiBurned(msg.sender, minAmountOut);

        emit YiqiNFTBurned(tokenId, msg.sender, backgroundId, ethAmountReturned);
    }


    function getBackgroundFromTokenId(uint256 tokenId) public view returns (uint256) {
        return s_tokenIdToYiqiBackgroundId[tokenId];
    }

    /**
     * @dev See {IERC721Metadata-name}.
     */
    function name() public view virtual override returns (string memory) {
        return "Yiqi";
    }

    /**
     * @dev See {IERC721Metadata-symbol}.
     */
    function symbol() public view virtual override returns (string memory) {
        return "Yiqi";
    }

    /**
     * @dev Base URI for computing {tokenURI}. The resulting URI for each
     * token will be the concatenation of the `baseURI` and the `tokenId`.
     */
    function _baseURI() internal view override returns (string memory) {
        return BASE_URI;
    }

    /**
     * @dev See {IERC165-supportsInterface}.
     */
    function supportsInterface(
        bytes4 interfaceId
    ) public view virtual override(ERC721, ERC2981) returns (bool) {
        return ERC721.supportsInterface(interfaceId) || ERC2981.supportsInterface(interfaceId);
    }
}
