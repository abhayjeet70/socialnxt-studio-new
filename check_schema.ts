import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const envPath = path.resolve(process.cwd(), '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = Object.fromEntries(
  envContent.split('\n')
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#'))
    .map(line => line.split('=').map(part => part.trim()))
);

const supabaseUrl = envVars['VITE_SUPABASE_URL'] || envVars['SUPABASE_URL'];
const supabaseKey = envVars['VITE_SUPABASE_ANON_KEY'] || envVars['SUPABASE_ANON_KEY'];

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data, error } = await supabase.from('issues').select('*').limit(1);
  if (error) {
    console.error("Error fetching:", error);
  } else {
    if (data && data.length > 0) {
      console.log("Columns in issues:", Object.keys(data[0]).join(', '));
    } else {
      console.log("Table is empty, cannot infer columns from data.");
    }
  }
}
main();
