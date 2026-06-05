let ethers = null;

try {
  ethers = require('ethers');
} catch (err) {
  ethers = null;
}

const PROTOCOL_ABI = [
  'function reserve(uint256 amount) external',
  'function list(uint256 lotId, uint256 price) external',
  'function take(uint256 listingId) external',
  'function trade(uint256 listingId) external',
  'function collect(uint256 stakeId) external',
];

const getChainStatus = async () => {
  const rpcUrl = process.env.RPC_URL;
  const protocolAddress = process.env.PROTOCOL_ADDRESS;

  if (!ethers) {
    return {
      connected: false,
      settlement: 'off_chain_ledger',
      message: 'Install ethers and set RPC_URL plus PROTOCOL_ADDRESS to enable contract calls.',
    };
  }

  if (!rpcUrl || !protocolAddress) {
    return {
      connected: false,
      settlement: 'off_chain_ledger',
      message: 'On-chain settlement is not configured. Set RPC_URL and PROTOCOL_ADDRESS.',
      protocolAddress: protocolAddress || null,
    };
  }

  try {
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const network = await provider.getNetwork();
    const code = await provider.getCode(protocolAddress);
    return {
      connected: true,
      settlement: code && code !== '0x' ? 'contract_detected' : 'address_empty',
      chainId: Number(network.chainId),
      protocolAddress,
      abi: PROTOCOL_ABI,
    };
  } catch (err) {
    return {
      connected: false,
      settlement: 'rpc_error',
      message: err.message,
      protocolAddress,
    };
  }
};

module.exports = {
  PROTOCOL_ABI,
  getChainStatus,
};
