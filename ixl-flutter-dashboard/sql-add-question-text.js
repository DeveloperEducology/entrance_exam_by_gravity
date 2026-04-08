import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const { data, error } = await supabase.rpc('execute_sql', {
       // Only works if there's an arbitrary wrapper RPC. Otherwise user has to run the SQL themselves.
       sql_query: "ALTER TABLE questions ADD COLUMN IF NOT EXISTS question_text TEXT;"
    });
    console.log("RPC Error (expected if not set up):", error);
}

run();
