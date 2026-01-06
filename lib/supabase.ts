import { createClient } from '@supabase/supabase-js';

// Credentials provided for this instance
const PROVIDED_URL = 'https://ueybnyemilzhnetmaaak.supabase.co';
const PROVIDED_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVleWJueWVtaWx6aG5ldG1hYWFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3MDgxMTAsImV4cCI6MjA4MzI4NDExMH0.xyYmevARYlLdK6NSpR0iB_uU8Y9vHXZs-6zEHQjsv4A';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || PROVIDED_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || PROVIDED_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const isSupabaseConfigured = () => {
  return supabaseUrl.length > 0 && supabaseAnonKey.length > 0;
};