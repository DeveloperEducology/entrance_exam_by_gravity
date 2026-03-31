import { generatePlaceValueQuestion } from './placeValueGenerator';
// Triggering rebuild after cleanup

export function hydrateNode(node, templateVars) {
  if (typeof node === 'string') {
    return node.replace(/\{([^}]+)\}/g, (match, key) => templateVars[key] !== undefined ? templateVars[key] : match);
  }
  if (Array.isArray(node)) {
    return node.map(n => hydrateNode(n, templateVars));
  }
  if (typeof node === 'object' && node !== null) {
    const out = {};
    for (const [k, v] of Object.entries(node)) {
      out[k] = hydrateNode(v, templateVars);
    }
    return out;
  }
  return node;
}

export function instantiateTemplate(question, overrideVariables = null) {
  if (!question) return question;

  const logic = question.logic_type || question.adaptiveConfig?.logic_type || question.adaptiveConfig?.logic;
  if (!logic) return question;

  const inst = JSON.parse(JSON.stringify(question));
  inst.id = `inst_${inst.id || inst.template_id || inst.adaptiveConfig?.template_id}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
  // Ensure the frontend knows what component to render
  inst.type = 'fillInTheBlank';
  inst.adaptiveConfig = inst.adaptiveConfig || {};

  const isExplicitlyCorrect = (value) =>
    value === true || value === 1 || String(value).toLowerCase() === 'true';

  if (logic === 'place_value_template_v1' || logic === 'random_digit_selection' || logic === 'indian_system_generator') {
    let number, targetDigit, placeName, multiplier, correctValue, pos, uniqueInstantiatedAskTypeForGenerator;

    if (overrideVariables) {
      // Re-hydrate an exact instance from a previous state (like answering a question)
      number = overrideVariables.number;
      targetDigit = overrideVariables.target_digit;
      placeName = overrideVariables.place_name;
      multiplier = overrideVariables.place_multiplier;
      correctValue = overrideVariables.value || (targetDigit * multiplier);
      uniqueInstantiatedAskTypeForGenerator = overrideVariables.ask_type;

      // Guess pos for underlining if not saved (works since digits are currently unique)
      pos = String(number).indexOf(String(targetDigit));
    } else {
      // Setup metadata first so we know what kind of number to generate
      const dataSource = question.data_source || inst.adaptiveConfig?.data_source || { range: [1000, 9999], exclude_zeros: true };
      const templateId = question.template_id || inst.template_id || inst.adaptiveConfig?.template_id;
      uniqueInstantiatedAskTypeForGenerator = dataSource.ask_type || inst.adaptiveConfig?.ask_type;

      // Auto-detect ask_type based on template_id if not specified
      if (!uniqueInstantiatedAskTypeForGenerator) {
        const content = String(question.parts?.[0]?.content || '').toLowerCase();
        if (templateId?.includes('word_to_digits')) {
          uniqueInstantiatedAskTypeForGenerator = 'digits';
        } else if (templateId?.includes('which_place') || content.includes('which place')) {
          uniqueInstantiatedAskTypeForGenerator = 'place_name';
        } else if (content.includes('what digit') || content.includes('which digit')) {
          uniqueInstantiatedAskTypeForGenerator = 'digit';
        }
      }

      // Generate a new set of numbers dynamically
      const range = dataSource.range || [1000, 9999];
      const min = range[0] || 1000;
      const max = range[1] || 9999;
      const step = Math.max(1, dataSource.step || 1);
      const uniqueDigits = dataSource.unique_digits || uniqueInstantiatedAskTypeForGenerator === 'place_name' || uniqueInstantiatedAskTypeForGenerator === 'digit';
      const maxAttempts = 50;
      let attempt = 0;

      do {
        number = Math.floor(Math.random() * ((max - min) / step + 1)) * step + min;
        const numStr = String(number);
        const uniqueChars = new Set(numStr.split('')).size;
        
        if (!uniqueDigits || uniqueChars === numStr.length) break;
        attempt++;
      } while (attempt < maxAttempts);

      const numStr = String(number);
      const digitsArr = numStr.split('').map(Number);
      const targetLength = numStr.length;
      
      const placeMultipliers = [1000000, 100000, 10000, 1000, 100, 10, 1].slice(-targetLength);
      const placeNamesMap = {
        1000000: "Ten Lakhs", 100000: "Lakhs", 10000: "Ten Thousands", 
        1000: "Thousands", 100: "Hundreds", 10: "Tens", 1: "Ones"
      };

      // Filter allowed positions based on min_multiplier constraint or exclude_zeros
      let validIndices = [];
      const minMult = dataSource.min_multiplier || 1;
      for (let i = 0; i < digitsArr.length; i++) {
        const mult = placeMultipliers[i];
        if (mult >= minMult) {
          if (!dataSource.exclude_zeros || digitsArr[i] !== 0) {
            validIndices.push(i);
          }
        }
      }
      
      if (validIndices.length === 0) validIndices = digitsArr.map((_, i) => i);
      
      pos = validIndices[Math.floor(Math.random() * validIndices.length)];
      targetDigit = digitsArr[pos];
      multiplier = placeMultipliers[pos];
      placeName = placeNamesMap[multiplier];
      correctValue = targetDigit * multiplier;
    }

    // Save variables for hydration
    inst.adaptiveConfig.variables = {
      ...inst.adaptiveConfig.variables,
      number: number,
      target_digit: targetDigit,
      place_name: placeName,
      place_multiplier: multiplier,
      value: correctValue,
      ask_type: uniqueInstantiatedAskTypeForGenerator
    };
    
    // Add explicitly mapped formatted numbers using the Indian Numbering System ('en-IN')
    const templateVars = { 
      ...inst.adaptiveConfig.variables, 
      number: number,
      value: correctValue,
      number_formatted: Number(number).toLocaleString('en-IN'),
      value_formatted: Number(correctValue).toLocaleString('en-IN'),
      place_multiplier_formatted: Number(multiplier).toLocaleString('en-IN'),
      
      // Helper aliases for better template readability
      target_place: placeName,
      correct_digit: targetDigit,
      is_ones_target: String(multiplier === 1),
      is_tens_target: String(multiplier === 10),
      is_hundreds_target: String(multiplier === 100),
      is_thousands_target: String(multiplier === 1000)
    };

    // Calculate expanded form components (only non-zero digits)
    const expandedParts = [];
    const expandedWithInput = [];
    
    // Iterate from biggest place to smallest
    const numDigits = String(number).length;
    const places = [1000000, 100000, 10000, 1000, 100, 10, 1].slice(-numDigits);
    const digitsInNum = String(number).split('').map(Number);
    
    for (let i = 0; i < digitsInNum.length; i++) {
        if (digitsInNum[i] !== 0) {
            const val = digitsInNum[i] * places[i];
            const fmtVal = val.toLocaleString('en-IN');
            expandedParts.push(fmtVal);
            
            if (places[i] === multiplier) {
                // This is the place we are asking for
                expandedWithInput.push(`{ans}`); 
            } else {
                expandedWithInput.push(fmtVal);
            }
        }
    }
    
    const expandedBefore = [];
    const expandedAfter = [];
    let foundInput = false;
    
    for (let i = 0; i < digitsInNum.length; i++) {
        if (digitsInNum[i] !== 0) {
            const val = digitsInNum[i] * places[i];
            const fmtVal = val.toLocaleString('en-IN');
            
            if (places[i] === multiplier) {
                foundInput = true;
            } else {
                if (!foundInput) expandedBefore.push(fmtVal);
                else expandedAfter.push(fmtVal);
            }
        }
    }
    
    templateVars.expanded_form_before = expandedBefore.length > 0 ? expandedBefore.join(' + ') + ' + ' : '';
    templateVars.expanded_form_after = expandedAfter.length > 0 ? ' + ' + expandedAfter.join(' + ') : '';
    templateVars.expanded_form = expandedParts.join(' + ');

    // Automatically inject {digit_1} (Ones), {digit_2} (Tens), etc into templateVars
    const numStr = String(number);
    for (let i = 0; i < numStr.length; i++) {
        const placeIndex = numStr.length - i; // length 5, i=0 -> digit_5
        templateVars[`digit_${placeIndex}`] = numStr[i];
    }
    // Fill in upper digits with blank if they are missing (to avoid {digit_4} showing up for 3-digit numbers)
    for (let i = numStr.length + 1; i <= 7; i++) {
      templateVars[`digit_${i}`] = '';
    }

    // Generate number_underlined (e.g. 1<u>2</u>34)
    // We'll use LaTeX \underline if it's within a math block, or just <u> if supported.
    // Given the renderer's LaTeX support, let's provide a few variants.
    const underlinedArr = numStr.split('');
    const posInStr = pos; // pos is index in slice(-targetLength)
    underlinedArr[posInStr] = `\\underline{${underlinedArr[posInStr]}}`;
    templateVars.number_underlined = `\\(${underlinedArr.join('')}\\)`;
    
    // Also provide a simple underline variant if requested
    templateVars.target_digit_underlined = `\\underline{${targetDigit}}`;

    // Hydrate options if they exist (crucial for MCQ questions)
    if (question.options) {
      inst.options = hydrateNode(question.options, templateVars);
    }

    // Hydrate Parts (the main prompt) if they haven't been hydrated yet on the frontend
    inst.parts = hydrateNode(question.parts || [], templateVars);
    
    // Hydrate Solution
    if (question.solution) {
      // Sometimes solution is passed as a stringified json
      let parsedSolution = question.solution;
      if (typeof parsedSolution === 'string') {
        try { parsedSolution = JSON.parse(parsedSolution); } catch (e) { }
      }
      inst.solution = hydrateNode(parsedSolution, templateVars);
    }

    // Hydrate Scaffold dynamically 
    const scaffoldSrc = question.scaffold || inst.adaptiveConfig?.scaffold;
    if (scaffoldSrc) {
      inst.adaptiveConfig.scaffold = hydrateNode(scaffoldSrc, templateVars);
      if (!inst.adaptiveConfig.scaffold.id) {
         inst.adaptiveConfig.scaffold.id = (inst.template_id || inst.adaptiveConfig?.template_id || 'v1') + '_scaffold';
      }
      if (!inst.adaptiveConfig.scaffold.trigger_on) {
         inst.adaptiveConfig.scaffold.trigger_on = ["place_name_error"];
      }
    }

    let ansValue;
    if (uniqueInstantiatedAskTypeForGenerator === 'place_name') {
      ansValue = placeName;
    } else if (uniqueInstantiatedAskTypeForGenerator === 'digit') {
      ansValue = String(targetDigit);
    } else if (uniqueInstantiatedAskTypeForGenerator === 'whole_number' || uniqueInstantiatedAskTypeForGenerator === 'digits' || uniqueInstantiatedAskTypeForGenerator === 'number') {
      ansValue = String(number);
      // Also update value in templateVars to be the whole number if we are asking for it
      templateVars.value = number;
      templateVars.value_formatted = Number(number).toLocaleString('en-IN');
      // Update inst.parts/solution if they were already hydrated with the single digit value
      inst.parts = hydrateNode(question.parts || [], templateVars);
      if (question.solution) {
        let parsedSolution = question.solution;
        if (typeof parsedSolution === 'string') {
          try { parsedSolution = JSON.parse(parsedSolution); } catch (e) { }
        }
        inst.solution = hydrateNode(parsedSolution, templateVars);
      }
    } else {
      ansValue = String(correctValue);
    }
    // Switch to MCQ if asking for place name (usually involves choosing from Thousands, Hundreds, etc)
    if (uniqueInstantiatedAskTypeForGenerator === 'place_name' || (question.options?.length > 0 && uniqueInstantiatedAskTypeForGenerator !== 'digits' && uniqueInstantiatedAskTypeForGenerator !== 'whole_number')) {
      inst.type = 'mcq';
      // Auto-calculate the correct index for MCQ
      if (inst.options?.length > 0) {
        // First, check if any option explicitly says it's correct (via template variable)
        const explicitIdx = inst.options.findIndex(opt => {
          const isCorr = opt.is_correct ?? opt.isCorrect;
          return isExplicitlyCorrect(isCorr);
        });

        if (explicitIdx >= 0) {
          inst.correctAnswerIndex = explicitIdx;
        } else {
          // Fallback to text matching
          inst.correctAnswerIndex = inst.options.findIndex(opt => {
            const content = String(typeof opt === 'string' ? opt : (opt.content || '')).trim().toLowerCase();
            return content === String(ansValue).toLowerCase() || content === String(placeName).toLowerCase() || content === String(correctValue).toLowerCase();
          });
        }

        // For MCQs, the ansValue should be the text of the correct option for display purposes
        if (inst.correctAnswerIndex >= 0) {
          const correctOpt = inst.options[inst.correctAnswerIndex];
          ansValue = typeof correctOpt === 'string' ? correctOpt : (correctOpt.content || ansValue);
        }
      }
    }

    if (question.correctAnswerText || question.correct_answer_text) {
      // If a template exists, use it
      const template = question.correctAnswerText || question.correct_answer_text;
      inst.correctAnswerText = hydrateNode(template, templateVars);
      inst.adaptiveConfig.correctAnswerText = inst.correctAnswerText;
    } else {
      const answerPayload = JSON.stringify({ ans_value: ansValue });
      inst.correctAnswerText = answerPayload;
      inst.adaptiveConfig.correctAnswerText = answerPayload;
    }
  }

  if (logic === 'table_min_max_comparison') {
    let names = [], values = [], correctIndex;

    let target = inst.adaptiveConfig?.target || 'min';
    if (target === 'random') {
      target = Math.random() < 0.5 ? 'min' : 'max';
    }

    if (overrideVariables) {
      names = overrideVariables.names;
      values = overrideVariables.values;
      correctIndex = overrideVariables.correct_index;
      target = overrideVariables.target || target;
    } else {
      const namesPool = ["Noah", "Liam", "Mason", "Jacob", "William", "Ethan", "Emma", "Olivia", "Sophia", "Ava", "Isabella", "Aarav", "Vivaan", "Aditya", "Vihaan", "Arjun", "Krishna", "Ishaan", "Ananya", "Diya", "Saanvi", "Kiara", "Prisha", "Riya"];
      
      // Shuffle and pick 4 names
      const shuffledNames = namesPool.sort(() => 0.5 - Math.random());
      names = shuffledNames.slice(0, 4);

      const dataSource = question.data_source || inst.adaptiveConfig?.data_source || { range: [1000, 9999] };
      let minVal = dataSource.range[0];
      let maxVal = dataSource.range[1];

      // Generate 4 unique random numbers
      let attempts = 0;
      while (values.length < 4 && attempts < 100) {
        let v = Math.floor(Math.random() * (maxVal - minVal + 1)) + minVal;
        if (!values.includes(v)) values.push(v);
        attempts++;
      }

      // Calculate correct index
      if (target === 'min') {
        const minNum = Math.min(...values);
        correctIndex = values.indexOf(minNum);
      } else {
        const maxNum = Math.max(...values);
        correctIndex = values.indexOf(maxNum);
      }
    }

    const superlative = target === 'min' ? 'fewest' : 'most';
    const comparative = target === 'min' ? 'smallest' : 'largest';

    inst.adaptiveConfig.variables = {
      ...(inst.adaptiveConfig.variables || {}),
      names: names,
      values: values,
      correct_index: correctIndex,
      correct_name: names[correctIndex],
      correct_value: values[correctIndex],
      target: target,
      superlative: superlative,
      comparative: comparative
    };

    const templateVars = { 
      ...inst.adaptiveConfig.variables,
      name_1: names[0], name_2: names[1], name_3: names[2], name_4: names[3],
      num_1: values[0], num_2: values[1], num_3: values[2], num_4: values[3],
      num_1_formatted: Number(values[0]).toLocaleString('en-IN'),
      num_2_formatted: Number(values[1]).toLocaleString('en-IN'),
      num_3_formatted: Number(values[2]).toLocaleString('en-IN'),
      num_4_formatted: Number(values[3]).toLocaleString('en-IN'),
      correct_name: names[correctIndex],
      correct_value_formatted: Number(values[correctIndex]).toLocaleString('en-IN')
    };

    // Inject digit variables for each number (e.g. num_1_d1 for Ones, num_1_d2 for Tens)
    for (let i = 0; i < 4; i++) {
        const numStr = String(values[i]);
        for (let j = 0; j < numStr.length; j++) {
            const placeIndex = numStr.length - j; // d1=Ones, d2=Tens, d3=Hundreds, etc.
            templateVars[`num_${i+1}_d${placeIndex}`] = numStr[j];
        }
    }

    inst.type = 'mcq'; // Switch template to MCQ renderer
    inst.parts = hydrateNode(question.parts || [], templateVars);
    
    if (question.options) {
      let parsedOptions = typeof question.options === 'string' ? JSON.parse(question.options) : question.options;
      inst.options = hydrateNode(parsedOptions, templateVars);
    } else {
      // If the user forgot options, auto-generate them
      inst.options = [
        { type: "text", content: names[0] },
        { type: "text", content: names[1] },
        { type: "text", content: names[2] },
        { type: "text", content: names[3] }
      ];
    }
    
    if (question.solution) {
      let parsedSolution = typeof question.solution === 'string' ? JSON.parse(question.solution) : question.solution;
      inst.solution = hydrateNode(parsedSolution, templateVars);
    }

    const scaffoldSrc = question.scaffold || inst.adaptiveConfig?.scaffold;
    if (scaffoldSrc) {
      inst.adaptiveConfig.scaffold = hydrateNode(scaffoldSrc, templateVars);
      if (!inst.adaptiveConfig.scaffold.id) {
         inst.adaptiveConfig.scaffold.id = (inst.template_id || 'v1') + '_scaffold';
      }
    }

    inst.correctAnswerIndex = correctIndex;
    const answerPayload = JSON.stringify({ ans_value: names[correctIndex] });
    inst.correctAnswerText = answerPayload;
    inst.adaptiveConfig.correctAnswerText = answerPayload;
  }

  // Add more logic blocks for other templates here...

  if (logic === 'number_comparison') {
    let num1, num2, correctPhrase;
    
    if (overrideVariables) {
      num1 = overrideVariables.num_1;
      num2 = overrideVariables.num_2;
      correctPhrase = overrideVariables.correct_phrase;
    } else {
      const dataSource = question.data_source || inst.adaptiveConfig?.data_source || { range: [100, 999] };
      const minVal = dataSource.range[0];
      const maxVal = dataSource.range[1];
      
      const isEq = Math.random() < 0.25;
      const varyLengths = Math.random() < 0.5; // 50% chance to force different lengths
      
      if (isEq) {
        num1 = Math.floor(Math.random() * (maxVal - minVal + 1)) + minVal;
        num2 = num1;
      } else {
        num1 = Math.floor(Math.random() * (maxVal - minVal + 1)) + minVal;
        
        if (varyLengths && String(maxVal).length > String(minVal).length) {
           // pick a power of 10 smaller or larger
           const len1 = String(num1).length;
           const newLen = len1 > String(minVal).length ? len1 - 1 : len1 + 1;
           const min2 = Math.pow(10, newLen - 1);
           const max2 = Math.pow(10, newLen) - 1;
           num2 = Math.floor(Math.random() * (max2 - min2 + 1)) + min2;
        } else {
           // same length, vary slightly
           let change = Math.floor(Math.random() * 90) + 1;
           num2 = Math.random() < 0.5 ? num1 + change : num1 - change;
           if (String(num2).length !== String(num1).length) num2 = num1; // reset if overflow
        }
      }

      if (num1 > num2) correctPhrase = "is greater than";
      else if (num1 < num2) correctPhrase = "is less than";
      else correctPhrase = "is equal to";
    }

    const n1Str = String(num1);
    const n2Str = String(num2);
    const n1Fmt = Number(num1).toLocaleString('en-IN');
    const n2Fmt = Number(num2).toLocaleString('en-IN');

    // Procedurally generate the exact solution breakdown
    let breakdown = `First, count the number of digits in each number. There are ${n1Str.length} digits in ${n1Fmt} and ${n2Str.length} digits in ${n2Fmt}. `;
    
    if (n1Str.length !== n2Str.length) {
      breakdown += `The number with more digits is always greater.\n\n**${n1Fmt} ${correctPhrase} ${n2Fmt}.**`;
    } else {
      breakdown += `They have the same number of digits.\n\n`;
      const placesArray = ["ones", "tens", "hundreds", "thousands", "ten thousands", "lakhs", "ten lakhs"];
      let diffFound = false;
      
      for (let i = 0; i < n1Str.length; i++) {
        let pName = placesArray[n1Str.length - 1 - i];
        breakdown += `Compare the ${pName} digits. The ${pName} digit in ${n1Fmt} is ${n1Str[i]}. The ${pName} digit in ${n2Fmt} is ${n2Str[i]}. `;
        if (n1Str[i] === n2Str[i]) {
          breakdown += `They have the same ${pName} digit.\n\n`;
        } else {
          breakdown += `${n1Str[i]} is ${n1Str[i] > n2Str[i] ? 'greater' : 'less'} than ${n2Str[i]}.\n\n`;
          diffFound = true;
          breakdown += `**${n1Fmt} ${correctPhrase} ${n2Fmt}.**`;
          
          breakdown = breakdown.replace('Compare the hundreds', 'Now compare the hundreds')
                               .replace('Compare the tens', 'Now compare the tens')
                               .replace('Compare the ones', 'Now compare the ones');
          breakdown = breakdown.replace(/^Now /, '');
          breakdown = breakdown.replace(/\n\nNow /, '\n\nNow ');
          breakdown = breakdown.replace(/\n\nCompare /, '\n\nNow compare ');
          breakdown = breakdown.replace(/^Compare /, 'Compare ');
          breakdown = breakdown.replace(/\n\nNow/, '\n\nNow');
          
          breakdown = breakdown.split('\n\n').map((line, idx) => {
            if (idx === 1 && line.startsWith('Now ')) return line.substring(4);
            return line;
          }).join('\n\n');

          break;
        }
      }
      if (!diffFound) {
        breakdown += `Since all the digits are the same, **${n1Fmt} ${correctPhrase} ${n2Fmt}.**`;
      }
    }

    inst.adaptiveConfig.variables = {
      ...(inst.adaptiveConfig.variables || {}),
      num_1: num1,
      num_2: num2,
      num_1_fmt: n1Fmt,
      num_2_fmt: n2Fmt,
      correct_phrase: correctPhrase,
      solution_breakdown: breakdown
    };

    const templateVars = { ...inst.adaptiveConfig.variables };
    
    inst.type = 'mcq';
    inst.parts = hydrateNode(question.parts || [], templateVars);
    
    inst.options = [
        { type: "text", content: "is greater than" },
        { type: "text", content: "is less than" },
        { type: "text", content: "is equal to" }
    ];
    
    inst.correctAnswerIndex = inst.options.findIndex(opt => opt.content === correctPhrase);
    
    if (question.solution) {
      let parsedSolution = typeof question.solution === 'string' ? JSON.parse(question.solution) : question.solution;
      inst.solution = hydrateNode(parsedSolution, templateVars);
    }
    
    const answerPayload = JSON.stringify({ ans_value: correctPhrase });
    inst.correctAnswerText = answerPayload;
    inst.adaptiveConfig.correctAnswerText = answerPayload;
  }

  if (logic === 'place_value_conversion') {
    let baseQty, derivedQty, largerPlace, smallerPlace, largerSingular, smallerPlural, correctValue;

    if (overrideVariables) {
      baseQty = overrideVariables.base_qty;
      derivedQty = overrideVariables.derived_qty;
      largerPlace = overrideVariables.larger_place;
      smallerPlace = overrideVariables.smaller_place;
      largerSingular = overrideVariables.larger_singular;
      smallerPlural = overrideVariables.smaller_plural;
      correctValue = overrideVariables.value;
    } else {
      const places = [
        { name: "ten thousands", singular: "ten thousand" },
        { name: "thousands", singular: "thousand" },
        { name: "hundreds", singular: "hundred" },
        { name: "tens", singular: "ten" },
        { name: "ones", singular: "one" }
      ];
      
      const dataSource = question.data_source || inst.adaptiveConfig?.data_source || {};
      const minBase = dataSource.min_base || 1;
      const maxBase = dataSource.max_base || 9;
      
      baseQty = Math.floor(Math.random() * (maxBase - minBase + 1)) + minBase;
      derivedQty = baseQty * 10;

      const idx = Math.floor(Math.random() * (places.length - 1));
      largerPlace = places[idx].name;
      largerSingular = places[idx].singular;
      smallerPlace = places[idx+1].name;
      smallerPlural = places[idx+1].name;

      const target = inst.adaptiveConfig?.target || 'base'; // 'base' means answering the larger side
      correctValue = target === 'base' ? baseQty : derivedQty;
    }

    inst.adaptiveConfig.variables = {
      ...(inst.adaptiveConfig.variables || {}),
      base_qty: baseQty,
      derived_qty: derivedQty,
      larger_place: largerPlace,
      smaller_place: smallerPlace,
      larger_singular: largerSingular,
      smaller_plural: smallerPlural,
      value: correctValue
    };

    const templateVars = { ...inst.adaptiveConfig.variables, value: correctValue };

    inst.parts = hydrateNode(question.parts || [], templateVars);
    
    if (question.solution) {
      let parsedSolution = question.solution;
      if (typeof parsedSolution === 'string') {
        try { parsedSolution = JSON.parse(parsedSolution); } catch (e) { }
      }
      inst.solution = hydrateNode(parsedSolution, templateVars);
    }

    const scaffoldSrc = question.scaffold || inst.adaptiveConfig?.scaffold;
    if (scaffoldSrc) {
      inst.adaptiveConfig.scaffold = hydrateNode(scaffoldSrc, templateVars);
      if (!inst.adaptiveConfig.scaffold.id) {
         inst.adaptiveConfig.scaffold.id = (inst.template_id || 'v1') + '_scaffold';
      }
      if (!inst.adaptiveConfig.scaffold.trigger_on) {
         inst.adaptiveConfig.scaffold.trigger_on = ["conversion_error", "place_name_error"];
      }
    }

    const answerPayload = JSON.stringify({ ans_value: String(correctValue) });
    inst.correctAnswerText = answerPayload;
    inst.adaptiveConfig.correctAnswerText = answerPayload;
  }

  if (logic === 'grade_5_arithmetic_word_problem') {
    let name, num1, num2, unit, color1, color2, sum;

    if (overrideVariables) {
      name = overrideVariables.name;
      num1 = overrideVariables.num_1;
      num2 = overrideVariables.num_2;
      unit = overrideVariables.unit;
      color1 = overrideVariables.color_1;
      color2 = overrideVariables.color_2;
      sum = overrideVariables.sum;
    } else {
      const names = ["Noah", "Liam", "Mason", "Jacob", "William", "Ethan", "Emma", "Olivia", "Sophia", "Ava", "Isabella", "Aarav", "Vivaan", "Aditya", "Vihaan", "Arjun", "Krishna", "Ishaan", "Ananya", "Diya", "Saanvi", "Kiara", "Prisha", "Riya"];
      const units = ["litres", "kilograms", "meters", "boxes", "bags"];
      const colors = ["white", "sea green", "blue", "red", "yellow", "orange", "purple"];
      
      name = names[Math.floor(Math.random() * names.length)];
      unit = units[Math.floor(Math.random() * units.length)];
      const shuffledColors = colors.sort(() => 0.5 - Math.random());
      color1 = shuffledColors[0];
      color2 = shuffledColors[1];

      // Easy Mode: Sum of digits in each place < 10 (No carries)
      let n1, n2;
      let valid = false;
      while (!valid) {
        n1 = Math.floor(Math.random() * 90000) + 10000;
        n2 = Math.floor(Math.random() * 90) + 10;
        
        const s1 = String(n1);
        const s2 = String(n2);
        
        // Check ones:
        const d1_o = Number(s1[s1.length - 1]);
        const d2_o = Number(s2[s2.length - 1]);
        // Check tens:
        const d1_t = Number(s1[s1.length - 2]);
        const d2_t = Number(s2[s2.length - 2]);

        if (d1_o + d2_o < 10 && d1_t + d2_t < 10) {
          valid = true;
          num1 = n1;
          num2 = n2;
        }
      }
      sum = num1 + num2;
    }

    const n1Fmt = Number(num1).toLocaleString('en-IN');
    const n2Fmt = Number(num2).toLocaleString('en-IN');
    const sumFmt = Number(sum).toLocaleString('en-IN');

    inst.adaptiveConfig.variables = {
      ...(inst.adaptiveConfig.variables || {}),
      name, num_1: num1, num_2: num2, unit, color_1: color1, color_2: color2, sum,
      num_1_fmt: n1Fmt, num_2_fmt: n2Fmt, sum_fmt: sumFmt
    };

    const vars = inst.adaptiveConfig.variables;
    inst.parts = hydrateNode(question.parts || [], vars);

    // Procedural Solution Generation
    const s1 = String(num1);
    const s2 = String(num2);
    const sSum = String(sum);
    
    const d1_o = s1[s1.length - 1]; const d2_o = s2[s2.length - 1]; const r_o = sSum[sSum.length - 1];
    const d1_t = s1[s1.length - 2]; const d2_t = s2[s2.length - 2]; const r_t = sSum[sSum.length - 2];
    const d1_h = s1[s1.length - 3]; const r_h = sSum[sSum.length - 3];
    const d1_th = s1[s1.length - 4]; const r_th = sSum[sSum.length - 4];
    const d1_tth = s1[s1.length - 5]; const r_tth = sSum[sSum.length - 5];

    const generateArith = (highlightPos = null) => {
        const rows = [
            { kind: "text", text: `  ${n1Fmt.padStart(6, ' ')}` },
            { kind: "text", text: `+ ${n2Fmt.padStart(6, ' ')}` },
            { kind: "divider" }
        ];
        
        let resultLine = `  ${sumFmt.padStart(6, ' ')}`;
        // Simple highlighting hack for static solution: wrap in stars for renderer to bold if it supports it
        // Or we can just use the vertical display style.
        rows.push({ kind: "text", text: resultLine });
        return { type: "arithmeticLayout", layout: { rows: rows } };
    };

    // For a "pro" solution like the screenshot, we want vertical parts
    const solutionParts = [
        { type: "text", content: `Add the numbers of ${unit}.` },
        { type: "text", content: `**Add:**` },
        { type: "arithmeticLayout", layout: { rows: [
            { kind: "text", text: `${n1Fmt.padStart(10, ' ')}` },
            { kind: "text", text: `+ ${n2Fmt.padStart(8, ' ')}` },
            { kind: "divider" }
        ] } },
        { type: "text", content: `Add the ones. Add ${d1_o} + ${d2_o} = ${r_o}.` },
        { type: "arithmeticLayout", layout: { rows: [
            { kind: "text", text: `${n1Fmt.slice(0, -1)}*${d1_o}`.padStart(10, ' ') },
            { kind: "text", text: `+ ${n2Fmt.slice(0, -1)}*${d2_o}`.padStart(8, ' ') },
            { kind: "divider" },
            { kind: "text", text: `*${r_o}`.padStart(10, ' ') }
        ] } },
        { type: "text", content: `Add the tens. Add ${d1_t} + ${d2_t} = ${r_t}.` },
        { type: "arithmeticLayout", layout: { rows: [
            { kind: "text", text: `${n1Fmt.slice(0, -2)}*${d1_t}${d1_o}`.padStart(10, ' ') },
            { kind: "text", text: `+ *${d2_t}${d2_o}`.padStart(8, ' ') },
            { kind: "divider" },
            { kind: "text", text: `*${r_t}${r_o}`.padStart(10, ' ') }
        ] } },
        { type: "text", content: `Add the hundreds. Bring down the ${d1_h}.` },
        { type: "arithmeticLayout", layout: { rows: [
            { kind: "text", text: `${n1Fmt.slice(0, -4)}*${d1_h}${s1.slice(-2).padStart(3, ',')}`.padStart(10, ' ') },
            { kind: "text", text: `+ ${n2Fmt}`.padStart(8, ' ') },
            { kind: "divider" },
            { kind: "text", text: `*${r_h}${sSum.slice(-2).padStart(3, ',')}`.padStart(10, ' ') }
        ] } },
        { type: "text", content: `The sum is ${sumFmt}. ${name} used ${sumFmt} ${unit} of paint in all.` }
    ];

    inst.solution = solutionParts.map(p => ({ ...p, isVertical: true }));
    
    const answerPayload = JSON.stringify({ ans_value: String(sum) });
    inst.correctAnswerText = answerPayload;
    inst.adaptiveConfig.correctAnswerText = answerPayload;
  }

  if (logic === 'rounding_template_v1') {
    let number, targetPlaceMultiplier, targetPlaceName, roundedValue, targetDigit, rightDigit, isRoundUp;
    
    if (overrideVariables) {
      number = overrideVariables.number;
      targetPlaceMultiplier = overrideVariables.target_place_multiplier;
      targetPlaceName = overrideVariables.target_place_name;
      roundedValue = overrideVariables.rounded_value;
      targetDigit = overrideVariables.target_digit;
      rightDigit = overrideVariables.right_digit;
      isRoundUp = overrideVariables.is_round_up;
    } else {
      const dataSource = question.data_source || inst.adaptiveConfig?.data_source || { range: [1000, 9999] };
      const range = dataSource.range || [1000, 9999];
      number = Math.floor(Math.random() * (range[1] - range[0] + 1)) + range[0];
      
      const places = [1000, 100, 10]; // Supported rounding targets
      const names = { 1000: "thousand", 100: "hundred", 10: "ten" };
      
      // Filter based on number magnitude (don't round to thousands if number is < 1000)
      const validMultipliers = places.filter(p => p * 10 <= number * 10);
      targetPlaceMultiplier = validMultipliers[Math.floor(Math.random() * validMultipliers.length)];
      targetPlaceName = names[targetPlaceMultiplier];
      
      // Calculate rounding
      const factor = targetPlaceMultiplier;
      const rightPlaceMultiplier = factor / 10;
      
      targetDigit = Math.floor((number / factor) % 10);
      rightDigit = Math.floor((number / rightPlaceMultiplier) % 10);
      
      isRoundUp = rightDigit >= 5;
      
      if (isRoundUp) {
        roundedValue = (Math.floor(number / factor) + 1) * factor;
      } else {
        roundedValue = Math.floor(number / factor) * factor;
      }
    }

    const numStr = String(number);
    const nFmt = number.toLocaleString('en-IN');
    const rFmt = roundedValue.toLocaleString('en-IN');
    
    // Highlight digits in formatted strings
    const highlightInFormatted = (fmtStr, targetDigitValue, isRight = false) => {
        // Find the digit in the formatted string. 
        // For rounding, we usually want the specific place.
        // If it's the target digit, it's the first occurrence of that digit at the expected place.
        // A safer way: iterate chars and count digits.
        const chars = fmtStr.split('');
        let digitCount = 0;
        const targetDigitPos = numStr.length - 1 - (isRight ? (Math.log10(targetPlaceMultiplier) - 1) : Math.log10(targetPlaceMultiplier));
        
        for (let i = 0; i < chars.length; i++) {
            if (/[0-9]/.test(chars[i])) {
                if (digitCount === targetDigitPos) {
                    chars[i] = `<span style="color:blue;font-weight:800">${chars[i]}</span>`;
                    break;
                }
                digitCount++;
            }
        }
        return chars.join('');
    };

    const highlightRangeInFormatted = (fmtStr, startDigitPos, color = 'blue') => {
        const chars = fmtStr.split('');
        let digitCount = 0;
        for (let i = 0; i < chars.length; i++) {
            if (/[0-9]/.test(chars[i])) {
                if (digitCount >= startDigitPos) {
                    chars[i] = `<span style="color:${color};font-weight:800">${chars[i]}</span>`;
                }
                digitCount++;
            }
        }
        return chars.join('');
    };

    const targetPos = numStr.length - 1 - Math.log10(targetPlaceMultiplier);
    const rightPos = targetPos + 1;

    inst.adaptiveConfig.variables = {
      ...(inst.adaptiveConfig.variables || {}),
      number, target_place_multiplier: targetPlaceMultiplier, target_place_name: targetPlaceName,
      rounded_value: roundedValue, target_digit: targetDigit, right_digit: rightDigit, is_round_up: isRoundUp
    };

    const templateVars = {
      ...inst.adaptiveConfig.variables,
      number_formatted: nFmt,
      rounded_formatted: rFmt,
      target_digit_highlighted: highlightInFormatted(nFmt, targetDigit, false),
      right_digit_highlighted: highlightInFormatted(nFmt, rightDigit, true),
      round_direction: isRoundUp ? "up" : "down",
      comparison_text: isRoundUp ? "5 or higher" : "less than 5",
      remainder_highlighted_src: highlightRangeInFormatted(nFmt, rightPos),
      remainder_highlighted_dest: highlightRangeInFormatted(rFmt, rightPos)
    };

    inst.parts = hydrateNode(question.parts || [], templateVars);
    if (question.solution) {
      const sol = typeof question.solution === 'string' ? JSON.parse(question.solution) : question.solution;
      inst.solution = hydrateNode(sol, templateVars);
    }
    
    inst.correctAnswerText = JSON.stringify({ ans: String(roundedValue) });
    inst.adaptiveConfig.correctAnswerText = inst.correctAnswerText;
  }

  if (logic === 'arithmetic_template_v1') {
    const dataSource = question.data_source || inst.adaptiveConfig?.data_source || {};
    const vars = inst.adaptiveConfig?.variables || {};
    const operation = vars.operation || dataSource.operation || (Math.random() > 0.5 ? 'addition' : 'subtraction');
    const digits = dataSource.digits || 3;
    const range = digits === 3 ? [100, 999] : [1000, 9999];
    
    let n1 = vars.num1 || (Math.floor(Math.random() * (range[1] - range[0] + 1)) + range[0]);
    let n2 = vars.num2 || (Math.floor(Math.random() * (range[1] - range[0] + 1)) + range[0]);
    
    if (operation === 'subtraction' && !vars.num1) {
      if (n1 < n2) [n1, n2] = [n2, n1];
    }
    
    const result = operation === 'addition' ? n1 + n2 : n1 - n2;
    const resStr = String(result);
    const n1Str = String(n1);
    const n2Str = String(n2);
    
    // Determine max columns needed
    const maxLen = Math.max(n1Str.length, n2Str.length, resStr.length);
    
    const getCellsForNum = (num) => {
      return String(num).split('').map((char) => ({
        kind: 'fixed',
        value: char
      }));
    };

    const answerCells = [];
    const correctPayload = {};
    const resArr = resStr.split('');
    const resPadding = Math.max(0, maxLen - resArr.length);

    for (let i = 0; i < maxLen; i++) {
      const cellId = `a_${i}`;
      answerCells.push({ id: cellId, type: 'digit' });
      
      // Map result digits from left to right, considering padding
      const resIdx = i - resPadding;
      correctPayload[cellId] = resIdx >= 0 ? resArr[resIdx] : "";
    }

    const rows = [
      {
        kind: 'answer',
        cells: getCellsForNum(n1)
      },
      {
        kind: 'answer',
        prefix: operation === 'addition' ? '+' : '-',
        cells: getCellsForNum(n2)
      },
      { kind: 'divider' },
      {
        kind: 'answer',
        cells: answerCells
      }
    ];

    const arithmeticPart = {
      type: 'arithmeticLayout',
      isVertical: true,
      layout: {
        mode: 'placeValue',
        inputMode: 'digitPad',
        rows: rows
      }
    };

    inst.parts = [
      ...(question.parts || []).filter(p => p.type !== 'arithmeticLayout'),
      arithmeticPart
    ];

    inst.correctAnswerText = JSON.stringify(correctPayload);
    inst.adaptiveConfig.variables = { 
      ...(inst.adaptiveConfig.variables || {}),
      num1: n1, num2: n2, result, operation 
    };
    inst.adaptiveConfig.correctAnswerText = inst.correctAnswerText;
    
    // Auto-generate solution text if not provided
    if (!inst.solution || inst.solution === "[]") {
        inst.solution = `${n1} ${operation === 'addition' ? '+' : '-'} ${n2} = ${result}`;
    }
  }

  if (logic === 'base_ten_blocks_v1') {
    let number;
    let dataSource = question.data_source || inst.adaptiveConfig?.data_source || { range: [100, 9999] };
    let range = dataSource.range || [100, 9999];

    if (overrideVariables) {
      number = overrideVariables.number;
    } else {
      number = Math.floor(Math.random() * (range[1] - range[0] + 1)) + range[0];
    }

    const th = Math.floor(number / 1000);
    const h = Math.floor((number % 1000) / 100);
    const t = Math.floor((number % 100) / 10);
    const o = number % 10;

    inst.adaptiveConfig.variables = {
      ...(inst.adaptiveConfig.variables || {}),
      number,
      thousand_count: th,
      hundred_count: h,
      ten_count: t,
      one_count: o
    };

    const templateVars = { 
      ...inst.adaptiveConfig.variables,
      number_formatted: number.toLocaleString('en-IN')
    };

    inst.parts = hydrateNode(question.parts || [], templateVars);
    
    if (question.solution) {
      let parsedSolution = question.solution;
      if (typeof parsedSolution === 'string') {
        try { parsedSolution = JSON.parse(parsedSolution); } catch (e) { }
      }
      inst.solution = hydrateNode(parsedSolution, templateVars);
    } else {
      inst.solution = `Showing ${th} thousands, ${h} hundreds, ${t} tens and ${o} ones. Total number is ${number}.`;
    }

    const answerPayload = JSON.stringify({ ans: String(number) });
    inst.correctAnswerText = answerPayload;
    inst.adaptiveConfig.correctAnswerText = answerPayload;
  }

  if (logic === 'base_ten_model_selection_v1') {
    let targetNum, distractorNum;

    if (overrideVariables) {
      targetNum = overrideVariables.target_num;
      distractorNum = overrideVariables.distractor_num;
    } else {
      const dataSource = question.data_source || inst.adaptiveConfig?.data_source || { range: [11, 99] };
      const range = dataSource.range || [11, 99];
      targetNum = Math.floor(Math.random() * (range[1] - range[0] + 1)) + range[0];

      const placeStep = targetNum >= 100 ? 100 : 10;
      const upDist = targetNum + placeStep;
      const downDist = targetNum - placeStep;
      const isUpValid = upDist <= range[1];
      const isDownValid = downDist >= range[0];

      if (isUpValid && isDownValid) {
        distractorNum = Math.random() < 0.5 ? upDist : downDist;
      } else if (isUpValid) {
        distractorNum = upDist;
      } else {
        distractorNum = downDist;
      }
    }

    const decomposeBaseTen = (num) => ({
      thousands: Math.floor(num / 1000),
      hundreds: Math.floor((num % 1000) / 100),
      tens: Math.floor((num % 100) / 10),
      ones: num % 10,
    });

    const targetModel = decomposeBaseTen(targetNum);
    const distractorModel = decomposeBaseTen(distractorNum);

    const tThousands = targetModel.thousands;
    const tHundreds = targetModel.hundreds;
    const tTens = targetModel.tens;
    const tOnes = targetNum % 10;
    const dThousands = distractorModel.thousands;
    const dHundreds = distractorModel.hundreds;
    const dTens = distractorModel.tens;
    const dOnes = distractorModel.ones;



    const shuffledOrder = [0, 1];

    inst.adaptiveConfig.variables = {
      ...(inst.adaptiveConfig.variables || {}),
      target_num: targetNum,
      target_thousands: tThousands,
      target_hundreds: tHundreds,
      target_tens: tTens,
      target_ones: tOnes,
      distractor_num: distractorNum,
      distractor_thousands: dThousands,
      distractor_hundreds: dHundreds,
      distractor_tens: dTens,
      distractor_ones: dOnes,
      shuffled_order: shuffledOrder
    };

    const baseTenVars = inst.adaptiveConfig.variables;

    let customOptions = [];
    if (question.options && question.options.length > 0) {
      customOptions = hydrateNode(question.options, baseTenVars).map(o => ({
        ...o,
        parts: o.parts,
        label: o.label || (isExplicitlyCorrect(o.is_correct ?? o.isCorrect) ? String(targetNum) : String(distractorNum)),
        isCorrect: isExplicitlyCorrect(o.is_correct ?? o.isCorrect)
      }));
    } else {
      customOptions = [
        { 
          parts: [ { type: "baseTenBlocks", thousands: tThousands, hundreds: tHundreds, tens: tTens, ones: tOnes, variant: "green" } ],
          label: String(targetNum),
          isCorrect: true
        },
        { 
          parts: [ { type: "baseTenBlocks", thousands: dThousands, hundreds: dHundreds, tens: dTens, ones: dOnes, variant: "purple" } ],
          label: String(distractorNum),
          isCorrect: false
        }
      ];
    }
    
    inst.parts = hydrateNode(question.parts || [
      { type: "text", content: "Which place-value model shows {target_num}?" }
    ], baseTenVars);

    const shuffled = shuffledOrder.map(idx => customOptions[idx]);

    inst.options = shuffled.map(({ isCorrect, is_correct, ...option }) => option);
    inst.correctAnswerIndex = shuffledOrder.findIndex(idx => customOptions[Number(idx)].isCorrect);

    // Solution
    if (question.solution) {
      let parsedSolution = question.solution;
      if (typeof parsedSolution === 'string') {
        try { parsedSolution = JSON.parse(parsedSolution); } catch (e) { }
      }
      inst.solution = hydrateNode(parsedSolution, baseTenVars);
    } else {
      // Dynamic solution based on shuffled order
      const model1Val = shuffled[0].label;
      const model2Val = shuffled[1].label;
      const model1Tens = Math.floor(Number(model1Val) / 10);
      const model2Tens = Math.floor(Number(model2Val) / 10);
      const ones = targetNum % 10;

      inst.solution = [
        { type: "text", content: "**Find the model that shows {target_num}.**" },
        { type: "text", content: `**Option 1:** This model has **${model1Tens} tens** and **${ones} ones**. It shows **${model1Val}**.` },
        { type: "text", content: `**Option 2:** This model has **${model2Tens} tens** and **${ones} ones**. It shows **${model2Val}**.` }
      ].map(p => hydrateNode(p, baseTenVars));
    }

    inst.type = 'mcq';
    inst.isVertical = true;
    const answerPayload = JSON.stringify({ ans_value: String(targetNum) });
    inst.correctAnswerText = answerPayload;
    inst.adaptiveConfig.correctAnswerText = answerPayload;
  }



  if (logic === 'which_model_matches_number_v1') {
    let targetNum, distractorNum, targetColor, distractorColor, isTargetOptionA;

    if (overrideVariables) {
      targetNum = overrideVariables.target_num;
      distractorNum = overrideVariables.distractor_num;
      targetColor = overrideVariables.target_color || "green";
      distractorColor = overrideVariables.distractor_color || "purple";
      isTargetOptionA = overrideVariables.is_target_option_a ?? true;
    } else {
      const dataSource = question.data_source || inst.adaptiveConfig?.data_source || { range: [11, 99] };
      const range = dataSource.range || [11, 99];
      targetNum = Math.floor(Math.random() * (range[1] - range[0] + 1)) + range[0];
      
      // Dynamic offsets based on range
      let offsets = [1, 10];
      if (range[1] >= 100) offsets.push(100);
      if (range[1] >= 1000) offsets.push(1000);
      
      let validDistractors = offsets.map(opt => targetNum + opt).filter(val => val <= range[1]);
      if (validDistractors.length === 0) {
        validDistractors = offsets.map(opt => targetNum - opt).filter(val => val >= range[0]);
      }
      // If still no valid distractors (rare), just pick a random number in range
      if (validDistractors.length === 0) {
        validDistractors = [targetNum === range[0] ? range[0] + 1 : range[0]];
      }
      distractorNum = validDistractors[Math.floor(Math.random() * validDistractors.length)];
      
      targetColor = Math.random() < 0.5 ? "green" : "purple";
      distractorColor = targetColor === "green" ? "purple" : "green";
      isTargetOptionA = Math.random() < 0.5;
    }

    const tThousands = Math.floor(targetNum / 1000);
    const tHundreds = Math.floor((targetNum % 1000) / 100);
    const tTens = Math.floor((targetNum % 100) / 10);
    const tOnes = targetNum % 10;

    const dThousands = Math.floor(distractorNum / 1000);
    const dHundreds = Math.floor((distractorNum % 1000) / 100);
    const dTens = Math.floor((distractorNum % 100) / 10);
    const dOnes = distractorNum % 10;

    const customVars = {
      ...(inst.adaptiveConfig?.variables || {}),
      target_num: targetNum,
      target_thousands: tThousands,
      target_hundreds: tHundreds,
      target_tens: tTens,
      target_ones: tOnes,
      distractor_num: distractorNum,
      distractor_thousands: dThousands,
      distractor_hundreds: dHundreds,
      distractor_tens: dTens,
      distractor_ones: dOnes,
      target_color: targetColor,
      distractor_color: distractorColor,
      option_a_color: isTargetOptionA ? targetColor : distractorColor,
      option_b_color: isTargetOptionA ? distractorColor : targetColor,
      is_target_option_a: isTargetOptionA,
    };
    
    inst.adaptiveConfig.variables = customVars;

    let customOptions = [];
    if (question.options && question.options.length > 0) {
      customOptions = hydrateNode(question.options, customVars).map(o => ({
        ...o,
        parts: o.parts ? o.parts : [{ type: 'text', content: o.label || o.content }],
        label: o.label || o.content || (isExplicitlyCorrect(o.is_correct ?? o.isCorrect) ? String(targetNum) : String(distractorNum)),
        isCorrect: isExplicitlyCorrect(o.is_correct ?? o.isCorrect)
      }));
    } else {
      customOptions = [
        { 
          label: String(targetNum), 
          parts: [{ 
            type: 'baseTenBlocks', 
            thousands: tThousands,
            hundreds: tHundreds,
            tens: tTens, 
            ones: tOnes, 
            variant: targetColor 
          }], 
          isCorrect: true 
        },
        { 
          label: String(distractorNum), 
          parts: [{ 
            type: 'baseTenBlocks', 
            thousands: dThousands,
            hundreds: dHundreds,
            tens: dTens, 
            ones: dOnes, 
            variant: distractorColor 
          }], 
          isCorrect: false 
        }
      ];
    }
    
    let shuffledOrder;
    if (overrideVariables && overrideVariables.shuffled_order) {
      shuffledOrder = overrideVariables.shuffled_order;
    } else {
      shuffledOrder = isTargetOptionA ? [0, 1] : [1, 0];
    }
    inst.adaptiveConfig.variables.shuffled_order = shuffledOrder;
    
    const shuffled = shuffledOrder.map(idx => customOptions[Number(idx)]);
    inst.options = shuffled.map(({ isCorrect, is_correct, ...option }) => option);
    inst.correctAnswerIndex = shuffledOrder.findIndex(idx => customOptions[Number(idx)].isCorrect);

    inst.parts = hydrateNode(question.parts || [
      { type: "text", content: "Which place-value model shows **{target_num}**?" }
    ], customVars);

    // Build a dynamic solution if none provided or if it needs more detail
    if (question.solution) {
      let parsed = typeof question.solution === 'string' ? JSON.parse(question.solution) : question.solution;
      inst.solution = hydrateNode(parsed, customVars);
    } else {
      // Procedural fallback solution
      const breakdown = [];
      if (tThousands > 0) breakdown.push(`**${tThousands}** thousands (cubes)`);
      if (tHundreds > 0) breakdown.push(`**${tHundreds}** hundreds (flats)`);
      if (tTens > 0) breakdown.push(`**${tTens}** tens (rods)`);
      if (tOnes > 0) breakdown.push(`**${tOnes}** ones (units)`);

      inst.solution = [
        { type: "text", content: "### Solution Strategy", isVertical: true },
        { type: "text", content: `To find **${targetNum}**, break it into its place values:`, isVertical: true },
        { type: "text", content: breakdown.map(b => `- ${b}`).join('\n'), isVertical: true },
        { type: "text", content: `The **${targetColor}** model matches this breakdown, showing **${targetNum}**.`, isVertical: true }
      ];
    }
    
    inst.type = 'mcq';
    inst.isVertical = false; 
    const answerPayload = JSON.stringify({ ans: String(targetNum) });
    inst.correctAnswerText = answerPayload;
    inst.adaptiveConfig.correctAnswerText = answerPayload;
  }
  if (logic === 'derivatives_of_square_root_compositions_v1') {
    let a, b;
    if (overrideVariables) {
      a = overrideVariables.a;
      b = overrideVariables.b;
    } else {
      a = Math.floor(Math.random() * 8) + 2; // 2 to 9
      if (Math.random() < 0.3) a = -a; 
      
      b = Math.floor(Math.random() * 18) - 9; // -9 to 9
      if (b === 0) b = 5;
    }

    const aStr = a === 1 ? 'x' : (a === -1 ? '-x' : `${a}x`);
    const sign = b > 0 ? '+' : '-';
    let inner_f = `${aStr} ${sign} ${Math.abs(b)}`;

    const combined_f = `\\sqrt{${inner_f}}`;
    const deriv_inner = `${a}`;
    const final_ans = `\\frac{${deriv_inner}}{2\\sqrt{${inner_f}}}`;

    const customVars = {
      ...(inst.adaptiveConfig?.variables || {}),
      a,
      b,
      inner_f,
      combined_f,
      deriv_inner,
      final_ans
    };

    inst.adaptiveConfig.variables = customVars;

    // Use scaffold by default unless explicitly disabled, or if explicitly requested via adaptiveConfig
    const useScaffold = inst.adaptiveConfig?.useScaffold !== false;

    if (!useScaffold) {
      // Symbolic Mode: Single big input for the full LaTeX string
      inst.parts = [
        { type: 'text', content: 'Find the derivative of $f(x)$.', hasAudio: true },
        { type: 'mathLatex', content: `f(x) = ${combined_f}`, isDisplayMode: true },
        {
          type: 'sequence',
          children: [
            { type: 'text', content: 'f\'(x) = ' },
            { 
              type: 'blank', 
              id: 'ans', 
              width: 350, 
              placeholder: 'Type your answer...' 
            }
          ]
        }
      ];
      
      // Inject the symbolic keypad
      inst.adaptiveConfig.showKeypad = true;
      inst.adaptiveConfig.keypadKeys = [
        { label: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="6" y1="12" x2="18" y2="12"/><rect x="8" y="4" width="8" height="6" rx="1"/><rect x="8" y="14" width="8" height="6" rx="1"/></svg>', value: '\\frac{}{}', id: 'frac' },
        { label: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12h2l3 9 4-18h10"/></svg>', value: '\\sqrt{}', id: 'sqrt' },
        'x', '(', ')', '+', '-', '7', '8', '9', '4', '5', '6', '1', '2', '3', '0', '⌫'
      ];

      inst.correctAnswerText = JSON.stringify({ ans: final_ans.replace(/\s+/g, '') });
    } else {
      // Scaffold Mode: Fraction and Sqrt structure pre-provided as separate inputs
      inst.parts = hydrateNode(question.parts || [], customVars);
      inst.correctAnswerText = JSON.stringify({ 
        n: deriv_inner,
        d: inner_f.replace(/\s+/g, '') 
      });
    }

    if (question.solution) {
      inst.solution = hydrateNode(question.solution, customVars);
    }

    inst.type = 'fillInTheBlank';
    inst.adaptiveConfig.correctAnswerText = inst.correctAnswerText;
  }

  if (logic === 'base_ten_matching_v1') {
    let target_num;
    if (overrideVariables) {
      target_num = overrideVariables.target_num;
    } else {
      const min = inst.adaptiveConfig?.data_source?.range?.[0] || 1000;
      const max = inst.adaptiveConfig?.data_source?.range?.[1] || 9999;
      target_num = Math.floor(Math.random() * (max - min + 1)) + min;
    }

    const t_digit = Math.floor(target_num / 1000);
    const h_digit = Math.floor((target_num % 1000) / 100);
    const te_digit = Math.floor((target_num % 100) / 10);
    const o_digit = target_num % 10;

    // Distractor swaps Hundreds and Tens
    const distractor_num = t_digit * 1000 + te_digit * 100 + h_digit * 10 + o_digit;

    const customVars = {
      ...(inst.adaptiveConfig?.variables || {}),
      target_num,
      t_digit,
      h_digit,
      te_digit,
      o_digit,
      distractor_num
    };

    inst.adaptiveConfig.variables = customVars;

    // Build the MCQ parts
    if (!inst.adaptiveConfig?.shuffled_order || overrideVariables) {
      // 0 is correct, 1 is distractor
      inst.adaptiveConfig.shuffled_order = Math.random() < 0.5 ? [0, 1] : [1, 0];
    }
    const order = inst.adaptiveConfig.shuffled_order;

    const correctOption = {
      type: 'baseTenBlocks',
      thousands: t_digit,
      hundreds: h_digit,
      tens: te_digit,
      ones: o_digit,
      variant: 'green'
    };

    const distractorOption = {
      type: 'baseTenBlocks',
      thousands: t_digit,
      hundreds: te_digit, // Swapped
      tens: h_digit,      // Swapped
      ones: o_digit,
      variant: 'blue'
    };

    const optionsArray = [correctOption, distractorOption];
    inst.options = [optionsArray[order[0]], optionsArray[order[1]]];
    inst.correctAnswerIndex = order.indexOf(0);

    inst.parts = hydrateNode(question.parts || [], customVars);
    if (question.solution) {
      inst.solution = hydrateNode(question.solution, customVars);
    }

    inst.type = 'mcq';
  }

  if (logic === 'derivatives_of_rational_functions_single_term_v1') {
    let num_a, num_b, power_n;
    if (overrideVariables) {
      num_a = overrideVariables.num_a;
      num_b = overrideVariables.num_b;
      power_n = overrideVariables.power_n;
    } else {
      num_a = Math.floor(Math.random() * 8) + 2; 
      num_b = Math.floor(Math.random() * 9) + 1; 
      power_n = Math.floor(Math.random() * 4) + 2; 
    }

    const f_x = `\\frac{${num_a}x^{${power_n}} + ${num_b}}{x^{${power_n}}}`;
    const simplified_f_x = `${num_a} + x^{-${power_n}}`; // if num_b is 1, keep it clean
    const step1_f = `\\frac{${num_a}x^{${power_n}}}{x^{${power_n}}} + \\frac{${num_b}}{x^{${power_n}}}`;
    const simplified_final = num_b === 1 ? `${num_a} + x^{-${power_n}}` : `${num_a} + ${num_b}x^{-${power_n}}`;
    
    const coeff = -(num_b * power_n);
    const new_power = power_n + 1;
    const final_ans = `-\\frac{${Math.abs(coeff)}}{x^{${new_power}}}`;

    const customVars = {
      ...(inst.adaptiveConfig?.variables || {}),
      num_a,
      num_b,
      power_n,
      f_x,
      step1_f,
      simplified_final,
      coeff,
      abs_coeff: Math.abs(coeff),
      new_power,
      final_ans
    };

    inst.adaptiveConfig.variables = customVars;

    const useScaffold = inst.adaptiveConfig?.useScaffold !== false;

    if (!useScaffold) {
      inst.parts = [
        { type: 'text', content: 'Find the derivative of $f(x)$.', hasAudio: true },
        { type: 'mathLatex', content: `f(x) = ${f_x}`, isDisplayMode: true },
        {
          type: 'sequence',
          children: [
            { type: 'text', content: 'f\'(x) = ' },
            { type: 'blank', id: 'ans', width: 350, placeholder: 'Type your answer...' }
          ]
        }
      ];
      inst.adaptiveConfig.showKeypad = true;
      inst.adaptiveConfig.keypadKeys = [
        { label: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="6" y1="12" x2="18" y2="12"/><rect x="8" y="4" width="8" height="6" rx="1"/><rect x="8" y="14" width="8" height="6" rx="1"/></svg>', value: '\\frac{}{}', id: 'frac' },
        'x', '^', '(', ')', '+', '-', '7', '8', '9', '4', '5', '6', '1', '2', '3', '0', '⌫'
      ];
      inst.correctAnswerText = JSON.stringify({ ans: final_ans.replace(/\s+/g, '') });
    } else {
      inst.parts = hydrateNode(question.parts || [], customVars);
      inst.correctAnswerText = JSON.stringify({ 
        n: String(coeff),
        d: `x^{${new_power}}`
      });
    }

    if (question.solution) {
      inst.solution = hydrateNode(question.solution, customVars);
    }

    inst.type = 'fillInTheBlank';
    inst.adaptiveConfig.correctAnswerText = inst.correctAnswerText;
  }

  if (logic === 'breaking_numbers_into_tens_and_ones_v1') {
    let num;
    if (overrideVariables) {
      num = overrideVariables.num;
    } else {
      const dataSource = question.data_source || inst.adaptiveConfig?.data_source || { range: [11, 9999] };
      const range = dataSource.range || [11, 9999];
      num = Math.floor(Math.random() * (range[1] - range[0] + 1)) + range[0];
    }

    const numStr = String(num);
    const hasThousands = numStr.length === 4;
    const hasHundreds = numStr.length >= 3;

    const th_digit = hasThousands ? Math.floor(num / 1000) : 0;
    const h_digit = hasHundreds ? Math.floor((num % 1000) / 100) : 0;
    const t_digit = Math.floor((num % 100) / 10);
    const o_digit = num % 10;

    const customVars = {
      ...(inst.adaptiveConfig?.variables || {}),
      num,
      th_digit,
      h_digit,
      t_digit: t_digit,
      o_digit: o_digit
    };
    inst.adaptiveConfig.variables = customVars;

    // Dynamically Construct Equation Sequence
    const sequenceChildren = [{ type: 'text', content: `**${num}** = ` }];
    
    if (hasThousands) {
      sequenceChildren.push({ type: 'input', id: 'ans_thousands', width: 60 });
      sequenceChildren.push({ type: 'text', content: ` thousands + ` });
    }
    if (hasHundreds) {
      sequenceChildren.push({ type: 'input', id: 'ans_hundreds', width: 60 });
      sequenceChildren.push({ type: 'text', content: ` hundreds + ` });
    }
    sequenceChildren.push({ type: 'input', id: 'ans_tens', width: 60 });
    sequenceChildren.push({ type: 'text', content: ` tens + ` });
    sequenceChildren.push({ type: 'input', id: 'ans_ones', width: 60 });
    sequenceChildren.push({ type: 'text', content: ` ones` });

    // Dynamically construct Table Headers
    const headers = [];
    const rows = [[]];
    const equationText = [];
    
    if (hasThousands) {
      headers.push("thousands");
      rows[0].push(`**${th_digit}**`);
      equationText.push(`${th_digit} thousands`);
    }
    if (hasHundreds) {
      headers.push("hundreds");
      rows[0].push(`**${h_digit}**`);
      equationText.push(`${h_digit} hundreds`);
    }
    headers.push("tens");
    rows[0].push(`**${t_digit}**`);
    equationText.push(`${t_digit} tens`);

    headers.push("ones");
    rows[0].push(`**${o_digit}**`);
    equationText.push(`${o_digit} ones`);

    // Override the JSON Template structurally
    inst.parts = hydrateNode(question.parts || [], customVars).map(part => {
      if (part.type === 'sequence') {
        return { ...part, children: sequenceChildren };
      }
      return part;
    });

    if (question.solution) {
      inst.solution = hydrateNode(question.solution, customVars).map(part => {
        if (part.type === 'smartTable') {
          return { ...part, headers, rows };
        }
        if (typeof part.content === 'string' && part.content.includes("=")) {
           return { ...part, content: `### **${num} = ${equationText.join(' + ')}**` };
        }
        return part;
      });
    }

    inst.type = 'fillInTheBlank';
    inst.isVertical = true;
    
    const ansPayload = { 
      ans_tens: String(t_digit),
      ans_ones: String(o_digit)
    };
    if (hasHundreds) ansPayload.ans_hundreds = String(h_digit);
    if (hasThousands) ansPayload.ans_thousands = String(th_digit);

    const answerPayload = JSON.stringify(ansPayload);
    inst.correctAnswerText = answerPayload;
    inst.adaptiveConfig.correctAnswerText = answerPayload;
  }

  if (logic === 'identifying_value_of_underlined_digit_v1') {
    let target_val, target_digit, target_place;
    let correct_num, distractor_num;
    
    if (overrideVariables) {
      target_val = overrideVariables.target_val;
      target_digit = overrideVariables.target_digit;
      target_place = overrideVariables.target_place;
      correct_num = overrideVariables.correct_num;
      distractor_num = overrideVariables.distractor_num;
    } else {
      target_digit = Math.floor(Math.random() * 9) + 1; // 1-9
      target_place = Math.random() < 0.5 ? 'ones' : 'tens';
      target_val = target_place === 'ones' ? target_digit : target_digit * 10;
      
      let tens1 = Math.floor(Math.random() * 9) + 1;
      if (tens1 === target_digit) tens1 = (tens1 % 9) + 1; // prevent 66
      
      let ones1 = Math.floor(Math.random() * 9) + 1;
      if (ones1 === target_digit) ones1 = (ones1 % 9) + 1; // prevent 66

      if (target_place === 'ones') {
        correct_num = tens1 * 10 + target_digit;
        distractor_num = target_digit * 10 + ones1; 
      } else {
        correct_num = target_digit * 10 + ones1;
        distractor_num = tens1 * 10 + target_digit;
      }
    }

    const correct_display = target_place === 'ones' 
      ? `${Math.floor(correct_num / 10)}<u>${target_digit}</u>` 
      : `<u>${target_digit}</u>${correct_num % 10}`;
      
    const distractor_display = target_place === 'ones' 
      ? `<u>${target_digit}</u>${distractor_num % 10}`
      : `${Math.floor(distractor_num / 10)}<u>${target_digit}</u>`;

    const customVars = {
      ...(inst.adaptiveConfig?.variables || {}),
      target_val,
      target_digit,
      target_place,
      correct_num,
      distractor_num,
      correct_display,
      distractor_display
    };

    inst.adaptiveConfig.variables = customVars;

    inst.parts = hydrateNode(question.parts || [], customVars);
    
    // Shuffle Options Securely
    if (!inst.adaptiveConfig?.shuffled_order || overrideVariables) {
      // 0 is correct, 1 is distractor
      inst.adaptiveConfig.shuffled_order = Math.random() < 0.5 ? [0, 1] : [1, 0];
    }
    const order = inst.adaptiveConfig.shuffled_order;
    const optionsArray = hydrateNode(question.options || [], customVars);
    
    inst.options = [optionsArray[order[0]], optionsArray[order[1]]];
    inst.correctAnswerIndex = order.indexOf(0);

    if (question.solution) {
      let parsed = typeof question.solution === 'string' ? JSON.parse(question.solution) : question.solution;
      inst.solution = hydrateNode(parsed, customVars);
    }
    
    inst.type = 'mcq';
  }

  if (logic === 'identifying_numbers_with_labeled_base_10_blocks_v1') {
    let num;
    if (overrideVariables) {
      num = overrideVariables.num_raw ?? Number(String(overrideVariables.num).replace(/,/g, ''));
    } else {
      const dataSource = question.data_source || inst.adaptiveConfig?.data_source || { range: [100, 999] };
      const range = dataSource.range || [100, 999];
      num = Math.floor(Math.random() * (range[1] - range[0] + 1)) + range[0];
    }

    const strNum = String(num).padStart(4, '0');
    const thDigit = Number(strNum[strNum.length - 4] || 0); // Thousands
    const hDigit = Number(strNum[strNum.length - 3] || 0);
    const tDigit = Number(strNum[strNum.length - 2]);
    const oDigit = Number(strNum[strNum.length - 1]);

    const customVars = {
      ...(inst.adaptiveConfig?.variables || {}),
      num: Number(num).toLocaleString('en-IN'),
      num_raw: num,
      th_digit: thDigit,
      h_digit: hDigit,
      t_digit: tDigit,
      o_digit: oDigit,
      th_val: thDigit * 1000,
      h_val: hDigit * 100,
      t_val: tDigit * 10,
    };

    inst.adaptiveConfig.variables = customVars;

    inst.parts = hydrateNode(question.parts || [
      {
        type: "labeledBaseTenGrid",
        thousands: "{th_digit}",
        hundreds: "{h_digit}",
        tens: "{t_digit}",
        ones: "{o_digit}"
      },
      {
        type: "text",
        content: "**What number is shown?**"
      },
      {
        type: "input",
        id: "ans_total"
      }
    ], customVars);

    if (question.solution) {
      let parsed = typeof question.solution === 'string' ? JSON.parse(question.solution) : question.solution;
      
      if (thDigit === 0) {
        parsed = parsed.filter(step => {
          if (step.type === 'text' && typeof step.content === 'string') {
            return !step.content.includes('**Thousands:**');
          }
          return true;
        });
      }
      
      let finalSolution = hydrateNode(parsed, customVars);
      
      finalSolution = finalSolution.map(step => {
        if (step.type === 'text' && step.content && step.content.includes('{h_val} + {t_val}')) {
          const eq = thDigit > 0 
            ? `### **${thDigit * 1000} + ${hDigit * 100} + ${tDigit * 10} + ${oDigit} = ${num}**`
            : `### **${hDigit * 100} + ${tDigit * 10} + ${oDigit} = ${num}**`;
          return { ...step, content: eq };
        }
        return step;
      });
      
      inst.solution = finalSolution;
    }

    inst.type = 'fillInTheBlank';
    inst.isVertical = true;
    
    // Set correct answer
    const answerPayload = JSON.stringify({ ans_total: String(num) });
    inst.correctAnswerText = answerPayload;
    inst.adaptiveConfig.correctAnswerText = answerPayload;
  }




  if (logic === 'identifying_place_value_by_digit_v1') {
    let num, targetDigit, correctAns, targetPlaceIndex, strNum;

    if (overrideVariables) {
      num = overrideVariables.num_raw ?? Number(String(overrideVariables.num).replace(/,/g, ''));
      targetDigit = overrideVariables.target_digit;
      strNum = String(num);
      targetPlaceIndex = strNum.indexOf(String(targetDigit));
    } else {
      const dataSource = question.data_source || inst.adaptiveConfig?.data_source || { range: [11, 99] };
      const range = dataSource.range || [11, 99];
      
      let attempts = 0;
      let isValid = false;
      do {
        num = Math.floor(Math.random() * (range[1] - range[0] + 1)) + range[0];
        strNum = String(num);
        
        let digits = strNum.split('');
        let uniqueDigits = new Set(digits);
        isValid = uniqueDigits.size === digits.length;
        
        targetPlaceIndex = Math.floor(Math.random() * strNum.length);
        targetDigit = strNum[targetPlaceIndex];
        
        attempts++;
      } while (!isValid && attempts < 200);
    }

    const INDIAN_PLACES = [
      "ones", "tens", "hundreds", "thousands", "ten thousands", "lakhs", "ten lakhs", "crores", "ten crores"
    ];
    let distFromRight = strNum.length - targetPlaceIndex - 1;
    correctAns = `${INDIAN_PLACES[distFromRight]} place`;

    const customVars = {
      ...(inst.adaptiveConfig?.variables || {}),
      num: Number(num).toLocaleString('en-IN'),
      num_raw: num,
      num_str: Number(num).toLocaleString('en-IN'),
      target_digit: targetDigit,
      correct_ans: correctAns,
    };
    
    inst.adaptiveConfig.variables = customVars;

    let customOptions = [];
    const dataSource = question.data_source || inst.adaptiveConfig?.data_source || { range: [11, 99] };
    const range = dataSource.range || [11, 99];
    
    if (question.options && question.options.length >= 3 && range[1] <= 99) {
      customOptions = hydrateNode(question.options, customVars).map(o => ({
        ...o,
        parts: o.parts ? o.parts : [{ type: 'text', content: o.label || o.content }],
        label: o.label || o.content || (isExplicitlyCorrect(o.is_correct ?? o.isCorrect) ? correctAns : "other place"),
        isCorrect: isExplicitlyCorrect(o.is_correct ?? o.isCorrect)
      }));
    } else {
      let selectedDistractors;
      if (overrideVariables && overrideVariables.selected_distractors) {
        selectedDistractors = overrideVariables.selected_distractors;
      } else {
        const maxPlaces = strNum.length;
        const allPossible = INDIAN_PLACES.slice(0, maxPlaces).map(p => `${p} place`);
        const distractors = allPossible.filter(p => p !== correctAns);
        distractors.sort(() => Math.random() - 0.5);
        selectedDistractors = distractors.slice(0, 3);
        inst.adaptiveConfig.variables.selected_distractors = selectedDistractors;
      }
      
      let candidates = [correctAns, ...selectedDistractors];
      
      customOptions = candidates.map(c => ({
        label: c,
        parts: [{ type: 'text', content: c }],
        isCorrect: c === correctAns
      }));
    }
    
    let shuffledOrder;
    if (overrideVariables && overrideVariables.shuffled_order) {
      shuffledOrder = overrideVariables.shuffled_order;
    } else {
      shuffledOrder = customOptions.map((_, i) => i);
      shuffledOrder.sort(() => Math.random() - 0.5);
    }
    inst.adaptiveConfig.variables.shuffled_order = shuffledOrder;
    
    const shuffled = shuffledOrder.map(idx => customOptions[Number(idx)]);
    inst.options = shuffled.map(({ isCorrect, is_correct, ...option }) => option);
    inst.correctAnswerIndex = shuffledOrder.findIndex(idx => customOptions[Number(idx)].isCorrect);

    inst.parts = hydrateNode(question.parts || [
      { type: "text", content: "Where is the digit **{target_digit}** in the number below?" },
      { type: "text", content: "### **{num_str}**" }
    ], customVars);

    if (question.solution) {
      let parsed = typeof question.solution === 'string' ? JSON.parse(question.solution) : question.solution;
      
      // Dynamically upgrade smartTable
      let hasSmartTable = parsed.some(p => p.type === 'smartTable');
      if (hasSmartTable) {
        let dynamicHeaders = [];
        let dynamicRow = [];
        for (let i = 0; i < strNum.length; i++) {
          dynamicHeaders.push(INDIAN_PLACES[strNum.length - i - 1]);
          const digit = strNum[i];
          dynamicRow.push(i === targetPlaceIndex ? `**${digit}**` : String(digit));
        }
        parsed = parsed.map(p => {
          if (p.type === 'smartTable') {
            return {
              ...p,
              headers: dynamicHeaders,
              rows: [dynamicRow]
            };
          }
          return p;
        });
      }
      
      inst.solution = hydrateNode(parsed, customVars);
    }
    
    inst.type = 'mcq';
    inst.isVertical = true;
    const answerPayload = JSON.stringify({ ans: correctAns });
    inst.correctAnswerText = answerPayload;
    inst.adaptiveConfig.correctAnswerText = answerPayload;
  }


  if (logic === 'rounding_mcq_v1') {

    let num, d1, d10, lowerTen, higherTen, isRoundUp, correctAns;

    if (overrideVariables) {
      num = overrideVariables.num;
    } else {
      const dataSource = question.data_source || inst.adaptiveConfig?.data_source || { range: [11, 99] };
      const range = dataSource.range || [11, 99];
      let attempts = 0;
      do {
        num = Math.floor(Math.random() * (range[1] - range[0] + 1)) + range[0];
        attempts++;
      } while (num % 10 === 0 && attempts < 50);
    }

    d1 = num % 10;
    d10 = Math.floor(num / 10);
    lowerTen = d10 * 10;
    higherTen = (d10 + 1) * 10;
    isRoundUp = d1 >= 5;
    correctAns = isRoundUp ? higherTen : lowerTen;

    const templateVars = {
      num,
      d1,
      d10,
      lower_ten: lowerTen,
      higher_ten: higherTen,
      correct_ans: correctAns,
      stay_error_ans: lowerTen,
      up_error_ans: higherTen,
      ones_error_ans: d1,
      hill_direction: isRoundUp ? "OVER the top to the higher ten" : "BACK DOWN to the lower ten"
    };

    inst.adaptiveConfig.variables = { ...(inst.adaptiveConfig.variables || {}), ...templateVars };
    
    inst.type = 'mcq';
    inst.parts = hydrateNode(question.parts || [], templateVars);
    
    if (question.options) {
      const hydratedOptions = hydrateNode(question.options, templateVars);
      // Ensure options are unique (prevent correct answer appearing twice as a distractor)
      const seen = new Set();
      const uniqueOptions = [];
      
      for (const opt of hydratedOptions) {
        const val = String(typeof opt === 'object' ? (opt.content || opt.text || '') : opt);
        if (!seen.has(val)) {
          seen.add(val);
          uniqueOptions.push(opt);
        }
      }
      inst.options = uniqueOptions;
    }

    if (inst.options) {
      inst.correctAnswerIndex = inst.options.findIndex(opt => {
        const val = typeof opt === 'object' ? (opt.content || opt.text || '') : opt;
        return String(val) === String(correctAns);
      });
    }

    if (question.solution) {
      let parsedSolution = question.solution;
      if (typeof parsedSolution === 'string') {
        try { parsedSolution = JSON.parse(parsedSolution); } catch (e) { }
      }
      inst.solution = hydrateNode(parsedSolution, templateVars);
    }

    inst.correctAnswerText = String(correctAns);
    inst.adaptiveConfig.correctAnswerText = inst.correctAnswerText;
  }

  if (logic === 'rounding_mcq_v2') {
    let num, roundTo;
    const dataSource = question.data_source || inst.adaptiveConfig?.data_source || { range: [101, 999], round_to: 100 };
    roundTo = dataSource.round_to || 100;
    
    if (overrideVariables) {
      num = overrideVariables.num;
    } else {
      const range = dataSource.range || [101, 999];
      let attempts = 0;
      do {
        num = Math.floor(Math.random() * (range[1] - range[0] + 1)) + range[0];
        attempts++;
      } while (num % roundTo === 0 && attempts < 50);
    }

    const factor = roundTo;
    const rightFactor = factor / 10;
    
    const targetDigit = Math.floor(num / factor) % 10;
    const rightDigit = Math.floor(num / rightFactor) % 10; // The digit that decides (tens for hundreds, hundreds for thousands)
    
    const isRoundUp = rightDigit >= 5;
    const lowerMultiple = Math.floor(num / factor) * factor;
    const higherMultiple = (Math.floor(num / factor) + 1) * factor;
    const correctAns = isRoundUp ? higherMultiple : lowerMultiple;

    const names = { 10: "ten", 100: "hundred", 1000: "thousand", 10000: "ten thousand" };
    const rightNames = { 10: "ones", 100: "tens", 1000: "hundreds", 10000: "thousands" };

    const templateVars = {
      num,
      target_place: names[factor],
      right_place: rightNames[factor],
      target_digit: targetDigit,
      right_digit: rightDigit,
      lower_multiple: lowerMultiple,
      higher_multiple: higherMultiple,
      correct_ans: correctAns,
      stay_error_ans: lowerMultiple,
      up_error_ans: higherMultiple,
      hill_direction: isRoundUp ? `OVER the top to the higher ${names[factor]}` : `BACK DOWN to the lower ${names[factor]}`
    };

    inst.adaptiveConfig.variables = { ...(inst.adaptiveConfig.variables || {}), ...templateVars };
    inst.type = 'mcq';
    inst.parts = hydrateNode(question.parts || [], templateVars);
    
    if (question.options) {
      const hydratedOptions = hydrateNode(question.options, templateVars);
      const seen = new Set();
      const uniqueOptions = [];
      for (const opt of hydratedOptions) {
        const val = String(typeof opt === 'object' ? (opt.content || opt.text || '') : opt);
        if (!seen.has(val)) {
          seen.add(val);
          uniqueOptions.push(opt);
        }
      }
      inst.options = uniqueOptions;
    }

    if (inst.options) {
      inst.correctAnswerIndex = inst.options.findIndex(opt => {
        const val = typeof opt === 'object' ? (opt.content || opt.text || '') : opt;
        return String(val) === String(correctAns);
      });
    }

    if (question.solution) {
      let parsedSolution = question.solution;
      if (typeof parsedSolution === 'string') {
        try { parsedSolution = JSON.parse(parsedSolution); } catch (e) { }
      }
      inst.solution = hydrateNode(parsedSolution, templateVars);
    }

    inst.correctAnswerText = String(correctAns);
    inst.adaptiveConfig.correctAnswerText = inst.correctAnswerText;
  }

  if (logic === 'rounding_fill_blank_v1') {
    let num, scale;
    const dataSource = question.data_source || inst.adaptiveConfig?.data_source || { range: [1100, 9999], scales: ["ten", "hundred", "thousand"] };
    
    // Pick a random scale from available ones
    const scales = dataSource.scales || ["ten", "hundred", "thousand"];
    scale = scales[Math.floor(Math.random() * scales.length)];

    if (overrideVariables) {
      num = overrideVariables.num;
      scale = overrideVariables.scale || scale;
    } else {
      const range = dataSource.range || [1100, 9999];
      let attempts = 0;
      do {
        num = Math.floor(Math.random() * (range[1] - range[0] + 1)) + range[0];
        attempts++;
      } while (num % 10 === 0 && attempts < 50);
    }

    const scaleFactors = { "ten": 10, "hundred": 100, "thousand": 1000 };
    const factor = scaleFactors[scale];
    const rightFactor = factor / 10;

    const targetDigit = Math.floor(num / factor) % 10;
    const checkDigit = Math.floor(num / rightFactor) % 10;

    const lowBenchmark = Math.floor(num / factor) * factor;
    const highBenchmark = (Math.floor(num / factor) + 1) * factor;
    const isRoundUp = checkDigit >= 5;
    const correctAns = isRoundUp ? highBenchmark : lowBenchmark;

    const templateVars = {
      num,
      num_formatted: num.toLocaleString('en-IN'),
      scale,
      target_digit: targetDigit,
      check_digit: checkDigit,
      low_benchmark: lowBenchmark,
      low_benchmark_formatted: lowBenchmark.toLocaleString('en-IN'),
      high_benchmark: highBenchmark,
      high_benchmark_formatted: highBenchmark.toLocaleString('en-IN'),
      value: correctAns,
      value_formatted: correctAns.toLocaleString('en-IN'),
      hill_action: isRoundUp ? "push up to the next ten" : "slide back down"
    };

    inst.adaptiveConfig.variables = { ...(inst.adaptiveConfig.variables || {}), ...templateVars };
    inst.parts = hydrateNode(question.parts || [], templateVars);
    
    if (question.solution) {
      let parsedSolution = question.solution;
      if (typeof parsedSolution === 'string') {
        try { parsedSolution = JSON.parse(parsedSolution); } catch (e) { }
      }
      inst.solution = hydrateNode(parsedSolution, templateVars);
    }

    // Set correct answer
    const answerPayload = JSON.stringify({ ans: String(correctAns) });
    inst.correctAnswerText = answerPayload;
    inst.adaptiveConfig.correctAnswerText = answerPayload;
  }

  if (logic === 'number_line_rounding_v1') {
    let num, targetScale;
    const dataSource = question.data_source || inst.adaptiveConfig?.data_source || { range: [2100, 2900], target_scale: 1000 };
    targetScale = dataSource.target_scale || 1000;
    
    if (overrideVariables) {
      num = overrideVariables.num;
    } else {
      const range = dataSource.range || [2100, 2900];
      num = Math.floor(Math.random() * (range[1] - range[0] + 1)) + range[0];
    }

    const lowBenchmark = Math.floor(num / targetScale) * targetScale;
    const highBenchmark = lowBenchmark + targetScale;
    const midpoint = lowBenchmark + (targetScale / 2);
    
    const distLow = num - lowBenchmark;
    const distHigh = highBenchmark - num;
    const distMid = Math.abs(num - midpoint);

    const chosenBenchmark = (num >= midpoint) ? highBenchmark : lowBenchmark;

    const templateVars = {
      num,
      num_formatted: num.toLocaleString('en-IN'),
      low_benchmark: lowBenchmark,
      low_benchmark_formatted: lowBenchmark.toLocaleString('en-IN'),
      high_benchmark: highBenchmark,
      high_benchmark_formatted: highBenchmark.toLocaleString('en-IN'),
      midpoint: midpoint,
      midpoint_formatted: midpoint.toLocaleString('en-IN'),
      dist_low: distLow,
      dist_high: distHigh,
      dist_mid: distMid,
      target_ans: chosenBenchmark,
      target_ans_formatted: chosenBenchmark.toLocaleString('en-IN'),
      scale_name: targetScale === 10 ? 'ten' : (targetScale === 100 ? 'hundred' : (targetScale === 1000 ? 'thousand' : String(targetScale)))
    };

    inst.adaptiveConfig.variables = { ...(inst.adaptiveConfig.variables || {}), ...templateVars };
    
    const preHydratedParts = question.parts || [];
    inst.parts = hydrateNode(preHydratedParts, templateVars).map(p => {
        if (p.type === 'numberLineRounding') {
            return {
                ...p,
                min: lowBenchmark,
                max: highBenchmark,
                mid: midpoint,
                current: num,
                distLow: distLow,
                distHigh: distHigh,
                distMid: distMid
            };
        }
        return p;
    });
    
    if (question.solution) {
      let parsedSolution = question.solution;
      if (typeof parsedSolution === 'string') {
        try { parsedSolution = JSON.parse(parsedSolution); } catch (e) { }
      }
      inst.solution = hydrateNode(parsedSolution, templateVars);
    }
    
    const answerPayload = JSON.stringify({ ans: String(chosenBenchmark) });
    inst.correctAnswerText = answerPayload;
    inst.adaptiveConfig.correctAnswerText = answerPayload;
  }

function numberToWords(n) {
  const units = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"];
  const teens = ["ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
  const tens = ["", "ten", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];
  
  if (n < 10) return units[n];
  if (n < 20) return teens[n - 10];
  if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? " " + units[n % 10] : "");
  if (n < 1000) {
    const hundredPart = units[Math.floor(n / 100)] + " hundred";
    const rest = n % 100;
    if (rest === 0) return hundredPart;
    return hundredPart + " and " + numberToWords(rest);
  }
  return n.toString();
}

/**
 * instantiateTemplate implementation...
 */

  // (previous logic blocks...)

  if (logic === 'number_word_to_digit_v1') {
    inst.type = 'mcq';
    let num;
    const dataSource = question.data_source || inst.adaptiveConfig?.data_source || { range: [101, 999] };
    
    if (overrideVariables) {
      num = overrideVariables.num;
    } else {
      const range = dataSource.range || [101, 999];
      num = Math.floor(Math.random() * (range[1] - range[0] + 1)) + range[0];
    }

    const d3 = Math.floor(num / 100);
    const d2 = Math.floor((num % 100) / 10);
    const d1 = num % 10;

    const hundredWord = numberToWords(d3 * 100).split(" ")[0];
    const numberInWords = numberToWords(num);

    // Distractors
    let teenError = (d2 >= 2) ? (d3 * 100 + 10 + d1) : (d3 * 100 + 20 + d1);
    const swapError = d3 * 100 + d1 * 10 + d2;
    const hundredError = ((d3 + (Math.random() > 0.5 ? 1 : -1) - 1 + 9) % 9 + 1) * 100 + d2 * 10 + d1;

    const templateVars = {
      num,
      number_in_words: numberInWords,
      digit_3: d3,
      digit_2: d2,
      digit_1: d1,
      hundred_word: hundredWord,
      teen_error: teenError,
      swap_error: swapError,
      hundred_error: hundredError
    };

    inst.adaptiveConfig.variables = { ...(inst.adaptiveConfig.variables || {}), ...templateVars };
    
    // Create and shuffle options
    if (Array.isArray(question.options)) {
        let options = hydrateNode(question.options, templateVars);
        
        // Ensure options have all required labeling fields
        options = options.map(o => ({
            ...o,
            label: String(o.content),
            text: String(o.content)
        }));

        // Unique check
        const seen = new Set();
        options = options.filter(o => {
            const val = String(o.content);
            if (seen.has(val)) return false;
            seen.add(val);
            return true;
        });

        // Shuffle
        inst.options = options.sort(() => Math.random() - 0.5);

        // Track correct index AFTER shuffle
        const correctIdx = inst.options.findIndex(o => String(o.content) === String(num));
        inst.correctAnswerIndex = correctIdx;
        inst.correctAnswerText = String(num);
    }

    inst.parts = hydrateNode(question.parts || [], templateVars);
    
    if (question.solution) {
      let solution = hydrateNode(question.solution, templateVars);
      // Clean up markdown markers if necessary
      if (Array.isArray(solution)) {
        solution = solution.map(s => {
          if (s.type === 'text') {
            return {
              ...s,
              content: s.content.replace(/^###\s*/, '').replace(/^##\s*/, '')
            };
          }
          return s;
        });
      }
      inst.solution = solution;
    }
  }

  if (logic === 'interactive_object_counting_v1') {
    let num, objectType, arrangement, imageUrl;
    const dataSource = question.data_source || inst.adaptiveConfig?.data_source || { range: [1, 10] };
    
    if (overrideVariables) {
      num = overrideVariables.num;
      objectType = overrideVariables.object_type;
      arrangement = overrideVariables.arrangement;
      imageUrl = overrideVariables.image_url;
    } else {
      const range = dataSource.range || [1, 20];
      num = Math.floor(Math.random() * (range[1] - range[0] + 1)) + range[0];
      
      const objectTypes = ["firefly", "ladybug", "star", "apple"];
      objectType = dataSource.object_type || inst.adaptiveConfig?.variables?.object_type || objectTypes[Math.floor(Math.random() * objectTypes.length)];
      
      const arrangements = ["grid", "scatter"];
      arrangement = dataSource.arrangement || inst.adaptiveConfig?.variables?.arrangement || arrangements[Math.floor(Math.random() * arrangements.length)];
      
      imageUrl = dataSource.image_url || inst.adaptiveConfig?.variables?.image_url || null;
    }

    const templateVars = {
      num,
      object_type: objectType,
      arrangement,
      image_url: imageUrl
    };

    inst.adaptiveConfig.variables = { ...(inst.adaptiveConfig.variables || {}), ...templateVars };
    
    // Create options: 1 to 10 if num <= 10, else 1 to 20
    const maxOption = num <= 10 ? 10 : 20;
    inst.options = Array.from({ length: maxOption }).map((_, i) => String(i + 1));
    inst.correctAnswerIndex = num - 1;
    inst.type = 'mcq';

    // Hydrate Parts
    const rawParts = question.parts && question.parts.length > 0 ? question.parts : [
      { type: 'text', content: 'How many {object_type}s are there?', hasAudio: true },
      { type: 'countingVisual', num: '{num}', object_type: '{object_type}', image_url: '{image_url}', arrangement: '{arrangement}' }
    ];
    inst.parts = hydrateNode(rawParts, templateVars);

    // Hydrate Solution
    const rawSolution = question.solution && (Array.isArray(question.solution) ? question.solution.length > 0 : true) ? question.solution : [
      { type: 'text', content: 'Count the {object_type}s one by one.', hasAudio: true },
      { type: 'countingVisual', num: '{num}', object_type: '{object_type}', image_url: '{image_url}', arrangement: '{arrangement}', showNumbers: true, highlightLast: true },
      { type: 'text', content: 'As we point to each bug, we say the next number. The last number we say is the total.', hasAudio: false },
      { type: 'text', content: 'There are {num} {object_type}s.', hasAudio: true }
    ];
    
    let parsedSolution = rawSolution;
    if (typeof parsedSolution === 'string') {
        try { parsedSolution = JSON.parse(parsedSolution); } catch (e) { }
    }
    inst.solution = hydrateNode(parsedSolution, templateVars);

    const answerPayload = JSON.stringify({ ans_value: String(num) });
    inst.correctAnswerText = answerPayload;
    inst.adaptiveConfig.correctAnswerText = answerPayload;
  }

  if (logic === 'even_odd_multi_v1') {
    let categoryTarget, numList;
    const dataSource = question.data_source || inst.adaptiveConfig?.data_source || { range: [10, 99] };
    const range = dataSource.range || [10, 99];
    
    if (overrideVariables) {
      categoryTarget = overrideVariables.category_target;
      numList = overrideVariables.num_list;
    } else {
      categoryTarget = Math.random() < 0.5 ? "even" : "odd";
      // Ensure we have a mix of even and odd
      numList = [];
      const min = range[0];
      const max = range[1];
      
      while (numList.length < 4) {
        const n = Math.floor(Math.random() * (max - min + 1)) + min;
        if (!numList.includes(n)) numList.push(n);
      }
      // Guarantee at least one correct
      const hasMatch = numList.some(n => (categoryTarget === 'even' ? n % 2 === 0 : n % 2 !== 0));
      if (!hasMatch) {
         const pos = Math.floor(Math.random() * 4);
         const base = Math.floor(Math.random() * (max - min + 1)) + min;
         numList[pos] = categoryTarget === 'even' ? (base % 2 === 0 ? base : base + 1) : (base % 2 !== 0 ? base : base + 1);
         if (numList[pos] > max) numList[pos] -= 2; // Keep in range
      }
    }

    const otherCategory = categoryTarget === 'even' ? 'odd' : 'even';
    const rule = categoryTarget === 'even' ? 'ends in 0, 2, 4, 6, or 8' : 'ends in 1, 3, 5, 7, or 9';
    
    const matches = numList.filter(n => (categoryTarget === 'even' ? n % 2 === 0 : n % 2 !== 0));
    const nonMatches = numList.filter(n => (categoryTarget === 'even' ? n % 2 !== 0 : n % 2 === 0));

    const templateVars = {
      category_target: categoryTarget,
      other_category: otherCategory,
      ones_digit_rule: rule,
      list_of_matches: matches.join(', '),
      list_of_non_matches: nonMatches.join(', '),
      num_1: String(numList[0]), num_2: String(numList[1]), num_3: String(numList[2]), num_4: String(numList[3]),
    };

    inst.adaptiveConfig.variables = { ...(inst.adaptiveConfig.variables || {}), ...templateVars, num_list: numList };
    
    inst.type = 'mcq';
    inst.isMultiSelect = true;

    // Build options with isCorrect flag
    inst.options = numList.map(n => {
       const isCorr = categoryTarget === 'even' ? n % 2 === 0 : n % 2 !== 0;
       return { content: String(n), isCorrect: isCorr };
    });

    inst.correctAnswerIndices = inst.options.map((opt, i) => opt.isCorrect ? i : null).filter(i => i !== null);
    inst.correctAnswerText = JSON.stringify(inst.correctAnswerIndices);

    inst.parts = hydrateNode(question.parts && question.parts.length > 0 ? question.parts : [
      { type: 'text', content: 'Which of the following numbers are **{category_target}**?', hasAudio: true }
    ], templateVars);

    // Build default solution if not provided
    const solParts = question.solution && (Array.isArray(question.solution) ? question.solution.length > 0 : true) ? question.solution : [
        { type: "text", content: "**Remember:**", isVertical: true },
        { type: "text", content: "A number is **even** if it ends in 0, 2, 4, 6, or 8.", isVertical: true },
        { type: "text", content: "A number is **odd** if it ends in 1, 3, 5, 7, or 9.", isVertical: true },
        { type: "text", content: "**Solve:**", isVertical: true },
        { type: "text", content: "Look at the last digit of each number:", isVertical: true },
        { type: "text", content: "**{list_of_matches}** are **{category_target}**.", isVertical: true },
        { type: "text", content: "**{list_of_non_matches}** are **{other_category}**.", isVertical: true }
    ];
    let parsedSol = solParts;
    if (typeof parsedSol === 'string') {
        try { parsedSol = JSON.parse(parsedSol); } catch (e) { }
    }
    inst.solution = hydrateNode(parsedSol, templateVars);

    // Build Scaffold
    const firstWrongNum = nonMatches[0] || 93;
    const scaffoldSrc = question.scaffold || inst.adaptiveConfig?.scaffold || {
        id: "even_odd_scaffold",
        trigger_on: ["incorrect_selection"],
        parts: [
            { type: "text", content: "Let's look closely at the **last digit** (the ones place).", isVertical: true },
            { type: "text", content: `For example, in **${String(firstWrongNum).slice(0, -1)}<span style="color:#FF4B4B;font-weight:900;text-decoration:underline">${String(firstWrongNum).slice(-1)}</span>**, the last digit is ${String(firstWrongNum).slice(-1)}.`, isVertical: true },
            { type: "numberPairs", num: String(firstWrongNum) },
            { type: "text", content: `Does every dot have a partner in ${firstWrongNum}?`, isVertical: true }
        ]
    };
    inst.adaptiveConfig.scaffold = hydrateNode(scaffoldSrc, templateVars);
    inst.adaptiveConfig.scaffold = hydrateNode(scaffoldSrc, templateVars);
  }

  if (logic === 'odd_even_neighbor_sequence_v1') {
    let numStart, category, seqType;
    const dataSource = question.data_source || inst.adaptiveConfig?.data_source || { range: [10, 99] };
    const range = dataSource.range || [10, 99];
    
    if (overrideVariables) {
      numStart = overrideVariables.num_start;
      category = overrideVariables.category;
      seqType = overrideVariables.seq_type;
    } else {
      category = dataSource.category && dataSource.category !== 'random' ? dataSource.category : (Math.random() < 0.5 ? "even" : "odd");
      seqType = dataSource.type || (Math.random() < 0.33 ? "before" : (Math.random() < 0.5 ? "after" : "middle"));
      
      const min = Math.max(range[0], 5);
      const max = range[1] - 10;
      
      numStart = Math.floor(Math.random() * (max - min + 1)) + min;
      // Force parity
      if (category === 'even' && numStart % 2 !== 0) numStart++;
      if (category === 'odd' && numStart % 2 === 0) numStart++;
    }

    let sequence = [numStart, numStart + 2, numStart + 4, numStart + 6];
    let correctId = "answer_1";
    let ansVal;
    let prompt = "";

    if (seqType === 'before') {
      ansVal = numStart - 2;
      prompt = `Which **${category}** number comes **before**?`;
      inst.parts = [
        { type: "text", content: prompt, hasAudio: true },
        {
          type: "sequence",
          isCommaSeparated: true,
          children: [
            { id: "answer_1", type: "input", width: "60px" },
            { type: "text", content: String(sequence[0]) },
            { type: "text", content: String(sequence[1]) },
            { type: "text", content: String(sequence[2]) }
          ]
        }
      ];
      inst.solution = [
        { type: "text", content: `To find the ${category} number before **${sequence[0]}**, count back 2.`, isVertical: true },
        { type: "text", content: `**${sequence[0]} - 2 = ${ansVal}**`, isVertical: true }
      ];
    } else if (seqType === 'after') {
      ansVal = sequence[3];
      prompt = `Which **${category}** number comes **after**?`;
      inst.parts = [
        { type: "text", content: prompt, hasAudio: true },
        {
          type: "sequence",
          isCommaSeparated: true,
          children: [
            { type: "text", content: String(sequence[0]) },
            { type: "text", content: String(sequence[1]) },
            { type: "text", content: String(sequence[2]) },
            { id: "answer_1", type: "input", width: "60px" }
          ]
        }
      ];
      inst.solution = [
        { type: "text", content: `To find the ${category} number after **${sequence[2]}**, count on 2.`, isVertical: true },
        { type: "text", content: `**${sequence[2]} + 2 = ${ansVal}**`, isVertical: true }
      ];
    } else {
      // Middle
      ansVal = sequence[1];
      prompt = `Which **${category}** number is **missing**?`;
      inst.parts = [
        { type: "text", content: prompt, hasAudio: true },
        {
          type: "sequence",
          isCommaSeparated: true,
          children: [
            { type: "text", content: String(sequence[0]) },
            { id: "answer_1", type: "input", width: "60px" },
            { type: "text", content: String(sequence[2]) },
            { type: "text", content: String(sequence[3]) }
          ]
        }
      ];
      inst.solution = [
        { type: "text", content: `The sequence follows the ${category} pattern (skip count by 2).`, isVertical: true },
        { type: "text", content: `**${sequence[0]} + 2 = ${ansVal}**`, isVertical: true }
      ];
    }

    inst.type = 'fillInTheBlank';
    inst.correctAnswerText = JSON.stringify({ answer_1: String(ansVal) });
    inst.adaptiveConfig.variables = { 
        ...(inst.adaptiveConfig.variables || {}), 
        num_start: numStart, 
        ans_1: ansVal, 
        category, 
        seq_type: seqType 
    };
  }

  if (logic === 'parity_of_operations_v1') {
    let num1, num2, operation;
    const dataSource = question.data_source || inst.adaptiveConfig?.data_source || { range: [10, 99] };
    const range = dataSource.range || [10, 99];
    
    if (overrideVariables) {
      num1 = overrideVariables.num1;
      num2 = overrideVariables.num2;
      operation = overrideVariables.operation;
    } else {
      num1 = Math.floor(Math.random() * (range[1] - range[0] + 1)) + range[0];
      num2 = Math.floor(Math.random() * (range[1] - range[0] + 1)) + range[0];
      operation = Math.random() < 0.5 ? "+" : "-";
      
      // Ensure num1 >= num2 for subtraction
      if (operation === "-" && num1 < num2) {
          const temp = num1;
          num1 = num2;
          num2 = temp;
      }
    }

    const p1 = num1 % 2 === 0 ? "even" : "odd";
    const p2 = num2 % 2 === 0 ? "even" : "odd";
    const result = operation === "+" ? num1 + num2 : num1 - num2;
    const rp = result % 2 === 0 ? "even" : "odd";
    const lastDigit = Math.abs(result) % 10;

    const templateVars = {
      num1, num2, operation,
      parity1: p1,
      parity2: p2,
      result,
      last_digit: lastDigit,
      result_parity: rp,
      other_parity: rp === "even" ? "odd" : "even"
    };

    inst.adaptiveConfig.variables = { ...(inst.adaptiveConfig.variables || {}), ...templateVars };
    
    inst.type = 'mcq';
    inst.options = [
        { content: "Even", isCorrect: rp === "even" },
        { content: "Odd", isCorrect: rp === "odd" }
    ];
    inst.correctAnswerIndex = rp === "even" ? 0 : 1;
    inst.correctAnswerText = JSON.stringify({ ans_value: rp });

    inst.parts = hydrateNode(question.parts && question.parts.length > 0 ? question.parts : [
      { type: 'text', content: 'Is **{num1} {operation} {num2}** even or odd?', hasAudio: true }
    ], templateVars);

    inst.solution = hydrateNode(question.solution || [
        { type: "text", content: "### 🔍 Step 1: Identify Parity", isVertical: true },
        { type: "text", content: "**{num1}** is **{parity1}**.", isVertical: true },
        { type: "text", content: "**{num2}** is **{parity2}**.", isVertical: true },
        { type: "text", content: "\n### 📈 Step 2: Apply the Rule", isVertical: true },
        { type: "text", content: "Use the rule: **{parity1} {operation} {parity2}** = **{result_parity}**.", isVertical: true },
        { type: "text", content: "\n### ✅ Step 3: Check by Calculation", isVertical: true },
        { type: "text", content: "**{num1} {operation} {num2} = {result}**", isVertical: true },
        { type: "text", content: "**{result}** ends in a **{last_digit}**, which makes it **{result_parity}**.", isVertical: true }
    ], templateVars);

    const scaffoldSrc = question.scaffold || {
        id: "parity_rules_scaffold",
        trigger_on: ["incorrect_selection", "time_limit_exceeded"],
        parts: [
            { type: "text", content: "### 💡 Key Idea: Parity Rules", isVertical: true },
            { type: "text", content: "You don't need to do the full math! Just look at the parities:", isVertical: true },
            { type: "text", content: "| Rule | Result |\n| :--- | :--- |\n| even ± even | **even** |\n| odd ± odd | **even** |\n| even ± odd | **odd** |\n| odd ± even | **odd** |", isVertical: true },
            { type: "text", content: `Since **{parity1} {operation} {parity2}** is our case, the answer must be **{result_parity}**.`, isVertical: true }
        ]
    };
    inst.adaptiveConfig.scaffold = hydrateNode(scaffoldSrc, templateVars);
  }

  if (logic === 'skip_counting_target_v1') {
    let name, startNum, skipInterval, targetNum;
    const dataSource = question.data_source || inst.adaptiveConfig?.data_source || { range: [1, 50] };
    const range = dataSource.range || [1, 50];
    
    if (overrideVariables) {
      name = overrideVariables.name;
      startNum = overrideVariables.start_num;
      skipInterval = overrideVariables.skip_interval;
      targetNum = overrideVariables.target_num;
    } else {
      const names = ["Danny", "Anya", "Zaid", "Meera", "Leo", "Priya"];
      name = names[Math.floor(Math.random() * names.length)];
      
      const intervals = [2, 5, 10];
      skipInterval = intervals[Math.floor(Math.random() * intervals.length)];
      
      const min = Math.max(range[0], 1);
      const max = range[1] - (skipInterval * 3);
      startNum = Math.floor(Math.random() * (max - min + 1)) + min;
      
      const offset = (Math.floor(Math.random() * 5) + 1) * skipInterval;
      const isPossible = Math.random() < 0.5;
      targetNum = isPossible ? (startNum + offset) : (startNum + offset - 1);
    }

    const isPossible = (targetNum - startNum) % skipInterval === 0;
    
    // Generate sequence
    const seq = [];
    let cur = startNum;
    while (cur <= targetNum + skipInterval) {
        seq.push(cur);
        if (cur >= targetNum) break;
        cur += skipInterval;
    }

    const templateVars = {
      name, start_num: startNum, skip_interval: skipInterval, target_num: targetNum,
      sequence: seq.join(', '),
      is_possible: isPossible ? "Yes" : "No",
      conclusion: isPossible 
        ? `Yes, you say **${targetNum}**. ${name} could have been counting by **${skipInterval}s**.` 
        : `No, you skip over **${targetNum}**. ${name} could not have been counting by **${skipInterval}s**.`
    };

    inst.adaptiveConfig.variables = { ...(inst.adaptiveConfig.variables || {}), ...templateVars };
    
    inst.type = 'mcq';
    inst.options = ["Yes", "No"];
    inst.correctAnswerIndex = isPossible ? 0 : 1;
    inst.correctAnswerText = JSON.stringify({ ans_value: isPossible ? "Yes" : "No" });

    inst.parts = hydrateNode(question.parts && question.parts.length > 0 ? question.parts : [
      { type: 'text', content: '{name} began at **{start_num}**. He skip-counted until he reached **{target_num}**.', hasAudio: true },
      { type: 'text', content: 'Could he have been counting by **{skip_interval}s**?', hasAudio: true }
    ], templateVars);

    inst.solution = hydrateNode(question.solution || [
        { type: "text", content: "### 🔭 Step 1: Restate the Goal", isVertical: true },
        { type: "text", content: "We know **{name}** started at **{start_num}** and counted toward **{target_num}**.", isVertical: true },
        { type: "\n### 👣 Step 2: Try the Path", content: "Try counting by **{skip_interval}s** from **{start_num}** until you hit **{target_num}** or pass it.", isVertical: true },
        { type: "text", content: "The sequence is: **{sequence}**...", isVertical: true },
        { type: "\n### ✅ Conclusion", content: "**{conclusion}**", isVertical: true }
    ], templateVars);

    const scaffoldSrc = question.scaffold || {
        id: "skip_count_scaffold",
        trigger_on: ["incorrect_selection"],
        parts: [
            { type: "text", content: "Let's see the jumps on a number line!", isVertical: true },
            { type: "numberLineJumps", start: startNum, target: targetNum, interval: skipInterval },
            { type: "text", content: "Did the jump land right on **{target_num}**?", isVertical: true }
        ]
    };
    inst.adaptiveConfig.scaffold = hydrateNode(scaffoldSrc, templateVars);
  }

  if (logic === 'decreasing_sequence_v1') {
    let numStart, step;
    const dataSource = question.data_source || inst.adaptiveConfig?.data_source || { range: [20, 100] };
    const range = dataSource.range || [20, 100];
    
    if (overrideVariables) {
      numStart = overrideVariables.num_start;
      step = overrideVariables.step;
    } else {
      const steps = [1, 2, 3, 4, 5, 10];
      step = steps[Math.floor(Math.random() * steps.length)];
      
      const minStart = 5 * step + 1;
      const min = Math.max(range[0], minStart);
      const max = range[1];
      numStart = Math.floor(Math.random() * (max - min + 1)) + min;
    }

    const sequence = [];
    for (let i = 0; i < 5; i++) {
        sequence.push(numStart - (i * step));
    }
    const correctAns = numStart - (5 * step);
    
    // Distractors
    const distractors = new Set();
    [correctAns + step, correctAns - step, numStart, numStart - step].forEach(d => {
        if (d !== correctAns && d > 0) distractors.add(d);
    });
    // Ensure we have 3 distinct distractors
    let offset = 1;
    while (distractors.size < 3) {
        let d = correctAns + (offset * step);
        if (d !== correctAns && d > 0) distractors.add(d);
        offset++;
    }
    const opts = [correctAns, ...Array.from(distractors)].slice(0, 4).sort((a, b) => a - b);
    const correctIndex = opts.indexOf(correctAns);

    const templateVars = {
      num_start: numStart,
      step,
      num1: sequence[0], num2: sequence[1], num3: sequence[2], num4: sequence[3], num5: sequence[4],
      correct_ans: correctAns,
      full_sequence: sequence.join(', ') + ', ___'
    };

    inst.adaptiveConfig.variables = { ...(inst.adaptiveConfig.variables || {}), ...templateVars };
    
    inst.type = 'mcq';
    inst.options = opts.map(opt => String(opt));
    inst.correctAnswerIndex = correctIndex;
    inst.isGrid = true;
    inst.correctAnswerText = JSON.stringify({ ans_value: String(correctAns) });

    inst.parts = hydrateNode(question.parts && question.parts.length > 0 ? question.parts : [
      { type: 'text', content: 'Which number is missing from this sequence?', hasAudio: true },
      { type: 'text', content: '### **{full_sequence}**', isVertical: true }
    ], templateVars);

    inst.solution = hydrateNode(question.solution || [
        { type: "text", content: "### 🧩 Step 1: Pattern Recognition", isVertical: true },
        { type: "text", content: "First, look for a pattern. Notice how each number is **{step} less** than the previous number.", isVertical: true },
        { type: "\n### 📈 Step 2: The Sequence", content: "**{num1}, {num2}, {num3}, {num4}, {num5}, ___**", isVertical: true },
        { type: "text", content: "To make the pattern complete, the number **{correct_ans}** must go in the blank space.", isVertical: true },
        { type: "\n### ✅ Math Check", content: "**{num5} - {step} = {correct_ans}**", isVertical: true }
    ], templateVars);
  }

  if (logic === 'increasing_sequence_v1') {
    let numStart, step;
    const dataSource = question.data_source || inst.adaptiveConfig?.data_source || { range: [1, 50] };
    const range = dataSource.range || [1, 50];
    
    if (overrideVariables) {
      numStart = overrideVariables.num_start;
      step = overrideVariables.step;
    } else {
      const steps = [1, 2, 3, 5, 10];
      step = steps[Math.floor(Math.random() * steps.length)];
      
      const min = range[0];
      const max = range[1] - (5 * step);
      numStart = Math.floor(Math.random() * (Math.max(max, min) - min + 1)) + min;
    }

    const sequence = [];
    for (let i = 0; i < 5; i++) {
        sequence.push(numStart + (i * step));
    }
    const correctAns = numStart + (5 * step);
    
    // Distractors
    const distractors = new Set();
    [correctAns + step, correctAns - step, numStart, numStart + step].forEach(d => {
       if (d !== correctAns && d > 0) distractors.add(d);
    });
    let offset = 1;
    while (distractors.size < 3) {
        let d = correctAns + (offset * step);
        if (d !== correctAns && d > 0) distractors.add(d);
        offset++;
    }
    const opts = [correctAns, ...Array.from(distractors)].slice(0, 4).sort((a, b) => a - b);
    const correctIndex = opts.indexOf(correctAns);

    const templateVars = {
      num_start: numStart,
      step,
      num1: sequence[0], num2: sequence[1], num3: sequence[2], num4: sequence[3], num5: sequence[4],
      correct_ans: correctAns,
      full_sequence: sequence.join(', ') + ', ___'
    };

    inst.adaptiveConfig.variables = { ...(inst.adaptiveConfig.variables || {}), ...templateVars };
    
    inst.type = 'mcq';
    inst.options = opts.map(opt => String(opt));
    inst.correctAnswerIndex = correctIndex;
    inst.isGrid = true;
    inst.correctAnswerText = JSON.stringify({ ans_value: String(correctAns) });

    inst.parts = hydrateNode(question.parts && question.parts.length > 0 ? question.parts : [
      { type: 'text', content: 'Which number is missing from this sequence?', hasAudio: true },
      { type: 'text', content: '### **{full_sequence}**', isVertical: true }
    ], templateVars);

    inst.solution = hydrateNode(question.solution || [
        { type: "text", content: "### 🧩 Step 1: Pattern Recognition", isVertical: true },
        { type: "text", content: "First, look for a pattern. Notice how each number is **{step} more** than the previous number.", isVertical: true },
        { type: "\n### 📈 Step 2: The Sequence", content: "**{num1}, {num2}, {num3}, {num4}, {num5}, ___**", isVertical: true },
        { type: "text", content: "To make the pattern complete, the number **{correct_ans}** must go in the blank space.", isVertical: true },
        { type: "\n### ✅ Math Check", content: "**{num5} + {step} = {correct_ans}**", isVertical: true }
    ], templateVars);
  }

  if (logic === 'ordinal_cardinal_v1') {
    let targetType;
    const cardPool = ["one", "five", "ten", "twelve", "twenty", "fifty", "eighty", "hundred"].sort();
    const ordPool = ["first", "fifth", "tenth", "twelfth", "twentieth", "fiftieth", "eightieth", "hundredth"].sort();

    if (overrideVariables) {
        targetType = overrideVariables.target_type;
    } else {
        targetType = Math.random() > 0.5 ? 'ordinal' : 'cardinal';
    }

    const otherType = targetType === 'ordinal' ? 'cardinal' : 'ordinal';
    
    // Pick words deterministically if variables provided, otherwise pick randomly
    // For simplicity and stability, we use slices that are constant for a session
    // Or better: salt the random index with numStart if we had one.
    // Here we'll just pick based on targetType's existence to ensure stability.
    
    // To be truly stable, we should ideally put the picked words in variables too.
    const card1 = overrideVariables?.card1 || cardPool[Math.floor(Math.random() * cardPool.length)];
    const card2 = overrideVariables?.card2 || cardPool.filter(c => c !== card1)[Math.floor(Math.random() * (cardPool.length - 1))];
    const ord1 = overrideVariables?.ord1 || ordPool[Math.floor(Math.random() * ordPool.length)];
    const ord2 = overrideVariables?.ord2 || ordPool.filter(o => o !== ord1)[Math.floor(Math.random() * (ordPool.length - 1))];

    const allOptionsRaw = [
        { text: card1, type: 'cardinal' },
        { text: card2, type: 'cardinal' },
        { text: ord1, type: 'ordinal' },
        { text: ord2, type: 'ordinal' }
    ].sort((a, b) => a.text.localeCompare(b.text)); // Alphabetical sort for stability
    
    const options = allOptionsRaw.map(o => o.text);
    const correctIndices = [];
    allOptionsRaw.forEach((o, i) => {
        if (o.type === targetType) correctIndices.push(i);
    });
    
    const matches = allOptionsRaw.filter(o => o.type === targetType).map(o => o.text);
    const nonMatches = allOptionsRaw.filter(o => o.type !== targetType).map(o => o.text);
    
    const templateVars = {
        target_type: targetType,
        other_type: otherType,
        list_of_matches: matches.join('\n'),
        list_of_non_matches: nonMatches.join('\n'),
        card1, card2, ord1, ord2
    };

    inst.adaptiveConfig.variables = { ...(inst.adaptiveConfig.variables || {}), ...templateVars };
    
    inst.type = 'mcq';
    inst.isMultiSelect = true;
    inst.showSubmitButton = true;
    inst.options = options;
    inst.correctAnswerIndices = correctIndices;
    inst.isGrid = true;
    inst.correctAnswerText = JSON.stringify({ ans_indices: correctIndices });

    inst.parts = hydrateNode(question.parts && question.parts.length > 0 ? question.parts : [
      { type: 'text', content: 'Which of the following are **{target_type}** numbers?', hasAudio: true },
      { type: 'text', content: '(There may be more than one.)', isVertical: true, style: { fontSize: '0.9rem', opacity: 0.7 } }
    ], templateVars);

    inst.solution = hydrateNode(question.solution || [
        {
            type: "section",
            label: "key idea",
            parts: [
                { type: "text", content: "**Cardinal** numbers tell how many.\nCounting numbers like *one (1)*, *two (2)*, and *three (3)* are cardinal numbers.", isVertical: true },
                { type: "text", content: "\n**Ordinal** numbers tell position.\nPosition numbers like *first (1st)*, *second (2nd)*, and *third (3rd)* are ordinal numbers.", isVertical: true }
            ]
        },
        {
            type: "section",
            label: "solution",
            parts: [
                { type: "text", content: "These are **{target_type}** numbers:", isVertical: true },
                { type: "text", content: "{list_of_matches}", isVertical: true, style: { paddingLeft: '20px', fontWeight: 'bold' } },
                { type: "text", content: "\nThis is not a **{target_type}** number. It is a **{other_type}** number:", isVertical: true },
                { type: "text", content: "{list_of_non_matches}", isVertical: true, style: { paddingLeft: '20px', fontWeight: 'bold' } }
            ]
        }
    ], templateVars);
  }

  if (logic === 'numeral_type_v1') {
    let num, isOrdinal;
    const range = question.data_source?.range || [1, 100];
    
    if (overrideVariables) {
        num = overrideVariables.num;
        isOrdinal = overrideVariables.is_ordinal;
    } else {
        num = Math.floor(Math.random() * (range[1] - range[0] + 1)) + range[0];
        isOrdinal = Math.random() > 0.5;
    }

    const getSuffix = (n) => {
        const lastDigit = n % 10;
        const lastTwoDigits = n % 100;
        if (lastTwoDigits >= 11 && lastTwoDigits <= 13) return "th";
        if (lastDigit === 1) return "st";
        if (lastDigit === 2) return "nd";
        if (lastDigit === 3) return "rd";
        return "th";
    };

    const suffix = getSuffix(num);
    const displayFormat = isOrdinal ? `${num}${suffix}` : `${num}`;
    const correctAnsText = isOrdinal ? "Ordinal" : "Cardinal";
    const otherType = isOrdinal ? "Cardinal" : "Ordinal";
    
    const options = ["Cardinal", "Ordinal"];
    const correctIndex = options.indexOf(correctAnsText);

    const templateVars = {
        num,
        suffix,
        display_format: displayFormat,
        correct_answer: correctAnsText,
        other_type: otherType,
        is_ordinal: isOrdinal
    };

    inst.adaptiveConfig.variables = { ...(inst.adaptiveConfig.variables || {}), ...templateVars };
    
    inst.type = 'mcq';
    inst.options = options;
    inst.correctAnswerIndex = correctIndex;
    inst.correctAnswerText = JSON.stringify({ ans_value: correctAnsText });

    inst.parts = hydrateNode(question.parts && question.parts.length > 0 ? question.parts : [
      { type: 'text', content: 'Is the following number **cardinal** or **ordinal**?', hasAudio: true },
      { type: 'text', content: '### **{display_format}**', isVertical: true }
    ], templateVars);

    inst.solution = hydrateNode(question.solution || [
        {
            type: "section",
            label: "key idea",
            parts: [
                { type: "text", content: "**Cardinal** numbers (like 1, 2, 3) tell us how many objects there are in total.", isVertical: true },
                { type: "text", content: "**Ordinal** numbers (like 1st, 2nd, 3rd) tell us the position or order of an object.", isVertical: true }
            ]
        },
        {
            type: "section",
            label: "solution",
            parts: [
                { type: "text", content: isOrdinal 
                    ? "The number **{display_format}** has a **'{suffix}'** at the end, which tells us a position. This makes it an **ordinal** number."
                    : "The number **{display_format}** does not have a position suffix. It tells us a count. This makes it a **cardinal** number.", isVertical: true },
                { type: "text", content: "\n**Conclusion:** **{display_format}** is a/an **{correct_answer}** number.", isVertical: true }
            ]
        }
    ], templateVars);

    inst.adaptiveConfig.scaffold = hydrateNode(question.adaptiveConfig?.scaffold || {
        id: "race_scaffold",
        trigger_on: ["incorrect_selection"],
        parts: [{ 
            type: 'text', 
            content: "Think of a race: If you are number **{num}**, that is your **cardinal** count. \nIf you finish in **{num}{suffix}** place, that is your **ordinal** position!" 
        }]
    }, templateVars);
  }

  if (logic === 'number_to_words_21_99_v1') {
    let num;
    const range = question.data_source?.range || [21, 99];
    
    if (overrideVariables) {
        num = overrideVariables.num;
    } else {
        // Avoid teens for this specific skill logic
        do {
            num = Math.floor(Math.random() * (range[1] - range[0] + 1)) + range[0];
        } while (num >= 11 && num <= 19);
    }

    const tens = Math.floor(num / 10);
    const ones = num % 10;
    
    const tensMap = { 2: "twenty", 3: "thirty", 4: "forty", 5: "fifty", 6: "sixty", 7: "seventy", 8: "eighty", 9: "ninety" };
    const onesMap = { 0: "", 1: "one", 2: "two", 3: "three", 4: "four", 5: "five", 6: "six", 7: "seven", 8: "eight", 9: "nine" };

    const tensWord = tensMap[tens];
    const onesWord = onesMap[ones];
    const correctAns = ones === 0 ? tensWord : `${tensWord}-${onesWord}`;
    
    // Distractors
    const distractors = new Set();
    
    // 1. Swapped (if valid tens word for ones digit)
    if (ones >= 2 && tensMap[ones]) {
       const swapped = `${tensMap[ones]}-${onesMap[tens]}`;
       if (swapped !== correctAns) distractors.add(swapped);
    }
    
    // 2. Just tens or just ones
    if (tensWord !== correctAns) distractors.add(tensWord);
    if (onesWord && onesWord !== correctAns) distractors.add(onesWord);

    // 3. Round Tens
    const roundTens = [20, 30, 40, 50, 60, 70, 80, 90];
    roundTens.forEach(rt => {
        const w = tensMap[rt/10];
        if (w !== correctAns) distractors.add(w);
    });

    // Fill to 4 options total
    const possibleOnes = Object.values(onesMap).filter(v => v !== "");
    let i = 0;
    while (distractors.size < 3) {
        const d = `${tensWord}-${possibleOnes[i % possibleOnes.length]}`;
        if (d !== correctAns) distractors.add(d);
        i++;
    }

    const opts = [correctAns, ...Array.from(distractors)].slice(0, 4).sort((a, b) => a.localeCompare(b));
    const correctIndex = opts.indexOf(correctAns);

    const templateVars = {
        num,
        tens_digit: tens,
        ones_digit: ones,
        tens_word: tensWord,
        ones_word: onesWord || "zero",
        correct_ans: correctAns
    };

    inst.adaptiveConfig.variables = { ...(inst.adaptiveConfig.variables || {}), ...templateVars };
    
    inst.type = 'mcq';
    inst.options = opts;
    inst.correctAnswerIndex = correctIndex;
    inst.correctAnswerText = JSON.stringify({ ans_value: correctAns });

    inst.parts = hydrateNode(question.parts && question.parts.length > 0 ? question.parts : [
      { type: 'text', content: 'How do you write this number using words?', hasAudio: true },
      { type: 'text', content: '### **{num}**', isVertical: true }
    ], templateVars);

    inst.solution = hydrateNode(question.solution || [
        {
            type: "section",
            label: "strategy",
            parts: [
                { type: "text", content: "Remember how to write numbers from **21 to 99**.", isVertical: true },
                { type: "text", content: "\nFirst, write the **tens** part. Then, put a **hyphen** and write the **ones** part.", isVertical: true },
                { type: "text", content: "\n| TENS | | ONES | |\n| :--- | :--- | :--- | :--- |\n| 20 | twenty | 1 | one |\n| 30 | thirty | 2 | two |\n| 40 | forty | 3 | three |\n| 50 | fifty | 4 | four |\n| 60 | sixty | 5 | five |\n| 70 | seventy | 6 | six |\n| 80 | eighty | 7 | seven |\n| 90 | ninety | 9 | nine |", isVertical: true },
                { type: "text", content: "\nYou write **{num}** as **{correct_ans}**.", isVertical: true }
            ]
        }
    ], templateVars);

    inst.adaptiveConfig.scaffold = hydrateNode(question.adaptiveConfig?.scaffold || {
        id: "pv_scaffold",
        trigger_on: ["incorrect_selection"],
        parts: [
            { type: "text", content: "Let's look at the place values for **{num}**:", isVertical: true },
            { 
               type: "table", 
               content: "| Tens | Ones |\n| :---: | :---: |\n| **{tens_digit}** | **{ones_digit}** |", 
               isVertical: true 
            },
            { 
               type: "text", 
               content: "\nThe **{tens_digit}** is in the tens place, so it means **{tens_word}**.\nThe **{ones_digit}** is in the ones place, so it means **{ones_word}**.\n\nLet's put them together!", 
               isVertical: true 
            }
        ]
    }, templateVars);
  }

  if (logic === 'words_to_digits_21_99_v1') {
    let num;
    const range = question.data_source?.range || [21, 99];
    
    if (overrideVariables) {
        num = overrideVariables.num;
    } else {
        do {
            num = Math.floor(Math.random() * (range[1] - range[0] + 1)) + range[0];
        } while (num >= 11 && num <= 19);
    }

    const tens = Math.floor(num / 10);
    const ones = num % 10;
    
    const tensMap = { 2: "twenty", 3: "thirty", 4: "forty", 5: "fifty", 6: "sixty", 7: "seventy", 8: "eighty", 9: "ninety" };
    const onesMap = { 0: "", 1: "one", 2: "two", 3: "three", 4: "four", 5: "five", 6: "six", 7: "seven", 8: "eight", 9: "nine" };

    const tensWord = tensMap[tens];
    const onesWord = onesMap[ones];
    const fullWord = ones === 0 ? tensWord : `${tensWord}-${onesWord}`;
    
    // Distractors
    const distractors = new Set();
    
    // 1. Swapped
    const swapped = (ones * 10) + tens;
    if (ones >= 2 && swapped !== num) {
        distractors.add(swapped);
    }
    
    // 2. Round ten
    if (tens * 10 !== num) distractors.add(tens * 10);
    
    // 3. Off-by-ten
    const offTen = (tens === 9 ? tens - 1 : tens + 1) * 10 + ones;
    if (offTen !== num) distractors.add(offTen);

    // 4. Neighbors
    [num + 1, num - 1, num + 10, num - 10].forEach(d => {
        if (d > 0 && d !== num) distractors.add(d);
    });

    const opts = [num, ...Array.from(distractors)].slice(0, 4).sort((a, b) => a - b);
    const correctIndex = opts.indexOf(num);

    const templateVars = {
        num,
        tens_digit: tens,
        ones_digit: ones,
        tens_word: tensWord,
        ones_word: onesWord || "zero",
        full_word: fullWord
    };

    inst.adaptiveConfig.variables = { ...(inst.adaptiveConfig.variables || {}), ...templateVars };
    
    inst.type = 'mcq';
    inst.options = opts.map(o => String(o));
    inst.correctAnswerIndex = correctIndex;
    inst.correctAnswerText = JSON.stringify({ ans_value: String(num) });

    inst.parts = hydrateNode(question.parts && question.parts.length > 0 ? question.parts : [
      { type: 'text', content: 'How do you write this number using digits?', hasAudio: true },
      { type: 'text', content: '### **{full_word}**', isVertical: true }
    ], templateVars);

    inst.solution = hydrateNode(question.solution || [
        {
            type: "section",
            label: "strategy",
            parts: [
                { type: "text", content: "To write **{full_word}** in digits, look at the two parts:", isVertical: true },
                { type: "text", content: "\n1. **{tens_word}** means there are **{tens_digit}** tens.\n2. **{ones_word}** means there are **{ones_digit}** ones.", isVertical: true },
                { 
                   type: "table", 
                   content: "| Tens | Ones |\n| :---: | :---: |\n| **{tens_digit}** | **{ones_digit}** |", 
                   isVertical: true 
                },
                { type: "text", content: "\nPut them together to get **{num}**.", isVertical: true }
            ]
        }
    ], templateVars);
  }

  if (logic === 'comparison_counting_order_v1') {
    let num1, num2;
    const range = question.data_source?.range || [1, 100];
    
    if (overrideVariables) {
        num1 = overrideVariables.num1;
        num2 = overrideVariables.num2;
    } else {
        num1 = Math.floor(Math.random() * (range[1] - range[0] + 1)) + range[0];
        // 20% chance of equal
        if (Math.random() < 0.2) {
            num2 = num1;
        } else {
            num2 = Math.floor(Math.random() * (range[1] - range[0] + 1)) + range[0];
            if (num2 === num1) num2 = (num1 === range[1]) ? num1 - 1 : num1 + 1;
        }
    }

    let orderWord, comparisonResult;
    if (num1 > num2) {
        orderWord = "comes after";
        comparisonResult = "is greater than";
    } else if (num1 < num2) {
        orderWord = "comes before";
        comparisonResult = "is less than";
    } else {
        orderWord = "is the same as";
        comparisonResult = "is equal to";
    }
    
    const options = ["is greater than", "is less than", "is equal to"];
    const correctIndex = options.indexOf(comparisonResult);

    const templateVars = {
        num1,
        num2,
        order_word: orderWord,
        comparison_result: comparisonResult
    };

    inst.adaptiveConfig.variables = { ...(inst.adaptiveConfig.variables || {}), ...templateVars };
    
    inst.type = 'mcq';
    inst.options = options;
    inst.correctAnswerIndex = correctIndex;
    inst.correctAnswerText = JSON.stringify({ ans_value: comparisonResult });

    inst.parts = hydrateNode(question.parts && question.parts.length > 0 ? question.parts : [
      { type: 'text', content: 'Which words make this statement true?', hasAudio: true },
      { type: 'text', content: '### **{num1}** ____ **{num2}**', isVertical: true }
    ], templateVars);

    inst.solution = hydrateNode(question.solution || [
        {
            type: "section",
            label: "strategy",
            parts: [
                { type: "text", content: "When you count, **{num1}** **{order_word}** **{num2}**.", isVertical: true },
                { type: "text", content: "\n**Conclusion:** **{num1}** **{comparison_result}** **{num2}**.", isVertical: true }
            ]
        }
    ], templateVars);

    inst.adaptiveConfig.scaffold = hydrateNode(question.adaptiveConfig?.scaffold || {
        id: "counting_scaffold",
        trigger_on: ["incorrect_selection"],
        parts: [
            { type: "text", content: "Think about counting to **100**.", isVertical: true },
            { 
               type: "text", 
               content: num1 > num2 
                 ? "You say **{num2}** first, and then you keep counting to reach **{num1}**. This means **{num1}** is bigger!"
                 : num1 < num2 
                   ? "You say **{num1}** first, and then you have to keep counting to reach **{num2}**. This means **{num1}** is smaller."
                   : "Since both numbers are the same, they are equal!",
               isVertical: true 
            }
        ]
    }, templateVars);
  }

  if (logic === 'sorting_numbers_v1') {
    const range = question.data_source?.range || [1, 100];
    const count = Math.min(6, Math.max(3, Number(question.data_source?.count || 4)));
    
    let nums = [];
    if (overrideVariables && Array.isArray(overrideVariables.nums)) {
        nums = overrideVariables.nums;
    } else {
        const set = new Set();
        while (set.size < count) {
            set.add(Math.floor(Math.random() * (range[1] - range[0] + 1)) + range[0]);
        }
        nums = Array.from(set);
    }

    const sortedNums = [...nums].sort((a,b) => a - b);
    const itemObjects = nums.map((n, i) => ({ id: `item_${i}`, content: String(n), value: n }));
    const correctIds = sortedNums.map(sn => itemObjects.find(io => io.value === sn).id);

    const sortedList = sortedNums.join(', ');
    const templateVars = { 
        nums: nums, 
        sorted: sortedNums, 
        sorted_list: sortedList,
        smallest: sortedNums[0],
        largest: sortedNums[sortedNums.length - 1]
    };

    inst.adaptiveConfig.variables = { ...(inst.adaptiveConfig.variables || {}), ...templateVars };
    
    inst.type = 'sorting';
    inst.items = itemObjects;
    inst.correctAnswerIndex = -1;
    inst.correctAnswerText = JSON.stringify(correctIds);

    inst.parts = hydrateNode(question.parts && question.parts.length > 0 ? question.parts : [
      { type: 'text', content: 'Put these numbers in order from **smallest** to **largest**.', hasAudio: true }
    ], templateVars);

    inst.solution = hydrateNode(question.solution || [
        {
            type: "section",
            label: "strategy",
            parts: [
                { type: "text", content: "To sort numbers from smallest to largest, always start by looking for the **smallest** number in the group.", isVertical: true },
                { type: "text", content: "\n1. Find the smallest number: **{smallest}**.\n2. Look at the remaining numbers and find the next smallest.\n3. Keep going until all numbers are sorted!", isVertical: true },
                { type: "text", content: "\n**The correct order is:**", isVertical: true },
                { type: "text", content: "### **{sorted_list}**", isVertical: true }
            ]
        }
    ], templateVars);
  }

  if (logic === 'base10_remediation_v1') {
    let num;
    if (overrideVariables) {
      num = overrideVariables.num;
    } else {
      const range = question.data_source?.range || [11, 99];
      num = Math.floor(Math.random() * (range[1] - range[0] + 1)) + range[0];
    }
    const tens_digit = Math.floor(num / 10);
    const ones_digit = num % 10;

    const templateVars = {
      num,
      tens_digit,
      ones_digit
    };

    inst.adaptiveConfig.variables = { ...(inst.adaptiveConfig.variables || {}), ...templateVars };

    inst.parts = hydrateNode(question.parts || [
      { type: 'base10Visual', value: '{num}', isVertical: true },
      { type: 'text', content: 'How many blocks are there?', isVertical: true },
      { type: 'blank', id: 'ans', isVertical: true }
    ], templateVars);

    inst.adaptiveConfig.scaffold = hydrateNode(question.adaptiveConfig?.scaffold || question.adaptive_config?.scaffold || {
      id: "counting_by_groups",
      trigger_on: ["sum_of_digits_error", "incorrect_selection"],
      parts: [
        { type: "text", content: "Let's count the different types of blocks!" },
        {
          "type": "table",
          "content": "| Type | How many? |\n| :--- | :---: |\n| **Tens Rods** | [input: ans_tens] |\n| **Single Blocks** | [input: ans_ones] |"
        },
        {
          "type": "text",
          "content": "\nNow put them in the place value chart to find the total:"
        },
        {
          "type": "table",
          "content": "| Tens | Ones | Total |\n| :---: | :---: | :---: |\n| **{tens_digit}** | **{ones_digit}** | [input: ans_final] |"
        }
      ]
    }, templateVars);

    inst.solution = hydrateNode(question.solution || [
      { type: 'text', content: 'Count the groups: **{tens_digit} tens** and **{ones_digit} ones**.', isVertical: true },
      { type: 'text', content: 'This means: **{tens_digit}0 + {ones_digit} = {num}**.', isVertical: true }
    ], templateVars);

    const partsStr = JSON.stringify(inst.parts);
    const answerPayload = {};
    if (partsStr.includes('"ans"')) answerPayload.ans = String(num);
    if (partsStr.includes('"ans_tens"')) answerPayload.ans_tens = String(tens_digit);
    if (partsStr.includes('"ans_ones"')) answerPayload.ans_ones = String(ones_digit);
    if (partsStr.includes('"ans_final"')) answerPayload.ans_final = String(num);

    inst.correctAnswerText = JSON.stringify(answerPayload);
    inst.adaptiveConfig.correctAnswerText = JSON.stringify(answerPayload);
  }

  if (logic === 'base_10_object_counting_v1') {
    let num;
    if (overrideVariables) {
      num = overrideVariables.num;
    } else {
      const dataSource = question.data_source || inst.adaptiveConfig?.data_source || { range: [1, 9999] };
      const range = dataSource.range || [1, 9999];
      const min = range[0] || 1;
      const max = range[1] || 9999;
      num = Math.floor(Math.random() * (max - min + 1)) + min;
    }

    const thousands_digit = Math.floor(num / 1000);
    const hundreds_digit = Math.floor((num % 1000) / 100);
    const tens_digit = Math.floor((num % 100) / 10);
    const ones_digit = num % 10;

    const templateVars = {
      num,
      thousands_digit,
      hundreds_digit,
      tens_digit,
      ones_digit,
      num_formatted: num.toLocaleString('en-IN')
    };

    inst.adaptiveConfig.variables = { ...(inst.adaptiveConfig.variables || {}), ...templateVars };

    inst.parts = hydrateNode(question.parts || [
      { type: 'base_ten_blocks', thousands: '{thousands_digit}', hundreds: '{hundreds_digit}', tens: '{tens_digit}', ones: '{ones_digit}' },
      { type: 'text', content: 'How many blocks are there?', isVertical: true },
      { type: 'text', content: '[ans]', isVertical: true }
    ], templateVars);

    // Build dynamic solution rows
    const solParts = [{ type: "text", content: "Count the blocks in groups:", isVertical: true }];
    if (thousands_digit > 0) solParts.push({ type: "text", content: `**Thousands:** Count the large cubes. There are ${thousands_digit} thousands. That is ${thousands_digit},000.`, isVertical: true });
    if (hundreds_digit > 0) solParts.push({ type: "text", content: `**Hundreds:** Count the squares. There are ${hundreds_digit} hundreds. That is ${hundreds_digit}00.`, isVertical: true });
    if (tens_digit > 0) solParts.push({ type: "text", content: `**Tens:** Count the tall rods. There are ${tens_digit} rods of ten. That is ${tens_digit}0.`, isVertical: true });
    solParts.push({ type: "text", content: `**Ones:** Count the single cubes. There are ${ones_digit} cubes.`, isVertical: true });

    solParts.push({ type: "text", content: "Put them together in a chart:", isVertical: true });
    const chartHeaders = []; const chartData = [];
    if (thousands_digit > 0) { chartHeaders.push('Th'); chartData.push(thousands_digit); }
    if (hundreds_digit > 0 || thousands_digit > 0) { chartHeaders.push('H'); chartData.push(hundreds_digit); }
    if (tens_digit > 0 || hundreds_digit > 0 || thousands_digit > 0) { chartHeaders.push('T'); chartData.push(tens_digit); }
    chartHeaders.push('O'); chartData.push(ones_digit);

    const chartText = `| ${chartHeaders.join(' | ')} |\n| ${chartHeaders.map(() => '---').join(' | ')} |\n| ${chartData.join(' | ')} |`;
    solParts.push({ type: "text", content: chartText, isVertical: true });
    solParts.push({ type: "text", content: `There are **${num}** blocks in total.`, isVertical: true });

    inst.solution = hydrateNode(question.solution || solParts, templateVars);
    inst.correctAnswerText = JSON.stringify({ ans: String(num) });
    inst.adaptiveConfig.correctAnswerText = JSON.stringify({ ans: String(num) });
  }

  if (logic === 'identifying_places_and_models_v1') {
    // Template 1: Where is the Digit? (Focused exclusively)
    const num = Math.floor(Math.random() * 90) + 10;
    const tens = Math.floor(num / 10);
    const ones = num % 10;
    const useTens = Math.random() < 0.5;
    const targetDigit = useTens ? tens : ones;
    const correctPlace = useTens ? 'tens place' : 'ones place';

    const templateVars = { 
      num, 
      tens_digit: tens, 
      ones_digit: ones, 
      target_digit: targetDigit, 
      correct_place: correctPlace
    };

    inst.adaptiveConfig.variables = { ...(inst.adaptiveConfig.variables || {}), ...templateVars };
    inst.type = 'mcq';

    // Hydrate prompts and options
    inst.parts = hydrateNode([
      { type: 'text', content: `**{num}**`, isVertical: true },
      { type: 'text', content: `Where is the digit **{target_digit}**?`, isVertical: true }
    ], templateVars);

    const options = ['tens place', 'ones place'];
    inst.options = options;
    inst.correctAnswerIndex = options.indexOf(correctPlace);

    inst.solution = hydrateNode([
      { type: 'text', content: 'It can be helpful to use a place-value chart:', isVertical: true },
      { type: 'table', content: '| Tens | Ones |\n| :---: | :---: |\n| **{tens_digit}** | **{ones_digit}** |' },
      { type: 'text', content: 'The **{target_digit}** is in the **{correct_place}**.', isVertical: true }
    ], templateVars);
  }

  return inst;
}
