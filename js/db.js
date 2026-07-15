/* ============================================================
   db.js - 数据库 CRUD 操作模块
   ============================================================ */

const DB = {
  client: null,

  init(client) { this.client = client; },

  /* ==================== 分类（文件夹） ==================== */

  async getFolders(type) {
    const { data, error } = await this.client
      .from('folders').select('*').eq('type', type).order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  async getAllFolders() {
    const { data, error } = await this.client
      .from('folders').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  async createFolder(name, type) {
    const { data: userData } = await this.client.auth.getUser();
    const { data, error } = await this.client
      .from('folders').insert({ name, type, user_id: userData.user.id }).select().single();
    if (error) throw error;
    return data;
  },

  async updateFolder(id, name) {
    const { data, error } = await this.client
      .from('folders').update({ name }).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },

  async deleteFolder(id) {
    const { error } = await this.client.from('folders').delete().eq('id', id);
    if (error) throw error;
  },

  /* ==================== 条目 ==================== */

  async getEntries(folderId) {
    const { data, error } = await this.client
      .from('entries').select('*').eq('folder_id', folderId).order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  async getEntryCount(folderId) {
    const { count, error } = await this.client
      .from('entries').select('*', { count: 'exact', head: true }).eq('folder_id', folderId);
    if (error) throw error;
    return count;
  },

  async createEntry(entry) {
    const { data: userData } = await this.client.auth.getUser();
    const { data, error } = await this.client
      .from('entries').insert({
        folder_id: entry.folderId,
        user_id: userData.user.id,
        title: entry.title,
        author: entry.author || '',
        rating: entry.rating || 0,
        notes: entry.notes || '',
        image_url: entry.imageUrl || '',
        cover_url: entry.coverUrl || '',
        started_date: entry.startedDate || null,
        finished_date: entry.finishedDate || null
      }).select().single();
    if (error) throw error;
    return data;
  },

  async updateEntry(id, entry) {
    const { data, error } = await this.client
      .from('entries').update({
        title: entry.title,
        author: entry.author || '',
        rating: entry.rating || 0,
        notes: entry.notes || '',
        image_url: entry.imageUrl || '',
        cover_url: entry.coverUrl || '',
        started_date: entry.startedDate || null,
        finished_date: entry.finishedDate || null,
        updated_at: new Date().toISOString()
      }).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },

  async deleteEntry(id) {
    const { error } = await this.client.from('entries').delete().eq('id', id);
    if (error) throw error;
  },

  /* ==================== 图片上传 ==================== */

  async uploadImage(file) {
    const { data: userData } = await this.client.auth.getUser();
    const fileExt = file.name.split('.').pop();
    const fileName = `${userData.user.id}/${Date.now()}.${fileExt}`;
    const { data, error } = await this.client.storage.from('entry-images').upload(fileName, file, { cacheControl: '3600', upsert: false });
    if (error) throw error;
    return data;
  },

  getImageUrl(path) {
    const { data } = this.client.storage.from('entry-images').getPublicUrl(path);
    return data.publicUrl;
  },

  async deleteImage(path) {
    const { error } = await this.client.storage.from('entry-images').remove([path]);
    if (error) throw error;
  }
};