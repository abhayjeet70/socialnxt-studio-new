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

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data, error } = await supabase.rpc('get_schema_info_or_something');
  // Alternatively, just fetch a row and look at the types
  const { data: rows, error: rowError } = await supabase.from('media_assets').select('*').limit(1);
  console.log("Rows:", rows);
}
main();
