import { createPublicClient, createWalletClient, custom, http } from "viem";
import { sepolia } from "viem/chains";

export const CONTRACT_ADDRESS =
  "0xEAB79f3F83aAb8A6B43Df47Ba99604Bea1E9A8D0";

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