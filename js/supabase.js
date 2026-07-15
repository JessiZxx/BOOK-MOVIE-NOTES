/* ============================================================
   supabase.js - Supabase 客户端初始化
   ============================================================ */

(function () {
  const SUPABASE_URL = 'https://nuzebbkucpfdbvpvlvnj.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im51emViYmt1Y3BmZGJ2cDF2bmoiLCJpYXQiOjE3NTE5NzA4OTksImV4cCI6MjA2NzU0Njg5OX0.Pgs2d0UMYMeszDMKfSJUCfZWW8fPg9MWWhBpy5eGS7w';

  window.supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
})();