import { PublicKey } from '@solana/web3.js';

export function validatePublicKey(pubkeyStr: string): PublicKey | null {
  try {
    return new PublicKey(pubkeyStr);
  } catch {
    return null;
  }
}

export function formatTokenAmount(amount: bigint, decimals: number): string {
  const divisor = 10n ** BigInt(decimals);
  const whole = amount / divisor;
  const fraction = amount % divisor;

  if (fraction === 0n) {
    return whole.toString();
  } else {
    const fractionStr = fraction.toString().padStart(decimals, '0');
    const trimmed = fractionStr.replace(/0+$/, '');
    return `${whole}.${trimmed}`;
  }
} 