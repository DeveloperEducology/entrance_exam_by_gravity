const { validateAnswer } = require('./src/lib/adaptive/server');

const question = {
  "id": "sci_inquiry_passage_001",
  "type": "tokenSelection",
  "logic_type": "tokenSelection",
  "parts": [
    {
      "type": "text",
      "content": "The passage below describes a process of scientific inquiry. Select the sentence that describes **identifying a question**.",
      "hasAudio": true
    },
    {
      "type": "token_sentence",
      "tokens": [
        {
          "id": "s1",
          "text": "After walking by some rusted cars parked in the street, Tessa wondered whether all metals are equally susceptible to corrosion."
        },
        {
          "id": "s2",
          "text": "Tessa could not recall ever seeing rusted aluminum objects, and she reasoned that aluminum must be less susceptible to corrosion than other metals, like iron."
        }
      ]
    }
  ],
  "correctAnswerText": "[\"s1\"]",
  "isMultiSelect": false
};

const answer = "[\"s1\"]"; // Simulate client-side selection of s1

const result = validateAnswer(question, answer);
console.log("Validation Result:", result);
