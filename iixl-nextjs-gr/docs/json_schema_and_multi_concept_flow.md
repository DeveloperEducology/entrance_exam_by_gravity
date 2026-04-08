# JSON Schema Mastery: Multi-Concept & Multi-Class Templates

This document explains your JSON schema in detail and shows how to use a **single template** to handle multiple grade levels (Classes) and different math concepts.

---

## 1. Schema Breakdown (The "Why")

| Field | Purpose | PRO Tip |
| :--- | :--- | :--- |
| **`microSkillId`** | The "Unique ID" of the skill. | Must match exactly with the `micro_skill_id` in your curriculum table. |
| **`logic_type`** | The "Switch" for your code. | This tells `templateInstantiator.js` WHICH function to run. |
| **`conceptTags`** | Search keywords for the engine. | If a student fails a "regrouping" question, the engine looks for other questions with this tag. |
| **`questionParts`** | The Layout Blueprint. | Using `type: "Grid"` tells the frontend to render a vertical column format instead of a single line. |
| **`adaptiveConfig`** | The "Brain" of the question. | This is where you define the **difficulty rules** (Range of numbers, etc). |
| **`data_source`** | The constraints for randomness. | E.g., `ensure_regrouping: true` tells the generator to keep picking numbers until it finds ones that require borrowing. |

---

## 2. Multi-Class Strategy (One Template, Many Grades)

Instead of writing new code for Class 2, Class 3, and Class 4, you should use the **same `logic_type`** but different `data_source` configurations.

### **Class 2 (Basic Subtraction)**:
```json
"data_source": { "var_a": [10, 99], "var_b": [1, 9], "ensure_regrouping": false }
```
### **Class 3 (3-Digit Subtraction)**:
```json
"data_source": { "var_a": [100, 999], "var_b": [10, 99], "ensure_regrouping": true }
```
### **Class 5 (Decimal Subtraction)**:
```json
"data_source": { "max_decimal_places": 2, "ensure_regrouping": true }
```

**Result**: You write the code once, and use JSON to "Dials" the difficulty up or down for different classes.

---

## 3. Multi-Concept Flow (The "Power" Template)

A "Multi-Concept" template is a generator that can change its behavior based on a `mode` flag in the JSON.

### **Example: "Number Logic" Template**
In your code (`templateInstantiator.js`):
```javascript
if (logic === 'number_logic_v1') {
  const mode = ds.mode; // 'before', 'after', or 'between'
  if (mode === 'before') { 
    // Logic for "What comes before X?"
  } else if (mode === 'after') {
    // Logic for "What comes after X?"
  }
}
```

### **The JSON Flow**:
1.  **Question A** (Mode: Before) $\rightarrow$ Assigned to Class 1.
2.  **Question B** (Mode: After) $\rightarrow$ Assigned to Class 1.
3.  **Question C** (Mode: Between) $\rightarrow$ Assigned to Class 2.

**Clear Path**:
1.  Write a **Generic Generator** in Javascript that accepts multiple parameters.
2.  Create **Multiple Question Records** in MongoDB that all point to the same `logic_type`.
3.  Vary the **`data_source`** in each record to create unique learning experiences.

---

## 4. The Adaptive Lifecycle
1.  **Request**: Student clicks "C.1" (Class 1 Math).
2.  **Fetch**: Server finds all questions with `micro_skill_id: "C.1"`.
3.  **Select**: Engine chooses a "Medium" question based on the student's history.
4.  **Hydrate**: `templateInstantiator` reads the `data_source` and picks the random numbers.
5.  **Render**: Frontend displays the beautiful math UI with the speaker icon.
6.  **Next**: Student masters it? The engine moves to a new JSON record with harder ranges!
