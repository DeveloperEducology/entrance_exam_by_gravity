# Question Template Schema Guide

This guide defines the basic JSON schema for different question types in your adaptive math system. These schemas are stored in the `questions` collection in MongoDB.

---

## 1. Fill-in-the-Blank (Standard Math)
Used for calculation problems like addition, multiplication, or place value where the student types a number.

### **Database Schema**
```json
{
  "type": "fillInTheBlank",
  "difficulty": "easy",
  "instruction": "Find the product",
  "adaptiveConfig": {
    "logic_type": "multiplication_basic_v1",
    "data_source": {
      "range_a": [2, 9],
      "range_b": [2, 9]
    }
  }
}
```

---

## 2. Multiple Choice (MCQ)
Used for conceptual questions or identifying properties.

### **Database Schema**
```json
{
  "type": "mcq",
  "difficulty": "medium",
  "instruction": "Identify the property shown",
  "adaptiveConfig": {
    "logic_type": "math_property_identification_v1",
    "data_source": {
      "properties": ["commutative", "associative", "distributive"]
    }
  },
  "isMultiSelect": false
}
```
*Note: The generated question will contain an `options` array and `correctAnswerIndex` calculated by the template logic.*

---

## 3. Sorting / Ordering
Used for placing numbers in ascending/descending order.

### **Database Schema**
```json
{
  "type": "sorting",
  "difficulty": "hard",
  "instruction": "Sort the following numbers from smallest to largest",
  "adaptiveConfig": {
    "logic_type": "number_ordering_v1",
    "data_source": {
      "count": 4,
      "max_value": 1000
    }
  }
}
```

---

## 4. Visual Modeling (Shade Grid / Area Model)
Used for fractions, decimals, or geometric multiplication.

### **Database Schema**
```json
{
  "type": "shadeGrid",
  "difficulty": "medium",
  "instruction": "Shade the grid to represent the fraction",
  "adaptiveConfig": {
    "logic_type": "fraction_shading_v1",
    "gridRows": 10,
    "gridCols": 10,
    "data_source": {
      "denominator": 100
    }
  }
}
```

---

## 5. Grid Arithmetic (Vertical Column Method)
Used for multi-digit addition or subtraction with carry/borrow.

### **Database Schema**
```json
{
  "type": "gridArithmetic",
  "difficulty": "hard",
  "instruction": "Solve the vertical addition",
  "adaptiveConfig": {
    "logic_type": "vertical_addition_v1",
    "data_source": {
      "digits": 3
    }
  }
}
```

---

## Core Fields for Every Template

Regardless of the type, every record in your `questions` collection should have:

1.  **`type`**: The UI renderer to use (`mcq`, `fillInTheBlank`, `sorting`, `shadeGrid`, `gridArithmetic`).
2.  **`difficulty`**: The starting band (`easy`, `medium`, `hard`).
3.  **`instruction`**: The text at the top of the card.
4.  **`adaptiveConfig`**:
    *   **`logic_type`**: The critical key that maps to your code in `templateInstantiator.js`.
    *   **`data_source`**: An object containing ranges or specific rules for the generator.
5.  **`isVertical`** (Optional): Set to `true` if you want parts to stack vertically by default.
6.  **`showSubmitButton`**: Set to `true` for all non-MCQ types.
