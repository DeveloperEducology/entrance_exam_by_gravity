/**
 * Generator for Pattern Recognition sequences (Level 1).
 * Supports: Increasing, Decreasing, Constant, Alternating (ABAB).
 */

export function generatePatternRecognitionQuestion(config = {}) {
  const {
    type = 'numbers', // 'numbers', 'shapes', 'colors'
    patternType = 'increasing', // 'increasing', 'decreasing', 'constant', 'alternating'
    level = 1,
    min = 1,
    max = 100,
    mode = 'identify_type' // 'identify_type' or 'identify_sequence'
  } = config;

  let sequence = [];
  let correctAnswer = '';
  let explanation = '';
  let rule = '';

  // Internal helper to generate a sequence of a specific type
  const getSequenceForType = (pType) => {
    const range = max - min;
    const maxStep = Math.max(1, Math.floor(range / 10));
    const step = Math.floor(Math.random() * maxStep) + 1;
    let s;
    switch (pType) {
      case 'increasing':
        s = Math.floor(Math.random() * (max - min - 3 * step)) + min;
        return [s, s + step, s + 2 * step, s + 3 * step];
      case 'decreasing':
        s = Math.floor(Math.random() * (max - min - 3 * step)) + min + 3 * step;
        return [s, s - step, s - 2 * step, s - 3 * step];
      case 'constant':
        s = Math.floor(Math.random() * (max - min)) + min;
        return [s, s, s, s];
      case 'alternating':
        const s1 = Math.floor(Math.random() * (max - min)) + min;
        let s2 = Math.floor(Math.random() * (max - min)) + min;
        while (Math.abs(s1 - s2) < 2) s2 = Math.floor(Math.random() * (max - min)) + min;
        return [s1, s2, s1, s2];
      default: return [1, 2, 3, 4];
    }
  };

  if (level === 1) {
    if (type === 'numbers') {
      sequence = getSequenceForType(patternType);
      correctAnswer = patternType.charAt(0).toUpperCase() + patternType.slice(1);
      explanation = patternType === 'increasing' ? 'Each number is greater than the previous one.' :
                    patternType === 'decreasing' ? 'Each number is smaller than the previous one.' :
                    patternType === 'constant' ? 'All numbers are the same.' :
                    'The numbers switch back and forth between two values.';
    } else if (type === 'shapes') {
      const shapes = ['🔴', '🔵', '🟩', '⭐️', '🔶'];
      const s1 = shapes[Math.floor(Math.random() * shapes.length)];
      let s2 = shapes[Math.floor(Math.random() * shapes.length)];
      while (s1 === s2) s2 = shapes[Math.floor(Math.random() * shapes.length)];

      switch (patternType) {
        case 'increasing':
          sequence = [s1, s1 + s1, s1 + s1 + s1, s1 + s1 + s1 + s1];
          correctAnswer = 'Increasing';
          explanation = 'The number of shapes is growing.';
          break;
        case 'alternating':
          sequence = [s1, s2, s1, s2];
          correctAnswer = 'Alternating';
          explanation = 'The shapes switch back and forth (ABAB).';
          break;
        default:
          return generatePatternRecognitionQuestion({ ...config, type: 'numbers' });
      }
    }
  } else if (level === 2) {
    // ... rest of level 2 code
    // Level 2: Rule Identification
    const subType = config.subType || 'addition'; // addition, subtraction, multiplication, division, squares, cubes
    let n;

    switch (subType) {
      case 'addition':
        n = config.n || Math.floor(Math.random() * 9) + 1;
        const addStart = Math.floor(Math.random() * (max - 4 * n)) + min;
        sequence = [addStart, addStart + n, addStart + 2 * n, addStart + 3 * n];
        rule = `+${n}`;
        correctAnswer = rule;
        explanation = `The rule is to add ${n} to the previous number.`;
        break;
      case 'subtraction':
        n = config.n || Math.floor(Math.random() * 9) + 1;
        const subStart = Math.floor(Math.random() * (max - 4 * n)) + min + 4 * n;
        sequence = [subStart, subStart - n, subStart - 2 * n, subStart - 3 * n];
        rule = `-${n}`;
        correctAnswer = rule;
        explanation = `The rule is to subtract ${n} from the previous number.`;
        break;
      case 'multiplication':
        n = config.n || Math.floor(Math.random() * 3) + 2; // 2, 3, 4
        const multStart = Math.floor(Math.random() * 5) + 1;
        sequence = [multStart, multStart * n, multStart * n * n, multStart * n * n * n];
        rule = `×${n}`;
        correctAnswer = rule;
        explanation = `The rule is to multiply the previous number by ${n}.`;
        break;
      case 'division':
        n = config.n || Math.floor(Math.random() * 3) + 2; // 2, 3
        const divEnd = Math.floor(Math.random() * 5) + 1;
        const divStart = divEnd * n * n * n;
        sequence = [divStart, divStart / n, (divStart / n) / n, divEnd];
        rule = `÷${n}`;
        correctAnswer = rule;
        explanation = `The rule is to divide the previous number by ${n}.`;
        break;
      case 'squares':
        const sqStart = Math.floor(Math.random() * 4) + 1;
        sequence = [sqStart * sqStart, (sqStart + 1) * (sqStart + 1), (sqStart + 2) * (sqStart + 2), (sqStart + 3) * (sqStart + 3)];
        rule = 'n²';
        correctAnswer = 'Square numbers';
        explanation = 'These are consecutive square numbers.';
        break;
      case 'cubes':
        const cubeStart = Math.floor(Math.random() * 3) + 1;
        sequence = [cubeStart ** 3, (cubeStart + 1) ** 3, (cubeStart + 2) ** 3, (cubeStart + 3) ** 3];
        rule = 'n³';
        correctAnswer = 'Cube numbers';
        explanation = 'These are consecutive cube numbers.';
        break;
    }
  }

  if (mode === 'identify_sequence') {
    const types = ['increasing', 'decreasing', 'constant', 'alternating'];
    const otherTypes = types.filter(t => t !== patternType);
    
    // Generate distractors
    const distractorSequences = otherTypes.map(t => getSequenceForType(t).join(', '));
    const correctSequence = sequence.join(', ');
    
    const options = [correctSequence, ...distractorSequences].sort(() => Math.random() - 0.5);
    const correctIndex = options.indexOf(correctSequence);

    return {
      logic_type: 'pattern_recognition_v1',
      adaptiveConfig: {
        patternType,
        sequence,
        correctAnswer: correctSequence,
        explanation
      },
      questionText: `Which sequence is **${patternType}**?`,
      parts: [
        {
          type: 'text',
          content: `Select the sequence that follows a **${patternType}** pattern:`,
          isVertical: true,
          style: { marginBottom: '15px' }
        }
      ],
      type: 'mcq',
      options,
      correctAnswerIndex: correctIndex,
      solution: [
        { type: 'text', content: `### Correct Sequence: ${correctSequence}`, isVertical: true },
        { type: 'text', content: explanation, isVertical: true }
      ]
    };
  }

  return {
    logic_type: 'pattern_recognition_v1',
    adaptiveConfig: {
      patternType,
      sequence,
      correctAnswer,
      explanation
    },
    questionText: `What type of pattern is this?`,
    parts: [
      {
        type: 'text',
        content: `Look at this sequence:`,
        isVertical: true,
        style: { marginBottom: '10px' }
      },
      {
        type: 'text',
        content: sequence.join(', '),
        isVertical: true,
        style: { fontSize: '24px', fontWeight: 'bold', textAlign: 'center', margin: '20px 0', padding: '15px', backgroundColor: '#f8fafc', borderRadius: '8px' }
      }
    ],
    type: 'mcq',
    options: ['Increasing', 'Decreasing', 'Constant', 'Alternating'],
    correctAnswerIndex: ['Increasing', 'Decreasing', 'Constant', 'Alternating'].indexOf(correctAnswer),
    solution: [
      { type: 'text', content: `### Pattern: ${correctAnswer}`, isVertical: true },
      { type: 'text', content: explanation, isVertical: true }
    ]
  };
}
