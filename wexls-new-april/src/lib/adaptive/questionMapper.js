/**
 * QUESTION MAPPER (Proprietary)
 * Maps database part definitions to React components.
 */

import FractionModel from '@/components/practice/fraction-models/FractionModel';

const COMPONENT_MAP = {
  'fraction_model': FractionModel,
  // 'number_line': NumberLine,
  // 'decimal_grid': DecimalGrid,
  // Add other components as needed
};

export function mapPartToComponent(part, props = {}) {
  const Component = COMPONENT_MAP[part.type];
  if (!Component) {
    console.warn(`No component found for type: ${part.type}`);
    return null;
  }
  
  // Combine database props with runtime props (like onChange)
  return <Component key={part.id || Math.random()} {...part.props} {...props} />;
}
