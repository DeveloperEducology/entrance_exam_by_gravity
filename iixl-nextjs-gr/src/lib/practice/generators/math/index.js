import { arithmeticGenerators } from './arithmetic';
import { patternGenerators } from './patterns';
import { geometryGenerators } from './geometry';
import { fractionsGenerators } from './fractions';
import { fractionsV2Generators } from './fractions-v2';

export const mathGenerators = {
  ...arithmeticGenerators,
  ...patternGenerators,
  ...geometryGenerators,
  ...fractionsGenerators,
  ...fractionsV2Generators,
};
