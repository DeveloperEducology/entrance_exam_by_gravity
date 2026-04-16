
# Math Notes: Successors, Predecessors, and Products

## 1. Key Vocabulary
Before solving the problem, we must know what these terms mean:

* **Smallest 3-digit number:** The first number that has three digits is **100**.
* **Predecessor:** The number that comes **before** (subtract 1). 
    * *Example:* Predecessor of 10 is $10 - 1 = 9$.
* **Successor:** The number that comes **after** (add 1).
    * *Example:* Successor of 10 is $10 + 1 = 11$.
* **Product:** The result of **multiplying** two numbers.

---

## 2. Step-by-Step Solution for the Image
Let's break down the question: *"What is the product of the successor and predecessor of the smallest 3-digit number?"*


### Step 1: Identify the main number
The smallest 3-digit number is **100**.

### Step 2: Find the neighbors
* **Predecessor** of 100: $100 - 1 = \mathbf{99}$
* **Successor** of 100: $100 + 1 = \mathbf{101}$

### Step 3: Find the product
Now, multiply them:
$$101 \times 99 = ?$$

**Shortcut Trick:**
Think of it as $(100 + 1) \times 99$.
$(100 \times 99) + (1 \times 99) = 9900 + 99 = \mathbf{9,999}$

**Correct Answer:** The second option, **9,999**.

---

## 3. Practice Examples (Different Types)

### Example A: Using the Largest 2-digit Number
**Q:** Find the product of the successor and predecessor of the **largest 2-digit number**.
1.  **Main Number:** 99
2.  **Predecessor:** 98
3.  **Successor:** 100
4.  **Product:** $100 \times 98 = \mathbf{9,800}$

### Example B: Sum instead of Product
**Q:** Find the **sum** of the successor and predecessor of **500**.
1.  **Main Number:** 500
2.  **Predecessor:** 499
3.  **Successor:** 501
4.  **Sum:** $499 + 501 = \mathbf{1,000}$
    * *Note: The sum of the neighbors is always double the middle number!*

### Example C: The "Special" Smallest Number
**Q:** What is the product of the successor and predecessor of the **smallest 1-digit natural number**?
1.  **Main Number:** 1
2.  **Predecessor:** 0
3.  **Successor:** 2
4.  **Product:** $2 \times 0 = \mathbf{0}$
    * *Anything multiplied by zero is zero!*

---

## 4. Scaffold Table for Quick Practice

| Target Description | Number | Predecessor (-1) | Successor (+1) | Product |
| :--- | :--- | :--- | :--- | :--- |
| Smallest 2-digit | 10 | 9 | 11 | 99 |
| **Smallest 3-digit** | **100** | **99** | **101** | **9,999** |
| Largest 3-digit | 999 | 998 | 1,000 | 9,98,000 |
| Smallest 4-digit | 1,000 | 999 | 1,001 | 9,99,999 |

---

### 💡 Pro-Tip for Exams:
Whenever you see a question asking for the product of the neighbors of a number like 10, 100, or 1000, the answer will always end in a string of **9s**. 
* Neighbors of 10: $9 \times 11 = 99$
* Neighbors of 100: $99 \times 101 = 9999$
* Neighbors of 1000: $999 \times 1001 = 999999$