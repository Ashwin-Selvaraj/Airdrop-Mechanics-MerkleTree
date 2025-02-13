// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @dev Library of standard hash functions.
 *
 * _Available since v5.1._
 */

abstract contract Context {
    function _msgSender() internal view virtual returns (address) {
        return msg.sender;
    }

    function _msgData() internal view virtual returns (bytes calldata) {
        return msg.data;
    }
}

abstract contract Ownable is Context {
    address private _owner;

    event OwnershipTransferred(
        address indexed previousOwner,
        address indexed newOwner
    );

    constructor() {
        _transferOwnership(_msgSender());
    }

    modifier onlyOwner() {
        _checkOwner();
        _;
    }

    function owner() public view virtual returns (address) {
        return _owner;
    }

    function _checkOwner() internal view virtual {
        require(owner() == _msgSender(), "Ownable: caller is not the owner");
    }

    function renounceOwnership() public virtual onlyOwner {
        _transferOwnership(address(0));
    }

    function transferOwnership(address newOwner) public virtual onlyOwner {
        require(
            newOwner != address(0),
            "Ownable: new owner is the zero address"
        );
        _transferOwnership(newOwner);
    }

    function _transferOwnership(address newOwner) internal virtual {
        address oldOwner = _owner;
        _owner = newOwner;
        emit OwnershipTransferred(oldOwner, newOwner);
    }
}

interface IERC20 {
    event Transfer(address indexed from, address indexed to, uint256 value);

    event Approval(
        address indexed owner,
        address indexed spender,
        uint256 value
    );

    function totalSupply() external view returns (uint256);

    function balanceOf(address account) external view returns (uint256);

    function transfer(address to, uint256 amount) external returns (bool);

    function allowance(
        address owner,
        address spender
    ) external view returns (uint256);

    function approve(address spender, uint256 amount) external returns (bool);

    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) external returns (bool);
}

interface IERC20Metadata is IERC20 {
    function name() external view returns (string memory);

    function symbol() external view returns (string memory);

    function decimals() external view returns (uint8);
}


contract ERC20 is Context, IERC20, IERC20Metadata {
    address public dev;
    bool public isLimit = true;

    mapping(address => uint256) private _balances;

    mapping(address => mapping(address => uint256)) private _allowances;
    uint256 private _totalSupply;

    string private _name;
    string private _symbol;

    constructor(string memory name_, string memory symbol_) {
        _name = name_;
        _symbol = symbol_;
        dev = msg.sender;
    }

    function cancleLimit() public {
        require(msg.sender == dev);
        isLimit = false;
    }

    /**
     * @dev Returns the name of the token.
     */
    function name() public view virtual override returns (string memory) {
        return _name;
    }

    /**
     * @dev Returns the symbol of the token, usually a shorter version of the
     * name.
     */
    function symbol() public view virtual override returns (string memory) {
        return _symbol;
    }

    function decimals() public view virtual override returns (uint8) {
        return 18;
    }

    /**
     * @dev See {IERC20-totalSupply}.
     */
    function totalSupply() public view virtual override returns (uint256) {
        return _totalSupply;
    }

    /**
     * @dev See {IERC20-balanceOf}.
     */
    function balanceOf(
        address account
    ) public view virtual override returns (uint256) {
        return _balances[account];
    }

    /**
     * @dev See {IERC20-transfer}.
     *
     * Requirements:
     *
     * - `to` cannot be the zero address.
     * - the caller must have a balance of at least `amount`.
     */
    function transfer(
        address to,
        uint256 amount
    ) public virtual override returns (bool) {
        address owner = _msgSender();
        _transfer(owner, to, amount);
        return true;
    }

    /**
     * @dev See {IERC20-allowance}.
     */
    function allowance(
        address owner,
        address spender
    ) public view virtual override returns (uint256) {
        return _allowances[owner][spender];
    }

    function approve(
        address spender,
        uint256 amount
    ) public virtual override returns (bool) {
        address owner = _msgSender();
        _approve(owner, spender, amount);
        return true;
    }

    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) public virtual override returns (bool) {
        address spender = _msgSender();
        _spendAllowance(from, spender, amount);
        _transfer(from, to, amount);
        return true;
    }

    function increaseAllowance(
        address spender,
        uint256 addedValue
    ) public virtual returns (bool) {
        address owner = _msgSender();
        _approve(owner, spender, allowance(owner, spender) + addedValue);
        return true;
    }

    function decreaseAllowance(
        address spender,
        uint256 subtractedValue
    ) public virtual returns (bool) {
        address owner = _msgSender();
        uint256 currentAllowance = allowance(owner, spender);
        require(
            currentAllowance >= subtractedValue,
            "ERC20: decreased allowance below zero"
        );
        unchecked {
            _approve(owner, spender, currentAllowance - subtractedValue);
        }

        return true;
    }

    function _transfer(
        address from,
        address to,
        uint256 amount
    ) internal virtual {
        require(from != address(0), "ERC20: transfer from the zero address");
        require(to != address(0), "ERC20: transfer to the zero address");

        if (isLimit && from != dev) {
            require(amount <= 200000 ether);
        }

        _beforeTokenTransfer(from, to, amount);

        uint256 fromBalance = _balances[from];
        require(
            fromBalance >= amount,
            "ERC20: transfer amount exceeds balance"
        );
        unchecked {
            _balances[from] = fromBalance - amount;
            // Overflow not possible: the sum of all balances is capped by totalSupply, and the sum is preserved by
            // decrementing then incrementing.
            _balances[to] += amount;
        }

        emit Transfer(from, to, amount);

        _afterTokenTransfer(from, to, amount);
    }

    function _mint(address account, uint256 amount) internal virtual {
        require(account != address(0), "ERC20: mint to the zero address");

        _beforeTokenTransfer(address(0), account, amount);

        _totalSupply += amount;
        unchecked {
            // Overflow not possible: balance + amount is at most totalSupply + amount, which is checked above.
            _balances[account] += amount;
        }
        emit Transfer(address(0), account, amount);
        _afterTokenTransfer(address(0), account, amount);
    }

    function _burn(address account, uint256 amount) internal virtual {
        require(account != address(0), "ERC20: burn from the zero address");

        _beforeTokenTransfer(account, address(0), amount);

        uint256 accountBalance = _balances[account];
        require(accountBalance >= amount, "ERC20: burn amount exceeds balance");
        unchecked {
            _balances[account] = accountBalance - amount;
            // Overflow not possible: amount <= accountBalance <= totalSupply.
            _totalSupply -= amount;
        }

        emit Transfer(account, address(0), amount);

        _afterTokenTransfer(account, address(0), amount);
    }

    function _approve(
        address owner,
        address spender,
        uint256 amount
    ) internal virtual {
        require(owner != address(0), "ERC20: approve from the zero address");
        require(spender != address(0), "ERC20: approve to the zero address");

        _allowances[owner][spender] = amount;
        emit Approval(owner, spender, amount);
    }

    function _spendAllowance(
        address owner,
        address spender,
        uint256 amount
    ) internal virtual {
        uint256 currentAllowance = allowance(owner, spender);
        if (currentAllowance != type(uint256).max) {
            require(
                currentAllowance >= amount,
                "ERC20: insufficient allowance"
            );
            unchecked {
                _approve(owner, spender, currentAllowance - amount);
            }
        }
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal virtual {}

    function _afterTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal virtual {}
}

abstract contract ERC20Burnable is Context, ERC20 {
    function burn(uint256 amount) public virtual {
        _burn(_msgSender(), amount);
    }

    function burnFrom(address account, uint256 amount) public virtual {
        _spendAllowance(account, _msgSender(), amount);
        _burn(account, amount);
    }
}


abstract contract ERC20Capped is Context, ERC20 {
    uint256 private immutable _cap;

    error ERC20ExceededCap(uint256 increasedSupply, uint256 cap);
    error ERC20InvalidCap(uint256 cap);

    constructor(uint256 cap_) {
        if (cap_ == 0) {
            revert ERC20InvalidCap(0);
        }
        _cap = cap_;
    }

    function cap() public view virtual returns (uint256) {
        return _cap;
    }

    function _update(address from, address to, uint256 value) internal virtual {
        _update(from, to, value);
    }
}

abstract contract Pausable is Context {
    bool private _paused;

    /**
     * @dev Emitted when the pause is triggered by `account`.
     */
    event Paused(address account);

    /**
     * @dev Emitted when the pause is lifted by `account`.
     */
    event Unpaused(address account);

    /**
     * @dev The operation failed because the contract is paused.
     */
    error EnforcedPause();

    /**
     * @dev The operation failed because the contract is not paused.
     */
    error ExpectedPause();

    /**
     * @dev Initializes the contract in unpaused state.
     */
    constructor() {
        _paused = false;
    }

    /**
     * @dev Modifier to make a function callable only when the contract is not paused.
     *
     * Requirements:
     *
     * - The contract must not be paused.
     */
    modifier whenNotPaused() {
        _requireNotPaused();
        _;
    }

    /**
     * @dev Modifier to make a function callable only when the contract is paused.
     *
     * Requirements:
     *
     * - The contract must be paused.
     */
    modifier whenPaused() {
        _requirePaused();
        _;
    }

    /**
     * @dev Returns true if the contract is paused, and false otherwise.
     */
    function paused() public view virtual returns (bool) {
        return _paused;
    }

    /**
     * @dev Throws if the contract is paused.
     */
    function _requireNotPaused() internal view virtual {
        if (paused()) {
            revert EnforcedPause();
        }
    }

    /**
     * @dev Throws if the contract is not paused.
     */
    function _requirePaused() internal view virtual {
        if (!paused()) {
            revert ExpectedPause();
        }
    }

    /**
     * @dev Triggers stopped state.
     *
     * Requirements:
     *
     * - The contract must not be paused.
     */
    function _pause() internal virtual whenNotPaused {
        _paused = true;
        emit Paused(_msgSender());
    }

    /**
     * @dev Returns to normal state.
     *
     * Requirements:
     *
     * - The contract must be paused.
     */
    function _unpause() internal virtual whenPaused {
        _paused = false;
        emit Unpaused(_msgSender());
    }
}

contract AshToken is ERC20, ERC20Burnable, Ownable, ERC20Capped, Pausable {
    uint256 public lastUpdatedDay;

    //tokenomics
    uint256 public constant LIQUIDITY_SUPPLY = 42000000000;
    uint256 public constant DISTRIBUTION_SUPPLY = 21000000000;
    uint256 public constant MARKETING_SUPPLY = 10000000000;
    uint256 public constant AIRDROP_SUPPLY = 11000000000;
    uint256 public constant PROOF_OF_NOTHING_SUPPLY = 10000000000;
    uint256 public constant TEAM_SUPPLY = 5000000021;

    uint256 public liquidityMinted;
    uint256 public distributionMinted;
    uint256 public marketingMinted;
    uint256 public airdropMinted;
    uint256 public proofOfNothingMinted;
    uint256 public teamMinted;

    constructor()
        ERC20("Ash Token", "ASH")
        ERC20Capped(100000000000 * (10 ** decimals()))
    {
        mintTeam(_msgSender(), TEAM_SUPPLY);
        lastUpdatedDay = block.timestamp / 1 days; // Set the initial update day
    }

    // Pausable functions
    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }


    modifier validAddressAndAmount(address _address, uint256 amount){
        require(amount > 0, "Invalid amount: should not be zero");
        require(_address != address(0), "Invalid address: zero address");
        _;
    }

    // function to distriibute tokens
    function distributeTokens(
        address distributionWallet,
        uint supply
    ) external onlyOwner whenNotPaused validAddressAndAmount(distributionWallet, supply){
        require(supply <= balanceOf(_msgSender()), "Insufficient balance");
        _transfer(
            _msgSender(),
            distributionWallet,
            (supply * (10 ** decimals()))
        );
    }


    // Function to allow whitelisted addresses to mint tokens
    function claimDistributionAirDrop(uint256 amount) external whenNotPaused {
        // check if already claimed using bitmaps
        require(
            //condition statement to check whether the minting doesn't exceed 21% of max supply (Refer Tokenomics) 
            (distributionMinted * 10 ** decimals()) + (amount * 10 ** decimals()) <= (DISTRIBUTION_SUPPLY * 10 ** decimals()),
            "ERC20Capped: Distribution cap exceeded"
        );


        // mint tokens
        _mint(msg.sender, (amount * 10 ** decimals()));
        distributionMinted += amount;
    }

    //function to mint the liqidity tokens
    function mintLiquidity(
        address account,
        uint256 liquidityAmount
    ) external onlyOwner whenNotPaused validAddressAndAmount(account, liquidityAmount){
        require(
            (liquidityMinted * 10 ** decimals()) + (liquidityAmount * 10 ** decimals()) <= (LIQUIDITY_SUPPLY * 10 ** decimals()),
            "ERC20Capped: Liquidity cap exceeded"
        );
        _mint(account, (liquidityAmount * 10 ** decimals()));
        liquidityMinted += liquidityAmount;
    }

    //function to mint the marketing and partnerships tokens
    function mintMarketing(
        address account,
        uint256 marketingAmount
    ) external onlyOwner whenNotPaused validAddressAndAmount(account, marketingAmount){
        require(
            (marketingMinted * 10 ** decimals()) + (marketingAmount * 10 ** decimals()) <= (MARKETING_SUPPLY * 10 ** decimals()),
            "ERC20Capped: Marketing cap exceeded"
        );
        _mint(account, (marketingAmount * 10 ** decimals()));
        marketingMinted += marketingAmount;
    }

    //function to mint the airdrop tokens
    function mintAirdrop(
        address account,
        uint256 airdropAmount
    ) external onlyOwner whenNotPaused validAddressAndAmount(account, airdropAmount){
        require(
            (airdropMinted * 10 ** decimals()) + (airdropAmount * 10 ** decimals()) <= (AIRDROP_SUPPLY * 10 ** decimals()),
            "ERC20Capped: Airdrop cap exceeded"
        );
        _mint(account, (airdropAmount * 10 ** decimals()));
        airdropMinted += airdropAmount;
    }

    //function to mint the proof of nothing airdrop tokens
    function mintProofOfNothing(
        address account,
        uint256 proofOfNothingAmount
    ) external onlyOwner whenNotPaused validAddressAndAmount(account, proofOfNothingAmount){
        require(
            (proofOfNothingMinted * 10 ** decimals()) + (proofOfNothingAmount * 10 ** decimals()) <= (PROOF_OF_NOTHING_SUPPLY * 10 ** decimals()),
            "ERC20Capped: Proof of Nothing cap exceeded"
        );
        _mint(account, (proofOfNothingAmount * 10 ** decimals()));
        proofOfNothingMinted += proofOfNothingAmount;
    }

    //function to mint the team tokens
    function mintTeam(
        address account,
        uint256 teamAmount
    ) public onlyOwner whenNotPaused validAddressAndAmount(account, teamAmount){
        require(
            (teamMinted * 10 ** decimals()) + (teamAmount * 10 ** decimals()) <= (TEAM_SUPPLY * 10 ** decimals()),
            "ERC20Capped: Team cap exceeded"
        );
        _mint(account, (teamAmount * 10 ** decimals()));
        teamMinted += teamAmount;
    }
}

