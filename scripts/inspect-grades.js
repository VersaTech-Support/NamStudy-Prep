const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '../.env.local');
const envConfig = dotenv.parse(fs.readFileSync(envPath));

const url = envConfig.EXPO_PUBLIC_SUPABASE_URL;
const key = envConfig.EXPO_PUBLIC_SUPABASE_ANON_KEY;

async function fetchGrades() {
  const res = await fetch(`${url}/rest/v1/grades?select=id,name,curriculum_id,curricula(name)`, {
    headers: {
      'apikey': key,
      'Authorization': `Bearer ${key}`
    }
  });
  const data = await res.json();
  console.log('GRADES:', JSON.stringify(data, null, 2));
}

fetchGrades().catch(console.error);
