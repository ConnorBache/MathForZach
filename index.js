/**
 * Dice probability utilities.
 *
 * Distribution format: array of [sum, probability] pairs.
 * - sum is an integer
 * - probability is a number in [0,1]
 */
(function (root) {
  "use strict";

  const SIDES = 6; // always d6

  function clampInt(value, min, max) {
    const n = Math.floor(Number(value));
    if (!Number.isFinite(n)) return min;
    return Math.min(max, Math.max(min, n));
  }

  function sortArrayByValue(array) {
    return array.sort((a, b) => a[0] - b[0]);
  }

  // --- Your preferred dynamic-programming cache (global array) ---
  // Semantics:
  // - A single die is uniform over [0..5] (d6)
  // - globalArray[0] is the basecase (1 die)
  // - globalArray[n-1] is the distribution for n dice
  const globalArray = [getBaseCaseArray()];

  function getBaseCaseArray() {
    // Keep your original semantics: one die is uniform over [0..SIDES-1]
    const array = [];
    for (let i = 1; i <= SIDES; i++) {
      array.push([i, 1 / SIDES]);
    }
    return array;
  }

  function crushDuplicates(dist) {
    // Removes duplicates and adds probabilities.
    // Robust version: sort first, then merge adjacent equal sums.
    const sorted = sortArrayByValue(dist.slice());
    const result = [];
    for (const [sum, p] of sorted) {
      if (result.length && result[result.length - 1][0] === sum) {
        result[result.length - 1][1] += p;
      } else {
        result.push([sum, p]);
      }
    }
    return result;
  }

  function calcProbAdd(arrayBefore, basecaseArray) {
    // Convolution of two independent distributions.
    // No Map: use a plain object accumulator keyed by sum.
    const acc = Object.create(null); // sum(string) -> probability(number)
    for (let i = 0; i < arrayBefore.length; i++) {
      for (let j = 0; j < basecaseArray.length; j++) {
        const sum = arrayBefore[i][0] + basecaseArray[j][0];
        const prob = arrayBefore[i][1] * basecaseArray[j][1];
        const key = String(sum);
        acc[key] = (acc[key] || 0) + prob;
      }
    }
    const out = [];
    for (const key in acc) out.push([Number(key), acc[key]]);
    return sortArrayByValue(out);
  }

  function propNDice(n) {
    if(n==0){
      return[[0,1]];
    }

    const dice = clampInt(n, 1, 1_000);

    // Build up globalArray until it includes dice dice.
    // globalArray length 1 means only 1-die dist exists at index 0.
    while (globalArray.length < dice) {
      const next = calcProbAdd(globalArray[globalArray.length - 1], globalArray[0]);
      globalArray.push(next);
    }

    return globalArray[dice - 1];
  }

  // Precompute up to 50 dice at load time (performance).
  // This keeps runtime calculations fast for typical usage.
  propNDice(50);

  function subtractDistributions(dist1, dist2) {
    //dists are arrays of [sum, probability] pairs. dist1-dist2
    const newArr = [];
    for (let i = 0; i < dist1.length; i++) {
      for (let j = 0; j < dist2.length; j++) {
        newArr.push([dist1[i][0] - dist2[j][0], dist1[i][1] * dist2[j][1]]);
      }
    }
    return crushDuplicates(sortArrayByValue(newArr));
  }

  function calculateAverageDamage(dist){
    let averageDamage = 0;
    for (let i = 0; i < dist.length; i++) {
      averageDamage += dist[i][0] * dist[i][1];
    }
    return averageDamage;
  }

  function calculateHitChance(dist){
    // Assumes dist[0] corresponds to "0 damage" (common in these models)
    if(dist[0][0] != 0){
      return 1;
    }
    const hitChance = 1 - dist[0][1];
    return hitChance;
  }

  function clampZeros(dist){
    for (let i = 0; i < dist.length; i++) {
      if (dist[i][0] < 0) {
        dist[i][0] = 0;
      }
    }
    return crushDuplicates(dist);
  }

  function finishUp(crushedDist, baseAttackBonus, resistance){
    const adjust = baseAttackBonus + resistance;
    for (let i = 0; i < crushedDist.length; i++) {
      crushedDist[i][0] += adjust;
    }
    return crushedDist;
  }

  function fullCalculation(resistance, baseAttackBonus, atkDice, cover){
    // Minimal, safe implementation: build dice dist, then apply additive adjustment.
    const distAtk = propNDice(atkDice);
    console.log("distAtk");
    console.log(distAtk); 
    const distDef = propNDice(resistance);
    console.log("distDef");
    console.log(distDef);
    console.log("adjusted");
    const adjusted = subtractDistributions(distAtk, distDef);
    console.log(adjusted);
    const finished = finishUp(adjusted, baseAttackBonus, resistance);
    console.log("finished");
    console.log(finished);
    const crushed = clampZeros(finished);
    console.log("crushed");
    console.log(crushed);
    const averageDamage = calculateAverageDamage(crushed);
    const hitChance = calculateHitChance(crushed);
    return {
      averageDamage,
      hitChance,
      crushed
    };
  }

  const DiceMath = {
    SIDES,
    clampInt,
    sortArrayByValue,
    getBaseCaseArray,
    calcProbAdd,
    propNDice,
    subtractDistributions,
    crushDuplicates,
    calculateAverageDamage,
    calculateHitChance,
    clampZeros,
    finishUp,
    fullCalculation,
  };

  // Browser global API
  root.DiceMath = DiceMath;
})(typeof globalThis !== "undefined" ? globalThis : this);
