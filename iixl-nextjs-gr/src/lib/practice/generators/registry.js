import { mathGenerators } from './math';

/**
 * Central registry of all question generators.
 * The Practice Orchestrator uses this to dispatch template instantiation
 * based on the 'logic_type' field.
 */
export const generatorRegistry = {
  ...mathGenerators,
  // Add other subjects here:
  // ...scienceGenerators,
  // ...englishGenerators,
};

/**
 * @deprecated Use generatorRegistry instead.
 * Keeping subjectRegistry for backward compatibility.
 */
export const subjectRegistry = generatorRegistry;
