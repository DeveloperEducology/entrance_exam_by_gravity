# Math Template Best Practices: Solid Structure for Question Creation

To build high-quality, production-ready math templates, follow this standardized structure and keep these core principles in mind. This ensures consistency, simplifies debugging, and provides a professional student experience.

---

## 1. Standard Template Structure (The "4-Step Process")

Every template in `templateInstantiator.js` should follow this logical flow:

### **Step A: Input & Range Setup**
*   **Action**: Determine the ranges or data sources provided by the Admin/User.
*   **Best Practice**: Always provide "Safe Fallbacks". Never assume a range exists.
*   **Example**: `const range = dataSource.factor_range || [1, 10];`

### **Step B: Random Variable Generation**
*   **Action**: Generate all the random numbers needed for the question **before** building any UI parts.
*   **Best Practice**: Store these in a single variables object for easy reconstruction on the server.
*   **Key Idea**: Calculate the values first, then use them consistently in both the question and the solution.

### **Step C: Question Part Definitions**
*   **Action**: Construct the `parts` array using your random variables.
*   **Best Practice**: Use semantic types (`text`, `pair`, `digit_blank`, `box_display`) to keep the layout flexible. Use `isVertical: true` if you want a top-down look.

### **Step D: Solution / Explanation Hydration**
*   **Action**: Create a step-by-step solution using the **exact same variables** from Step B.
*   **Best Practice**: Show the *process*, not just the answer. For example, show the area model OR the regrouping steps.

---

## 2. Common Considerations for a "Pro" Template

### **A. Pedagogical Correctness**
*   **Avoid "Bad" Randomness**: Don't generate `0` or `1` in problems where it makes the problem too trivial (e.g., $1 \times X$ or $0 \times X$), unless that’s the specific goal of the skill.
*   **Constrain Products**: Ensure intermediate numbers don't get too large for the grade level (e.g., if a product should be $<100$, ensure your factors multiplied don't exceed that).

### **B. Mobile-Friendly Layouts**
*   **Horizontal Space is Limited**: Use `pair` and `isVertical: true` for longer equations.
*   **Square Blanks**: For `digit_blank`, ensure you use `size: 'small'` or similar properties so the input doesn't stretch across the full screen.

### **C. Flexible Validation**
*   **Factor Order**: If the question asks for two factors (e.g., $X \times Y = 24$), ensure both `4 x 6` and `6 x 4` are marked correct.
*   **String Normalization**: Always trim whitespace and handle case-insensitivity for text-based answers.

### **D. Secret-Safe Answers**
*   **Don't Hardcode Secrets**: Store the correct answer in `correctAnswerText` as a stringified JSON of the IDs. The server will use this for the final verdict.

---

## 3. Template Code Blueprint

Use this skeleton as a starting point for every new `logic_type`:

```javascript
if (logic === 'my_new_logic_v1') {
  // 1. Get Sources
  const ds = question.data_source || {};
  const rangeA = ds.range_a || [1, 10];
  const rangeB = ds.range_b || [1, 10];

  // 2. Generate Variables
  const a = Math.floor(Math.random() * (rangeA[1] - rangeA[0] + 1)) + rangeA[0];
  const b = Math.floor(Math.random() * (rangeB[1] - rangeB[0] + 1)) + rangeB[0];
  const product = a * b;

  // 3. Define Question
  inst.type = 'fillInTheBlank';
  inst.parts = [
    { type: 'text', content: `Multiply: **${a}** and **${b}**` },
    {
      type: 'pair',
      parts: [
        { type: 'text', content: `${a} x ${b} = ` },
        { type: 'digit_blank', id: 'ans_1', size: String(product).length }
      ]
    }
  ];

  // 4. Define Solution
  inst.solution = [
    { type: 'text', content: `Step 1: Count ${a} groups of ${b}.` },
    { type: 'text', content: `**${a} x ${b} = ${product}**` }
  ];

  // 5. Store Metadata for Server
  inst.correctAnswerText = JSON.stringify({ ans_1: String(product) });
  inst.adaptiveConfig.variables = { a, b, product };
}
```

---

## 4. Pitfalls to Avoid

1.  **Hardcoded Strings in Code**: Try to pull labels from the `data_source` when possible so non-developers can change the text later.
2.  **Missing "Submit" Handle**: Ensure you set `inst.showSubmitButton = true` for fill-in-the-blank questions.
3.  **No Explanations**: Always provide at least one solution part. Students learn more from their mistakes than their successes.
4.  **Static IDs**: Always use consistent IDs like `ans_1`, `ans_2` or meaningful names like `tens_input`. Never use random numbers as IDs.
