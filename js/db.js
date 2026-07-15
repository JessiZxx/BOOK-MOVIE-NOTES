/* ============================================================
   db.js - 数据库 CRUD 操作模块
   ============================================================ */

const DB = {
  client: null,

  init(client) {
    this.client = client;
  },

  /* ==================== 文件夹 ==================== */

  /** 获取指定类型的所有文件夹 */
  async getFolders(type) {
    const { data, error } = await this.client
      .from('folders')
      .select('*')
      .eq('type', type)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  /** 创建文件夹 */
  async createFolder(name, type) {
    const { data: userData } = await this.client.auth.getUser();
    const { data, error } = await this.client
      .from('folders')
      .insert({ name, type, user_id: userData.user.id })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  /** 更新文件夹名称 */
  async updateFolder(id, name) {
    const { data, error } = await this.client
      .from('folders')
      .update({ name })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  /** 删除文件夹（级联删除条目） */
  async deleteFolder(id) {
    const { error } = await this.client
      .from('folders')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  /* ==================== 条目 ==================== */

  /** 获取文件夹内的所有条目 */
  async getEntries(folderId) {
    const { data, error } = await this.client
      .from('entries')
      .select('*')
      .eq('folder_id', folderId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  /** 创建条目 */
  async createEntry(entry) {
    const { data: userData } = await this.client.auth.getUser();
    const { data, error } = await this.client
      .from('entries')
      .insert({
        folder_id: entry.folderId,
        user_id: userData.user.id,
        title: entry.title,
        rating: entry.rating || 0,
        notes: entry.notes || '',
        image_url: entry.imageUrl || ''
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  /** 更新条目 */
  async updateEntry(id, entry) {
    const { data, error } = await this.client
      .from('entries')
      .update({
        title: entry.title,
        rating: entry.rating || 0,
        notes: entry.notes || '',
        image_url: entry.imageUrl || '',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  /** 删除条目 */
  async deleteEntry(id) {
    const { error } = await this.client
      .from('entries')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  /* ==================== 图片上传 ==================== */

  /** 上传图片到 Supabase Storage */
  async uploadImage(file) {
    const { data: userData } = await this.client.auth.getUser();
    const fileExt = file.name.split('.').pop();
    const fileName = `${userData.user.id}/${Date.now()}.${fileExt}`;
    const { data, error } = await this.client
      .storage
      .from('entry-images')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });
    if (error) throw error;
    return data;
  },

  /** 获取图片公开 URL */
  getImageUrl(path) {
    const { data } = this.client
      .storage
      .from('entry-images')
      .getPublicUrl(path);
    return data.publicUrl;
  },

  /** 删除图片 */
  async deleteImage(path) {
    const { error } = await this.client
      .storage
      .from('entry-images')
      .remove([path]);
    if (error) throw error;
  }
};