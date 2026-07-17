-- ============================================================
-- 私人书影记录 - Supabase 数据库迁移脚本
-- 请在 Supabase Dashboard → SQL Editor 中执行
-- ============================================================

-- 1. 创建 profiles 表（用户扩展信息）
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 创建 folders 表（文件夹 / 分类）
-- 修复：type 允许为 NULL 或 'custom'，不再限制为仅 book/movie
CREATE TABLE IF NOT EXISTS folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  type TEXT DEFAULT 'custom',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 如果表已存在，修复 type 列约束
ALTER TABLE folders ALTER COLUMN type DROP NOT NULL;
ALTER TABLE folders DROP CONSTRAINT IF EXISTS folders_type_check;
ALTER TABLE folders ADD COLUMN IF NOT EXISTS icon TEXT DEFAULT '📂';

-- 3. 创建 entries 表（书影条目）
CREATE TABLE IF NOT EXISTS entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  folder_id UUID REFERENCES folders(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  type TEXT DEFAULT 'book',
  author TEXT DEFAULT '',
  rating INTEGER DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
  notes TEXT DEFAULT '',
  image_url TEXT DEFAULT '',
  cover_url TEXT DEFAULT '',
  started_date DATE,
  finished_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. 补充字段（如果表已存在则添加）
ALTER TABLE entries ADD COLUMN IF NOT EXISTS type TEXT;
-- 兼容：如果 type 列已有 NOT NULL 约束，添加默认值并放宽约束
ALTER TABLE entries ALTER COLUMN type SET DEFAULT 'book';
ALTER TABLE entries ALTER COLUMN type DROP NOT NULL;
ALTER TABLE entries ADD COLUMN IF NOT EXISTS author TEXT DEFAULT '';
ALTER TABLE entries ADD COLUMN IF NOT EXISTS cover_url TEXT DEFAULT '';
ALTER TABLE entries ADD COLUMN IF NOT EXISTS started_date DATE;
ALTER TABLE entries ADD COLUMN IF NOT EXISTS finished_date DATE;

-- 5. 启用 Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE entries ENABLE ROW LEVEL SECURITY;

-- 6. profiles 表 RLS 策略
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- 7. folders 表 RLS 策略
DROP POLICY IF EXISTS "Users can view own folders" ON folders;
CREATE POLICY "Users can view own folders"
  ON folders FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own folders" ON folders;
CREATE POLICY "Users can create own folders"
  ON folders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own folders" ON folders;
CREATE POLICY "Users can update own folders"
  ON folders FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own folders" ON folders;
CREATE POLICY "Users can delete own folders"
  ON folders FOR DELETE
  USING (auth.uid() = user_id);

-- 8. entries 表 RLS 策略
DROP POLICY IF EXISTS "Users can view own entries" ON entries;
CREATE POLICY "Users can view own entries"
  ON entries FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own entries" ON entries;
CREATE POLICY "Users can create own entries"
  ON entries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own entries" ON entries;
CREATE POLICY "Users can update own entries"
  ON entries FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own entries" ON entries;
CREATE POLICY "Users can delete own entries"
  ON entries FOR DELETE
  USING (auth.uid() = user_id);

-- 9. Storage 策略（存储桶 entry-images 需手动创建）
DROP POLICY IF EXISTS "Users can upload images" ON storage.objects;
CREATE POLICY "Users can upload images"
  ON storage.objects FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND bucket_id = 'entry-images');

DROP POLICY IF EXISTS "Anyone can view images" ON storage.objects;
CREATE POLICY "Anyone can view images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'entry-images');

DROP POLICY IF EXISTS "Users can delete own images" ON storage.objects;
CREATE POLICY "Users can delete own images"
  ON storage.objects FOR DELETE
  USING (auth.uid() = owner AND bucket_id = 'entry-images');

-- 10. 自动创建 profile 的触发器
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();