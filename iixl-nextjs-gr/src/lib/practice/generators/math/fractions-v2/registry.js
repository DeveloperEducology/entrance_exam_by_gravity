import { visualModelsEngine } from './engines/visualModels';
import { numberLinesEngine } from './engines/numberLines';
import { equivalenceEngine } from './engines/equivalence';
import { conversionsEngine } from './engines/conversions';
import { wordProblemsEngine } from './engines/wordProblems';
import { operationsEngine } from './engines/operations';

/**
 * Registry mapping DB logic_types (or template_ids) to specific engines
 * and default parameters.
 */
export const fractionsV2Registry = {
  // Visual Models
  'visual_models_identify': {
    engine: visualModelsEngine,
    params: {
      subType: 'identify_fraction',
      shapeTypes: ['circle', 'rectangle', 'pentagon', 'kite'],
      denominatorPool: [2, 3, 4, 5, 6, 8]
    }
  },
  'visual_models_equal_parts': {
      engine: visualModelsEngine,
      params: {
          subType: 'equal_parts',
          shapeTypes: ['circle', 'rectangle', 'square']
      }
  },
  'visual_models_fraction_of_set': {
    engine: visualModelsEngine,
    params: {
      subType: 'fraction_of_set',
      denominatorPool: [2, 3, 4, 5, 6, 8]
    }
  },

  // UUIDs can also be mapped directly to an engine + config
  '15c4dd64-7433-4af1-97ce-bd3880a847d0': {
    engine: visualModelsEngine,
    params: {
      subType: 'identify_fraction',
      // We can override defaults for specific UUIDs
      shapeTypes: ['circle', 'rectangle'] 
    }
  },

  // Number Lines
  'number_lines_identify': {
    engine: numberLinesEngine,
    params: {
      subType: 'identify_point',
      denominatorPool: [2, 3, 4, 5, 6, 8, 10],
      min: 0,
      max: 1
    }
  },
  'number_lines_graph': {
    engine: numberLinesEngine,
    params: {
      subType: 'graph_fraction_mcq',
      denominatorPool: [2, 3, 4, 5, 6, 8],
      min: 0,
      max: 1
    }
  },

  // Equivalence
  'equivalence_simplify': {
    engine: equivalenceEngine,
    params: {
      subType: 'simplify',
      maxDenominator: 20
    }
  },
  'equivalence_identify_equivalent': {
    engine: equivalenceEngine,
    params: {
      subType: 'identify_equivalent'
    }
  },
  'equivalence_missing_value': {
    engine: equivalenceEngine,
    params: {
      subType: 'missing_value',
      maxMultiplier: 5,
      maxBaseDenom: 10
    }
  },

  // Conversions
  'conversions_fraction_to_decimal': {
    engine: conversionsEngine,
    params: {
      subType: 'fraction_to_decimal'
    }
  },
  'conversions_decimal_to_fraction': {
    engine: conversionsEngine,
    params: {
      subType: 'decimal_to_fraction'
    }
  },

  // Word Problems
  'word_problems_fraction_model': {
    engine: wordProblemsEngine,
    params: {
      subType: 'fraction_model',
      denominatorPool: [2, 3, 4, 5, 6, 8]
    }
  },
  'word_problems_fraction_value': {
    engine: wordProblemsEngine,
    params: {
      subType: 'fraction_value',
      denominatorPool: [2, 3, 4, 5, 6, 8]
    }
  },
  'word_problems_fraction_of_set': {
    engine: wordProblemsEngine,
    params: {
      subType: 'fraction_of_set',
      denominatorPool: [2, 3, 4, 5, 6]
    }
  },

  // Operations
  'operations_add_like_denominators': {
    engine: operationsEngine,
    params: {
      subType: 'add_like_denominators',
      denominatorPool: [2, 3, 4, 5, 6, 8, 10, 12],
      allowImproper: false
    }
  },
  'operations_subtract_like_denominators': {
    engine: operationsEngine,
    params: {
      subType: 'subtract_like_denominators',
      denominatorPool: [2, 3, 4, 5, 6, 8, 10, 12]
    }
  }
};
