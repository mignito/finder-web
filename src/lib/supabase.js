import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lvxhevbskoyludpxgkzv.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx2eGhldmJza295bHVkcHhna3p2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4OTYyMDksImV4cCI6MjA5NDQ3MjIwOX0.zZJ9WeoKB54NcgHFs302-Wr3Gbzn6wUr-kplbP82qFI';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
