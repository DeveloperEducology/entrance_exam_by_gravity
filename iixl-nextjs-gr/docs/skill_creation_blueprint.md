# Skill Creation Blueprint: From Concept to Adaptive Practice

This document provides a clear, step-by-step strategy for building a new math skill from scratch, including questions, remediations, and adaptive configurations.

---

## Phase 1: Skill Definition (The Foundation)
Before writing code, define the **Scope** of the skill.

1.  **Assign a MicroSkill ID**: e.g., `multiplication_word_problems_v1`.
2.  **Define the Goal**: What exact fact or operation should the student master?
3.  **Set the "Journey"**: 
    *   **Easy**: Simple numbers, no regrouping.
    *   **Medium**: Larger numbers, carrying/regrouping.
    *   **Hard**: Multi-step problems or extremely large numbers.

---

## Phase 2: Template Implementation (The Logic)
Create your question generators in `templateInstantiator.js`.

1.  **Define a Unique `logic_type`**: e.g., `multi_digit_add_v1`.
2.  **Use the "Blueprint"**:
    *   **Variables**: Generate random values based on a `data_source` range.
    *   **Parts**: Construct the question layout (Text, Grid, Images).
    *   **Solution**: Create a clear, step-by-step answer explanation using the same variables.
3.  **Adaptive Config**: Store the random variables in `adaptiveConfig.variables`.

---

## Phase 3: Content Creation (The Questions)
Instead of 100 fixed questions, you only need a few **Dynamic Templates**.

1.  **Create 3 Core Templates** (Easy, Medium, Hard) for the skill in your `questions` database.
2.  **Set the Difficulty**: Tag each template as `easy`, `medium`, or `hard`.
3.  **Set the Logic Key**: Ensure `adaptiveConfig.logic_type` matches your code.
4.  **Add `conceptTags`**: This is crucial. For example, add `multi_digit_carry` to a medium/hard template.

---

## Phase 4: Misconception & Remediation Mapping
How do you help students who fail?

1.  **Identify "Common Errors"**: What is most likely to go wrong? 
    *   *Example*: Forgetting to carry, off-by-one errors, or place value shifts.
2.  **Add a Remediation Template**: Record a separate question template with **specific, scaffolded logic** for that error. 
3.  **Tag the Remediation**: Set the `adaptiveConfig.remediationCode` on this template (e.g., `regrouping_error`).
4.  **Detect the Error**: Update `detectMisconceptionCode` in `server.js` to look for that specific mathematical mistake.

---

## Phase 5: Adaptive Strategy Configuration
Fine-tune the engine settings in your Question's JSON.

| Setting | Purpose | Example |
| :--- | :--- | :--- |
| **`data_source`** | Controls the "Difficulty" within a template. | `{"range_a": [10, 99], "range_b": [10, 99]}` |
| **`accuracyThreshold`** | How many correct answers needed to move to "Next Skill". | Default is `0.85`. |
| **`remediation_count`** | How many recovery questions to show after a mistake. | Usually `2`. |

---

## Final Checklist for a "Production-Ready" Skill:
- [ ] At least **one Easy**, **one Medium**, and **one Hard** template created.
- [ ] At least **one Remediation template** for the top misconception.
- [ ] `instantiateTemplate` logic in `templateInstantiator.js` is tested for all 3 levels.
- [ ] `correctAnswerText` is correctly calculating the answer based on generated variables.
- [ ] `conceptTags` are added to help the engine find the right questions for the student's needs.
