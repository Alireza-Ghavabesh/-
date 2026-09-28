import { Participant } from '../types';

/**
 * Cryptographically Secure Pseudo-Random Number Generator (CSPRNG)
 * Returns a uniform integer in the range [0, maxExclusive - 1].
 * Uses window.crypto.getRandomValues (hardware-backed high entropy),
 * which avoids modulo bias through rejection sampling.
 */
export function getSecureRandomInt(maxExclusive: number): number {
  if (maxExclusive <= 1) return 0;

  // For small numbers (up to 2^32 - 1)
  const maxUint32 = 0xffffffff;
  const limit = maxUint32 - (maxUint32 % maxExclusive);
  const buffer = new Uint32Array(1);

  let rand: number;
  do {
    window.crypto.getRandomValues(buffer);
    rand = buffer[0];
  } while (rand >= limit); // Discard values in the bias zone (rejection sampling)

  return rand % maxExclusive;
}

/**
 * Fisher-Yates (Knuth) Shuffle Algorithm
 * Powered by Cryptographically Secure Randomness (crypto.getRandomValues).
 *
 * Algorithm Guarantee:
 * - Produces all N! permutations with exactly equal probability (1 / N!).
 * - Every single participant has a mathematically equal chance (1 / N) of landing in ANY position.
 * - Time Complexity: O(N)
 * - Space Complexity: O(N)
 */
export function shuffleParticipantsFisherYates(array: Participant[]): Participant[] {
  if (!array || array.length <= 1) return [...(array || [])];

  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    // Pick a cryptographically secure random index from 0 to i
    const j = getSecureRandomInt(i + 1);
    // Swap elements at i and j
    const temp = shuffled[i];
    shuffled[i] = shuffled[j];
    shuffled[j] = temp;
  }
  return shuffled;
}

/**
 * Picks a random winner using a double-randomized process:
 * 1. Shuffles the candidate pool thoroughly with Fisher-Yates CSPRNG.
 * 2. Selects an index using rejection-sampled CSPRNG.
 */
export function pickSecureWinner(participants: Participant[]): { winner: Participant; shuffledPool: Participant[] } {
  if (!participants || participants.length === 0) {
    throw new Error('فهرست شرکت‌کنندگان خالی است');
  }

  // Step 1: Pre-shuffle the entire active pool
  const shuffledPool = shuffleParticipantsFisherYates(participants);

  // Step 2: Pick the winner using hardware CSPRNG
  const winnerIndex = getSecureRandomInt(shuffledPool.length);
  const winner = shuffledPool[winnerIndex];

  return { winner, shuffledPool };
}
