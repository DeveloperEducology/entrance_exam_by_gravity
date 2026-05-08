import { arithmeticGenerators } from './arithmetic';
import { patternGenerators } from './patterns';
import { geometryGenerators } from './geometry';
import { fractionsGenerators } from './fractions';

export const mathGenerators = {
  ...arithmeticGenerators,
  ...patternGenerators,
  ...geometryGenerators,
  ...fractionsGenerators,
};
