
import {
  FRACTIONS_IMAGE_CUTS_TEMPLATE_ID,
  FRACTIONS_IDENTIFY_FRACTION_TEMPLATE_ID,
  FRACTIONS_SHADED_FRACTION_TEMPLATE_ID,
  FRACTIONS_SHAPE_EQUAL_PARTS_TEMPLATE_ID,
  generateFractionsQuestion,
} from './fractionsGenerator';

export const fractionsGenerators = {
  fractions_equal_parts_v1: generateFractionsQuestion,
  [FRACTIONS_IMAGE_CUTS_TEMPLATE_ID]: generateFractionsQuestion,
  [FRACTIONS_SHADED_FRACTION_TEMPLATE_ID]: generateFractionsQuestion,
  [FRACTIONS_SHAPE_EQUAL_PARTS_TEMPLATE_ID]: generateFractionsQuestion,
  [FRACTIONS_IDENTIFY_FRACTION_TEMPLATE_ID]: generateFractionsQuestion,
  // DB UUID mappings
  'fa45bfa3-0b66-4c9c-a238-2f8bbeb49e2b': generateFractionsQuestion, // fractions_equal_parts skill
  '15c4dd64-7433-4af1-97ce-bd3880a847d0': generateFractionsQuestion, // fractions_identify_fraction skill
};
