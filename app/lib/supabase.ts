import { createClient } from '@supabase/supabase-js';


// Initialize database client
const supabaseUrl = 'https://dojvugkunnnmkwirdjjd.databasepad.com';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6ImVjNDIyYjg1LTc3MDctNDk5ZC05OGM1LTBiOTYwYTRjOWYzOSJ9.eyJwcm9qZWN0SWQiOiJkb2p2dWdrdW5ubm1rd2lyZGpqZCIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzcxMjgxMzAxLCJleHAiOjIwODY2NDEzMDEsImlzcyI6ImZhbW91cy5kYXRhYmFzZXBhZCIsImF1ZCI6ImZhbW91cy5jbGllbnRzIn0.erURBFHhkvYN0JSRPxltR4yOQlxi5GnUExricxXsffM';
const supabase = createClient(supabaseUrl, supabaseKey);


export { supabase };