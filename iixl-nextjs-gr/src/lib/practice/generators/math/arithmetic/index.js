import { generateAdditionJourney, generateSubtractionJourney, generateMultiplicationJourney } from './arithmeticJourneyGenerator';
import { generateLongDivisionJourney } from './longDivisionGenerator';
import { generatePlaceValueQuestion } from './placeValueGenerator';
import { generateDivisionJourney } from './divisionJourneyGenerator';

export const arithmeticGenerators = {
  // Map logic types to generator functions
  arithmetic_journey_v1: (inst) => {
    const { operation, v1, v2 } = inst.adaptiveConfig.variables;
    if (operation === 'addition') return generateAdditionJourney(v1, v2);
    if (operation === 'subtraction') return generateSubtractionJourney(v1, v2);
    if (operation === 'multiplication') return generateMultiplicationJourney(v1, v2);
    return inst;
  },
  division_journey_v1: generateDivisionJourney,
  long_division_v1: generateLongDivisionJourney,
  place_value_v1: generatePlaceValueQuestion,
};
