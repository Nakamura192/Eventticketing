import { createPublicClient, createWalletClient, custom, http } from "viem";
import { sepolia } from "viem/chains";

export const CONTRACT_ADDRESS =
  "0xE79f3326b8744eD0a2c9E992753f12ef7b3eb7CB";

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