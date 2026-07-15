-- ============================================================
-- 私人书影记录 - Supabase 数据库迁移脚本
-- 请在 Supabase Dashboard → SQL Editor 中执行此脚本
-- ============================================================

-- 1. 创建 profiles 表（用户扩展信息）
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 创建 folders 表（文件夹）
CREATE TABLE IF NOT EXISTS folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('book', 'movie')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 创建 entries 表（书影条目）
CREATE TABLE IF NOT EXISTS entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  folder_id UUID REFERENCES folders(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  rating INTEGER DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
  notes TEXT DEFAULT '',
  image_url TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 4. 启用 Row Level Security
-- ============================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE entries ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 5. profiles 表 RLS 策略
-- ============================================================
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- ============================================================
-- 6. folders 表 RLS 策略
-- ============================================================
CREATE POLICY "Users can view own folders"
  ON folders FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own folders"
  ON folders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own folders"
  ON folders FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own folders"
  ON folders FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================
-- 7. entries 表 RLS 策略
-- ============================================================
CREATE POLICY "Users can view own entries"
  ON entries FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own entries"
  ON entries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own entries"
  ON entries FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own entries"
  ON entries FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================
-- 8. 创建 Storage 存储桶（图片上传）
--    请在 Supabase Dashboard → Storage 中手动创建名为 entry-images 的公开存储桶
--    然后执行以下 SQL 设置 Storage 的 RLS 策略
-- ============================================================

-- Storage RLS 策略（创建 bucket 后在 SQL Editor 执行）
-- 允许已认证用户上传图片
-- CREATE POLICY "Users can upload images"
--   ON storage.objects FOR INSERT
--   WITH CHECK (auth.role() = 'authenticated' AND bucket_id = 'entry-images');

-- 允许公开读取图片
-- CREATE POLICY "Anyone can view images"
--   ON storage.objects FOR SELECT
--   USING (bucket_id = 'entry-images');

-- 允许用户删除自己的图片
-- CREATE POLICY "Users can delete own images"
--   ON storage.objects FOR DELETE
--   USING (auth.uid() = owner AND bucket_id = 'entry-images');

-- ============================================================
-- 9. 自动创建 profile 的触发器（注册时自动创建）
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 如果触发器已存在则先删除
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();