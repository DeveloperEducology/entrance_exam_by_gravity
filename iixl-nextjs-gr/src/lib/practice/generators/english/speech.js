/**
 * English Speech to Text Generator
 * Module for testing and validating English pronunciation and STT.
 */

let _uid = 0;
const uid = () => `${Date.now()}_${++_uid}`;

export const LESSONS = {
    sight_words: {
        title: "Sight Words",
        description: "Learn basic 1-2 word combinations",
        icon: "✨",
        sentences: ["Hello", "Thank you", "Blue sky", "Red apple", "Big dog", "Small cat", "Green leaf", "Sun light"]
    },
    short_sentences: {
        title: "Daily Sentences",
        description: "Simple sentences for everyday talk",
        icon: "💬",
        sentences: [
            "The cat sat on the mat.",
            "I like to play with friends.",
            "The ball is in the box.",
            "I can ride my bike.",
            "The sun is very bright."
        ]
    },
    story_time: {
        title: "Story Time",
        description: "Longer sentences for fluent reading",
        icon: "📚",
        sentences: [
            "Birds can fly very high in the blue sky.",
            "We have a lot of fun at school today.",
            "My favorite color is bright green and yellow.",
            "The dog barked at the mailman this morning.",
            "I eat a healthy red apple every single day."
        ]
    }
};

export const createSeededRandom = (seedInput) => {
    const str = String(seedInput || 'english');
    let seed = 0;
    for (let i = 0; i < str.length; i++) {
        seed = (seed * 31 + str.charCodeAt(i)) % 2147483647;
    }
    if (seed <= 0) seed += 2147483646;
    return () => {
        seed = (seed * 48271) % 2147483647;
        return seed / 2147483647;
    };
};

export const speechGenerators = {
    'english_stt_demo': (config) => {
        const { engineParams = {}, adaptiveConfig = {} } = config;
        const seed = engineParams.seed || `speech_${Date.now()}`;
        const random = createSeededRandom(seed);
        
        const category = engineParams.category || 'short_sentences';
        const lesson = LESSONS[category] || LESSONS.short_sentences;
        const sentences = lesson.sentences;

        // Seeded randomization
        const index = Math.floor(random() * sentences.length);
        const targetText = engineParams.sentence || sentences[index];

        return {
            id: `q_speech_${uid()}`,
            type: 'speech_recognition',
            questionText: "Listen to the sentence and repeat it clearly into your microphone.",
            targetText: targetText,
            correctAnswerText: targetText, // For server-side validation if needed
            parts: [
                { type: 'text', content: "Click the microphone and say:" },
                { type: 'text', content: `**${targetText}**`, isVertical: true }
            ],
            adaptiveConfig: {
                logic_type: 'english_stt_demo',
                variables: {
                    sentence: targetText,
                    seed
                }
            },
            solution: [
                {
                    type: 'section',
                    label: 'Pronunciation Guide',
                    parts: [
                        { type: 'text', content: `The target sentence was: "${targetText}"` },
                        { type: 'text', content: "Make sure to enunciate each word clearly and maintain a steady pace." }
                    ]
                }
            ]
        };
    }
};
