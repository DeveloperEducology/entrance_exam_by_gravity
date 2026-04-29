
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const { instantiateTemplate } = require('./src/lib/practice/generators/templateInstantiator');

async function test() {
  const mockQuestion = {
    id: "tpl_ai_dynamic_story_math",
    type: "mcq",
    logic_type: "ai_generative_v1",
    questionText: "{{story_problem}}",
    options: "{{ai_options}}",
    adaptiveConfig: {
      prompt: "Create a funny division story problem about a robot baker. Use a total between 30 and 60. Return a JSON with: 'story_problem' (the text), 'ai_options' (array of 4 strings), 'correctAnswerIndex' (0-3), and 'ans_explanation'.",
      variables: {} 
    },
    solution: "{{ans_explanation}}"
  };

  console.log("Starting test instantiation...");
  try {
      const result = await instantiateTemplate(mockQuestion);
      console.log("RESULT JSON:");
      console.log(JSON.stringify(result, null, 2));
  } catch (err) {
      console.error("TEST FAILED:", err);
  }
}

test();
