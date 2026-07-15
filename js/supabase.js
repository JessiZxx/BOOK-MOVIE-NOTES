/* ============================================================
   supabase.js - Supabase 客户端初始化
   ============================================================ */

(function () {
  const SUPABASE_URL = 'https://nuzebbkucpfdbvpvlvnj.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im51emViYmt1Y3BmZGJ2cHZsdm5qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxMjIxOTksImV4cCI6MjA5OTY5ODE5OX0.pgs2d0UMYMeszDMKfSJUCFZWW8FPg9MwWhBpy5eGS7w';

  window.supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
})();