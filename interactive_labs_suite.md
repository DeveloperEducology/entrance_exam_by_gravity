# Interactive p5.js Math Labs: Template Suite

Use these JSON templates to generate high-performance, interactive constructionist questions in the MCQ engine.

---

## 1. Pattern Builder Lab (Construction)
Students build a grid pattern (e.g., a square) to learn area and multiplication.

```json
{
  "title": "A.5 Build a Square",
  "type": "fillInTheBlank",
  "logic_type": "p5_pattern_builder_v1",
  "questionText": "Build a 5 × 5 square pattern on the grid.",
  "adaptiveConfig": {
    "variables": {
      "n": 5,
      "gridSize": 40
    }
  }
}
```

---

## 2. Angle Measurement Lab (Real Objects)
Students use a protractor to measure real-world objects. Change `variant` to `clock`, `scissors`, `laptop`, or `roof`.

```json
{
  "title": "C.7 Clock Angle Lab",
  "type": "fillInTheBlank",
  "logic_type": "p5_angle_measurement_v1",
  "questionText": "Measure the angle between the clock hands.",
  "adaptiveConfig": {
    "variables": {
      "targetAngle": 90,
      "variant": "clock"
    }
  }
}
```

---

## 3. Angle Lab with Custom Image (External Asset)
Pass a PNG URL to measure a specific photograph or icon.

```json
{
  "title": "C.7 Custom Scissors Lab",
  "type": "fillInTheBlank",
  "logic_type": "p5_angle_measurement_v1",
  "questionText": "Measure the opening angle of these scissors.",
  "adaptiveConfig": {
    "variables": {
      "targetAngle": 60,
      "imageUrl": "https://cdn-icons-png.flaticon.com/512/124/124056.png"
    }
  }
}
```

---

## 4. Transparent Ruler Lab (Linear Measurement)
Students drag and rotate a semi-transparent ruler to measure line length.

```json
{
  "title": "D.2 Measurement Precision",
  "type": "fillInTheBlank",
  "logic_type": "p5_line_measurement_v1",
  "questionText": "What is the length of this line in centimeters?",
  "adaptiveConfig": {
    "variables": {
      "targetLength": 12
    }
  }
}
```

---

### Implementation Status
- **P5Renderer.js**: ✅ Updated with all modes, responsive scaling, and dual scales.
- **templateInstantiator.js**: ✅ Updated with logic handlers for all lab types.
- **Mobile Performance**: ✅ 60fps interaction with fluid scaling.
