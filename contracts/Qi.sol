// SPDX-License-Identifier: MIT

pragma solidity ^0.8.18;

import "./interfaces/IQiBackground.sol";
import "./interfaces/ITreasury.sol";

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";
import "./access/Governable.sol";

contract Qi is ERC721, ERC2981, Governable {

    /// @notice Mapping for keeping track of the background of each token (TokenId => BackgroundTokenId)
    mapping(uint256 => uint256) public s_tokenIdToQiBackgroundId;

    /// @notice Address of the QiBackground contract
    IQiBackground public s_qiBackground;

    /// @notice Address of the QiTreasury contract
    ITreasury public s_qiTreasury;

    /// @notice Counter for the token ID
    uint256 internal s_nextTokenId;

    /// @notice The base URI for the NFT metadata
    string public BASE_URI;

    /// @notice The price for minting a new NFT
    uint256 public constant MINT_PRICE = 0.1 ether;

    /// @notice The max supply of NFTs
    uint256 public constant MAX_SUPPLY = 8888;

    /// @notice Boolean to check if the contract has been initialized
    bool internal initialized = false;

    event QiNFTMinted(
        address indexed owner,
        uint256 indexed tokenId,
        uint256 indexed backgroundId
    );

    event QiNFTBurned(
        uint256 indexed tokenId,
        address indexed owner,
        uint256 indexed backgroundId,
        uint256 ethAmountReturned
    );

    error ERC721__CallerIsNotOwnerOrApproved(uint256 tokenId);
    error Qi__NotEnoughETHForMint(uint256 price, uint256 amount);
    error Qi__MaxSupplyReached(uint256 maxSupply);
    error Qi__AlreadyInitialized();

    constructor() ERC721("Qi", "Qi") {}

    /**
     * @dev Initializes the contract
     */
    function initialize(
        string memory baseURI,
        IQiBackground _qiBackground,
        ITreasury _treasury,
        uint96 _feeNumerator,
        address _yamGovernance
    ) external {
        if (initialized) revert Qi__AlreadyInitialized();
        // TODO: require msg.sender == hardcoded address to prevent frontrunning
        initialized = true;
        BASE_URI = baseURI;
        s_qiBackground = _qiBackground;
        s_qiTreasury = _treasury;
        _setDefaultRoyalty(address(_treasury), _feeNumerator);
        _setGov(_yamGovernance);
    }

    /**
     * @notice Requests a new NFT mint
     * @dev The NFT will be minted after the VRF request is fulfilled
     */
    function mint() public payable {
        if (msg.value < MINT_PRICE) revert Qi__NotEnoughETHForMint(MINT_PRICE, msg.value);

        if (s_nextTokenId == MAX_SUPPLY) revert Qi__MaxSupplyReached(MAX_SUPPLY);

        uint256 tokenId = s_nextTokenId;
        s_nextTokenId++;

        s_qiTreasury.depositETHFromMint{value: msg.value}();

        uint256 backgroundId = s_qiBackground.mintBackgroundWithQi(msg.sender);

        s_tokenIdToQiBackgroundId[tokenId] = backgroundId;

        _safeMint(msg.sender, tokenId);
        emit QiNFTMinted(msg.sender, tokenId, backgroundId);

    }

    /**
     * @dev Burns `tokenId`. See {ERC721-_burn}.
     * @dev Imported from ERC721Burnable.sol
     *
     * Requirements:
     *
     * - The caller must own `tokenId` or be an approved operator.
     */
    function burn(uint256 tokenId) public {
        if (!_isApprovedOrOwner(_msgSender(), tokenId))
            revert ERC721__CallerIsNotOwnerOrApproved(tokenId);

        uint256 backgroundId = s_tokenIdToQiBackgroundId[tokenId];

        _burn(tokenId);

        uint256 ethAmountReturned = s_qiTreasury.withdrawByQiBurned(msg.sender);

        emit QiNFTBurned(
            tokenId,
            msg.sender,
            backgroundId,
            ethAmountReturned
        );
    }

    /**
     * @dev See {IERC721Metadata-name}.
     */
    function name() public view virtual override returns (string memory) {
        return "Qi";
    }

    /**
     * @dev See {IERC721Metadata-symbol}.
     */
    function symbol() public view virtual override returns (string memory) {
        return "Qi";
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
