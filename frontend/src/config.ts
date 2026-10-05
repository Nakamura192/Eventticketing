import { createPublicClient, createWalletClient, custom, http } from "viem";
import { sepolia } from "viem/chains";

export const CONTRACT_ADDRESS =
  "0xf3814b96D17beD77674e81fCa3dA6306FDbB94eA";

export const publicClient = createPublicClient({
  chain: sepolia,
  transport: http(),
});

export function getWalletClient() {
  if (!window.ethereum) {
    throw new Error("No wallet detected");
  }

  return createWalletClient({
    chain: sepolia,
    transport: custom(window.ethereum),
  });
}