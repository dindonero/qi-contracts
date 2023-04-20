// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "./vrf/QiVRFConsumer.sol";

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";

// TODO: if backend doesn't implement any enumerable function, then change it to standard erc721
contract QiBackground is QiVRFConsumer, ERC2981, ERC721 {
    enum BackgroundType {
        Type1,
        Type2,
        Type3,
        Type4,
        Type5,
        Type6,
        Type7,
        Type8,
        Type9,
        Type10,
        Type11,
        Type12
    }

    struct RandomBackgroundRequested {
        address owner;
        BackgroundType category;
        uint256 tokenId;
    }

    struct QiBackgroundInfo {
        BackgroundType category;
        uint256 versionId;
    }

    /// @notice Mapping for keeping track of the request id for each background request (requestId => RandomBackgroundRequest)
    mapping(uint256 => RandomBackgroundRequested) public s_requestIdToRandomBackgroundRequest;

    /// @notice Mapping for keeping track of the background info of each token (TokenId => QiBackground)
    mapping(uint256 => QiBackgroundInfo) public s_tokenIdToQiBackground;

    /// @notice Counter for the token ID
    uint256 public s_nextTokenId;

    /// @notice Address of the Qi contract
    address public s_qi;

    /// @notice Address of the QiTreasury contract
    address public s_qiTreasury;

    /// @notice The base URI for the NFT metadata
    string public BASE_URI;

    // TODO
    /// @notice The max number of versions for each background type
    uint256 public constant MAX_QI_BACKGROUND_VERSIONS = 72;

    /// @notice The price for minting a new NFT
    // TODO TEAM: check mint price
    uint256 public constant MINT_PRICE = 0.01 ether;

    /// @notice The max supply of NFTs
    // TODO TEAM: define max supply? It may overcome the max supply as the QiNFT will always require a background
    uint256 public constant MAX_SUPPLY = 10000;

    bool internal initialized;

    event QiBackgroundRequested(
        uint256 indexed requestId,
        address indexed owner,
        uint256 indexed tokenId,
        BackgroundType category
    );

    event QiBackgroundMinted(
        uint256 indexed requestId,
        address indexed owner,
        uint256 indexed tokenId,
        BackgroundType category,
        uint256 backgroundId
    );

    modifier onlyQi() {
        require(msg.sender == s_qi, "QiTreasury: Only Qi can call this function.");
        _;
    }

    error QiBackground__NotEnoughETHForMint(uint256 price, uint256 amount);
    error QiBackground__NonExistentBackgroundCategory(BackgroundType category);
    error QiBackground__MaxSupplyReached(uint256 maxSupply);
    error QiBackground__AlreadyInitialized();

    constructor(
        VRFConsumerConfig memory _vrfConfig
    ) ERC721("QI Background", "QIB") QiVRFConsumer(_vrfConfig) {}

    /**
     * @dev Initializes the contract
     */
    function initialize(
        string memory _baseUri,
        address _qi,
        address _qiTreasury,
        uint96 _feeNumerator
    ) external {
        if (initialized) revert QiBackground__AlreadyInitialized();
        // TODO: require msg.sender == hardcoded address to prevent frontrunning
        initialized = true;
        BASE_URI = _baseUri;
        s_qi = _qi;
        s_qiTreasury = _qiTreasury;
        _setDefaultRoyalty(_qiTreasury, _feeNumerator);
    }

    /**
     * @notice Requests a new NFT mint
     * @dev The NFT will be minted after the VRF request is fulfilled
     * @param category The category of the NFT
     */
    function requestMint(BackgroundType category) public payable {
        if (msg.value < MINT_PRICE) {
            revert QiBackground__NotEnoughETHForMint(MINT_PRICE, msg.value);
        }

        if (category > BackgroundType.Type12) {
            revert QiBackground__NonExistentBackgroundCategory(category);
        }

        // TODO TEAM: Define background max supply?
        // We need this check here because the fulfillRandomWords function cannot revert
        if (s_nextTokenId >= MAX_SUPPLY) {
            revert QiBackground__MaxSupplyReached(MAX_SUPPLY);
        }

        uint256 tokenId = s_nextTokenId;

        uint256 requestId = requestRandomWords(1);

        s_qiTreasury.call{value: msg.value}("");

        s_requestIdToRandomBackgroundRequest[requestId] = RandomBackgroundRequested({
            owner: msg.sender,
            category: category,
            tokenId: tokenId
        });

        s_nextTokenId++;

        emit QiBackgroundRequested(requestId, msg.sender, tokenId, category);
    }

    /**
     * @notice Mints a new NFT
     * @dev This function can only be called by the Qi contract
     * @param randomWords The random words generated by the VRF request from the Qi contract
     */
    // TODO: check if when minting Qi the category is also random
    function mintBackgroundWithQi(
        uint256[] memory randomWords,
        address receiver
    ) external onlyQi returns (uint256 tokenId) {
        BackgroundType category = BackgroundType(randomWords[1] % enumSize()); // RandomWords % length of enum
        uint256 backgroundVersion = randomWords[2] % MAX_QI_BACKGROUND_VERSIONS;

        tokenId = s_nextTokenId;

        s_tokenIdToQiBackground[tokenId] = QiBackgroundInfo({
            category: category,
            versionId: backgroundVersion
        });

        _safeMint(receiver, tokenId);
        s_nextTokenId++;
        emit QiBackgroundMinted(0, receiver, tokenId, category, backgroundVersion);

    }

    /**
     * @dev See {IERC721Metadata-name}.
     */
    function name() public view virtual override returns (string memory) {
        return "Qi Background";
    }

    /**
     * @dev See {IERC721Metadata-symbol}.
     */
    function symbol() public view virtual override returns (string memory) {
        return "QIB";
    }

    /**
     * @dev See {IERC165-supportsInterface} and {IERC721-supportsInterface}.
     */
    function supportsInterface(
        bytes4 interfaceId
    ) public view virtual override(ERC721, ERC2981) returns (bool) {
        return ERC721.supportsInterface(interfaceId) || ERC2981.supportsInterface(interfaceId);
    }

    /**
     * @dev Base URI for computing {tokenURI}. The resulting URI for each
     * token will be the concatenation of the `baseURI` and the `tokenId`.
     */
    function _baseURI() internal view override returns (string memory) {
        return BASE_URI;
    }

    /**
     * @dev Returns the size of the BackgroundType enum
     */
    function enumSize() internal pure returns (uint256) {
        return uint256(BackgroundType.Type12) + 1;
    }

    /**
     * @dev Receives the random words from the VRF and mints the background
     * @param requestId The request id
     * @param randomWords The random words received from the VRF
     */
    function mintNFTFromRandomness(
        uint256 requestId,
        uint256[] memory randomWords
    ) internal override {
        RandomBackgroundRequested memory backgroundRequest = s_requestIdToRandomBackgroundRequest[
            requestId
        ];
        address owner = backgroundRequest.owner;
        uint256 tokenId = backgroundRequest.tokenId;
        BackgroundType category = backgroundRequest.category;

        // TODO TEAM: define array of % chances for each version (maybe each version has the same chance array?)
        uint256 backgroundVersion = randomWords[0] % MAX_QI_BACKGROUND_VERSIONS;

        s_tokenIdToQiBackground[tokenId] = QiBackgroundInfo({
            category: category,
            versionId: backgroundVersion
        });

        _safeMint(owner, tokenId);
        emit QiBackgroundMinted(requestId, owner, tokenId, category, backgroundVersion);
        delete s_requestIdToRandomBackgroundRequest[requestId];
    }
}
