/**
 * Math Core Logic for Fractions
 * Handles GCD, LCM, simplification, and equivalent fraction logic.
 */

export const gcd = (a, b) => {
  let x = Math.abs(Number(a) || 0);
  let y = Math.abs(Number(b) || 0);
  while (y) [x, y] = [y, x % y];
  return x || 1;
};

export const lcm = (a, b) => {
  return Math.abs(a * b) / gcd(a, b);
};

export const simplifyFraction = (numerator, denominator) => {
  const divisor = gcd(numerator, denominator);
  return {
    numerator: numerator / divisor,
    denominator: denominator / divisor
  };
};

export const createSeededRandom = (seedInput) => {
  const str = String(seedInput || 'fractions');
  let seed = 0;
  for (let i = 0; i < str.length; i++) {
    seed = (seed * 31 + str.charCodeAt(i)) % 2147483647;
  }
  if (seed <= 0) seed += 2147483646;
  return () => {
    seed = (seed * 48271) % 2147483647;
    return seed / 2147483647;
  };
};

// Returns a random integer between min and max (inclusive)
export const getRandomInt = (min, max, randomFunc = Math.random) => {
  return Math.floor(randomFunc() * (max - min + 1)) + min;
};

// Generates an array of equivalent fractions
export const generateEquivalents = (numerator, denominator, count, maxMultiplier = 10, randomFunc = Math.random) => {
  const equivalents = [];
  const simplified = simplifyFraction(numerator, denominator);
  
  const multipliers = [];
  while(multipliers.length < count) {
      const m = getRandomInt(2, maxMultiplier, randomFunc);
      if(!multipliers.includes(m) && (simplified.numerator * m !== numerator || simplified.denominator * m !== denominator)) {
          multipliers.push(m);
      }
  }

  multipliers.forEach(m => {
      equivalents.push({
          numerator: simplified.numerator * m,
          denominator: simplified.denominator * m
      });
  });

  return equivalents;
};
