import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const { data: d2, error: e2 } = await supabase.from('questions').select('*').limit(1);
    if (d2 && d2.length > 0) {
        console.log("Columns:", Object.keys(d2[0]));
    } else {
        console.log("No data or error:", e2);
    }
}

run();
