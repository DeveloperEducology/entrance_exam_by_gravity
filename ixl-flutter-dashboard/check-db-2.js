import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    // try to get question_text column
    const { data: d2, error: e2 } = await supabase.from('questions').select('question_text').limit(1);
    if (d2) {
        console.log("Found question_text");
    } else {
        console.log("Error or missing:", e2);
    }
}

run();
