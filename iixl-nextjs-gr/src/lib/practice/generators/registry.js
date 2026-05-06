import { mathGenerators } from './math';
import { mathsGenerators } from './maths';
// Import other subjects as they are created
// import { scienceGenerators } from './science';

export const subjectRegistry = {
  ...mathGenerators,
  ...mathsGenerators,
  // ...scienceGenerators,
};
