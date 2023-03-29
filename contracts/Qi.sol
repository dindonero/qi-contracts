// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "./interfaces/IQiBackground.sol";
import "./interfaces/ITreasury.sol";
import "./vrf/QiVRFConsumer.sol";

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";
import "./access/Governable.sol";

contract Qi is ERC721, ERC2981, Governable, QiVRFConsumer {
    enum ZodiacAnimal {
        Rat,
        Ox,
        Tiger,
        Rabbit,
        Dragon,
        Snake,
        Horse,
        Goat,
        Monkey,
        Rooster,
        Dog,
        Pig
    }

    struct RandomNFTRequest {
        address owner;
        ZodiacAnimal category;
        uint256 tokenId;
    }

    struct QiNFT {
        ZodiacAnimal category;
        uint256 animalVersionId;
        uint256 backgroundId;
    }

    /// @notice Mapping for keeping track of the request id for each NFT request (requestId => RandomNFTRequest)
    mapping(uint256 => RandomNFTRequest) public s_requestIdToRandomNFTRequest;

    /// @notice Mapping for keeping track of the NFT of each token (TokenId => QiNFT)
    mapping(uint256 => QiNFT) public s_tokenIdToQiNFT;

    /// @notice Address of the QiBackground contract
    IQiBackground public s_qiBackground;

    /// @notice Address of the QiTreasury contract
    ITreasury public s_qiTreasury;

    /// @notice IPFS bucket for safekeeping the NFT metadata
    string public s_IPFSBucket;

    /// @notice Counter for the token ID
    uint256 internal s_nextTokenId;

    /// @notice Counter to keep track of the total supply of NFTs + NFTs requested
    uint256 internal s_totalAmountOfNFTsRequested;

    /// @notice The base URI for the NFT metadata
    string public BASE_URI;

    /// @notice The price for minting a new NFT
    uint256 public constant MINT_PRICE = 0.1 ether;

    /// @notice The max supply of NFTs
    uint256 public constant MAX_SUPPLY = 8888;

    /// @notice The max amount of versions for each animal
    uint256 public constant MAX_QI_BASE_VERSIONS = 24;

    /// @notice Boolean to check if the contract has been initialized
    bool internal initialized = false;

    event QiNFTRequested(
        uint256 indexed requestId,
        address indexed owner,
        uint256 indexed tokenId,
        ZodiacAnimal category
    );
    event QiNFTMinted(
        uint256 indexed requestId,
        address indexed owner,
        uint256 indexed tokenId,
        ZodiacAnimal category,
        uint256 animalVersionId,
        uint256 backgroundId
    );
    event QiNFTBurned(
        uint256 indexed tokenId,
        address indexed owner,
        ZodiacAnimal indexed category,
        uint256 animalVersionId,
        uint256 backgroundId
    );

    error ERC721__CallerIsNotOwnerOrApproved(uint256 tokenId);
    error Qi__NotEnoughETHForMint(uint256 price, uint256 amount);
    error Qi__NonExistentAnimalCategory(ZodiacAnimal category);
    error Qi__MaxSupplyReached(uint256 maxSupply);
    error Qi__AlreadyInitialized();

    constructor() ERC721("Qi", "Qi") {}

    /**
     * @dev Initializes the contract
     */
    function initialize(
        VRFConsumerConfig memory _vrfConfig,
        string memory baseURI,
        IQiBackground _qiBackground,
        ITreasury _treasury,
        uint96 _feeNumerator,
        address _yamGovernance
    ) external {
        if (initialized) revert Qi__AlreadyInitialized();
        // TODO: require msg.sender == hardcoded address to prevent frontrunning
        initialized = true;
        initialize(_vrfConfig);
        BASE_URI = baseURI;
        s_qiBackground = _qiBackground;
        s_qiTreasury = _treasury;
        _setDefaultRoyalty(address(_treasury), _feeNumerator);
        _setGov(_yamGovernance);
    }

    /**
     * @notice Requests a new NFT mint
     * @dev The NFT will be minted after the VRF request is fulfilled
     * @param category The category of the NFT
     */
    function requestMint(ZodiacAnimal category) public payable {
        if (msg.value < MINT_PRICE) revert Qi__NotEnoughETHForMint(MINT_PRICE, msg.value);

        if (category > ZodiacAnimal.Pig) revert Qi__NonExistentAnimalCategory(category);

        // We need this check here because the fulfillRandomWords function cannot revert
        if (s_totalAmountOfNFTsRequested == MAX_SUPPLY) revert Qi__MaxSupplyReached(MAX_SUPPLY);

        uint256 tokenId = s_nextTokenId;

        uint256 requestId = requestRandomWords(3);

        s_qiTreasury.depositETHFromMint{value: msg.value}();

        s_requestIdToRandomNFTRequest[requestId] = RandomNFTRequest({
            owner: msg.sender,
            category: category,
            tokenId: tokenId
        });

        s_nextTokenId++;
        s_totalAmountOfNFTsRequested++;

        emit QiNFTRequested(requestId, msg.sender, tokenId, category);
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

        ZodiacAnimal category = s_tokenIdToQiNFT[tokenId].category;
        uint256 animalVersionId = s_tokenIdToQiNFT[tokenId].animalVersionId;
        uint256 backgroundId = s_tokenIdToQiNFT[tokenId].backgroundId;

        _burn(tokenId);
        s_totalAmountOfNFTsRequested--;

        s_qiTreasury.withdrawByQiBurned(msg.sender);

        emit QiNFTBurned(tokenId, msg.sender, category, animalVersionId, backgroundId);
        delete s_tokenIdToQiNFT[tokenId];
    }

    /**
     * @dev Sets the IPFS bucket for the NFT metadata
     * @param IPFSBucket The address that will own the minted NFT
     */
    function setIPFSBucket(string memory IPFSBucket) public onlyGov {
        s_IPFSBucket = IPFSBucket;
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

    /**
     * @dev Receives the random words from the VRF and mints the NFT
     * @param requestId The request id
     * @param randomWords The random words received from the VRF
     */
    function mintNFTFromRandomness(
        uint256 requestId,
        uint256[] memory randomWords
    ) internal override {
        RandomNFTRequest memory nftRequest = s_requestIdToRandomNFTRequest[requestId];
        address owner = nftRequest.owner;
        uint256 tokenId = nftRequest.tokenId;
        ZodiacAnimal category = nftRequest.category;

        // TODO TEAM: define array of % chances for each version -- might make more sense to do this based on the version (ie version 1-15 is bronze, 16-21 silver and 22-24 gold)
        uint256 animalVersion = randomWords[0] % MAX_QI_BASE_VERSIONS;

        uint256 backgroundId = s_qiBackground.mintBackgroundWithQi(randomWords, owner);

        s_tokenIdToQiNFT[tokenId] = QiNFT({
            category: category,
            animalVersionId: animalVersion,
            backgroundId: backgroundId
        });

        _safeMint(owner, tokenId);
        emit QiNFTMinted(requestId, owner, tokenId, category, animalVersion, backgroundId);
        delete s_requestIdToRandomNFTRequest[requestId];
    }
}
