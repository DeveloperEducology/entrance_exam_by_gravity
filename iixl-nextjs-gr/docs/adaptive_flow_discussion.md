# Adaptive Flow Discussion: How the 10-Question Journey Works

Your question about generating 10 questions with mixed difficulty (Easy, Medium, Hard) and Remediation is exactly what the "Adaptive Engine" was built for. Here is how it actually works in your current code:

---

## 1. The "Phases" of a Practice Session
The system doesn't just pick 10 random questions; it follows a **pedagogical journey** defined in your `server.js`:

| Phase | Goal | Difficulty |
| :--- | :--- | :--- |
| **Warmup** | Build Confidence | Starts at `Easy` |
| **Core** | Mastery Reinforcement | Moves to `Medium` |
| **Challenge** | Extend Learning | Pushes to `Hard` |
| **Recovery** | Fix Misconceptions | Dropped to `Easy/Remediation` |

---

## 2. Managing Difficulty (Easy, Medium, Hard)
If a student starts a session:
*   **Questions 1-3 (Warmup)**: The `chooseNextQuestion` logic looks for `difficulty: "easy"`. 
*   **Performance Trigger**: If the student gets 3 in a row correct, their `mastery_score` increases.
*   **The Shift**: The system updates the `targetDifficulty` to `medium`. The next question will automatically be a "Medium" template (e.g., larger numbers or more steps).
*   **Challenge**: If they keep succeeding, the last few questions (Questions 8-10) will be "Hard".

---

## 3. How "Remediation" Intervenes
This is the most powerful part of your setup. In `server.js`, we have a **High Priority** check for remediation:

1.  **Mistake Detection**: If a student answers `23` instead of `32` (a place value swap), the `detectMisconceptionCode` function flags it as `place_value_shift`.
2.  **High-Priority Search**: The next time `chooseNextQuestion` runs, it **ignores** the target difficulty and looks specifically for a template that has `place_value_shift` in its `conceptTags`.
3.  **The Intervention**: The student gets a simpler question (Remediation) designed to fix that specific mistake before they move back to the regular flow.

---

## 4. Does it work? **Yes.**
Here is why the current logic is solid for production:
*   **It’s Not Linear**: A student who struggles won't even see the Hard questions; they will stay in Warmup/Core with more Easy/Medium questions until they improve.
*   **It Handles "Lucky Guesses"**: If a student guesses correctly but too fast, the `fastGuessPenalty` in the `smartScore` logic prevents them from jumping to "Hard" too quickly.
*   **Automatic Ending**: The session moves to `phase: "done"` once they hit the target confidence score, whether that takes 10 questions or 20.

---

## 5. Summary of the 10-Question Simulation:
1.  **Q1 (Easy)**: Correct.
2.  **Q2 (Easy)**: Correct.
3.  **Q3 (Medium)**: **Incorrect** (Mistake: Off by one).
4.  **Q4 (Remediation)**: Targeted question to fix "Off by one".
5.  **Q5 (Easy/Medium)**: Back to core flow.
6.  **Q6 (Medium)**: Correct.
7.  **Q7 (Medium)**: Correct.
8.  **Q8 (Hard)**: Correct.
9.  **Q9 (Hard)**: Correct.
10. **Q10 (Finish)**: Goal reached! SmartScore 100.

---

**Recommendation**: Your current setup is excellent. The only way to improve it is by adding more "Remediation" templates for specific mistakes, so the system has more tools to help struggling students.
