# Remediation Plan: Pattern Recognition

When a student fails to identify a pattern or its rule, we should break down the logic into smaller, verifiable steps.

## Level 1: Identify Type (Increasing, Decreasing, etc.)
If the student fails Level 1, the remediation should focus on **term-by-term comparison**.

### Scaffold Structure:
1. **Compare First Pair**: "Look at **{n1}** and **{n2}**. Is the second number bigger, smaller, or the same?"
2. **Compare Second Pair**: "Now look at **{n2}** and **{n3}**. Is it getting bigger or smaller?"
3. **Synthesis**:
   - If always bigger → **Increasing**
   - If always smaller → **Decreasing**
   - If switching → **Alternating**

## Level 2: Identify Rule (+n, ×n, etc.)
If the student fails Level 2, the remediation should focus on **calculating the change**.

### Scaffold Structure:
1. **Focus on Change**: "How do we get from **{n1}** to **{n2}**?"
2. **Test Addition/Subtraction**: "Try adding or subtracting. ${n1} + ? = {n2}$ or ${n1} - ? = {n2}$."
3. **Verify with Next Term**: "Does this same rule (+3) work for the next step? ${n2} + 3 = {n3}$?"

## Implementation Example (JSON)
You can add this to the `adaptiveConfig` in `templates.json`:

```json
"scaffold": {
  "id": "compare_terms_v1",
  "trigger_on": ["incorrect_selection"],
  "parts": [
    { 
      "type": "text", 
      "content": "Let's look closer at the first two numbers: **{n1}** and **{n2}**." 
    },
    {
      "type": "mcq",
      "id": "step1_comparison",
      "question": "Is {n2} greater than or less than {n1}?",
      "options": ["Greater than", "Less than", "Equal to"]
    }
  ]
}
```

## How to execute:
I can update the `pattern_recognition_v1` logic in `templateInstantiator.js` to automatically include these scaffold steps whenever a question is generated.
