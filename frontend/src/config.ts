import { createPublicClient, createWalletClient, custom, http } from "viem";
import { sepolia } from "viem/chains";

export const CONTRACT_ADDRESS =
  "0xA32BC40f61D77ca657DF866C8C3f7662B22BE8e8";

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