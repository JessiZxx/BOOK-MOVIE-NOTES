/* ============================================================
   db.js - 数据库 CRUD 操作模块
   ============================================================ */

const DB = {
  client: null,
  _hasNewColumns: null,

  init(client) { this.client = client; },

  /** 检测新字段是否存在 */
  async checkNewColumns() {
    if (this._hasNewColumns !== null) return this._hasNewColumns;
    try {
      const { data: userData } = await this.client.auth.getUser();
      const { error } = await this.client.from('entries').insert({
        folder_id: '00000000-0000-0000-0000-000000000000',
        user_id: userData.user.id,
        title: '__test__',
        author: '',
        cover_url: '',
        started_date: null,
        finished_date: null
      });
      this._hasNewColumns = !error;
      if (!error) {
        // 清理测试数据
        await this.client.from('entries').delete().eq('title', '__test__');
      }
    } catch (e) {
      this._hasNewColumns = false;
    }
    return this._hasNewColumns;
  },

  /* ==================== 分类 ==================== */
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
    // 先尝试带 type 字段插入
    let { data, error } = await this.client
      .from('folders').insert({ name, type, user_id: userData.user.id }).select().single();
    if (error) {
      // type 字段可能不存在，回退到不带 type 的插入
      console.warn('createFolder with type failed, trying without type:', error.message);
      const r = await this.client
        .from('folders').insert({ name, user_id: userData.user.id }).select().single();
      if (r.error) throw r.error;
      data = r.data;
    }
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

  _buildEntryPayload(entry) {
    const base = {
      folder_id: entry.folderId,
      title: entry.title,
      rating: entry.rating || 0,
      notes: entry.notes || '',
      image_url: entry.imageUrl || ''
    };
    if (this._hasNewColumns) {
      base.author = entry.author || '';
      base.cover_url = entry.coverUrl || '';
      base.started_date = entry.startedDate || null;
      base.finished_date = entry.finishedDate || null;
    }
    return base;
  },

  async createEntry(entry) {
    await this.checkNewColumns();
    const { data: userData } = await this.client.auth.getUser();
    const payload = { ...this._buildEntryPayload(entry), user_id: userData.user.id };
    const { data, error } = await this.client.from('entries').insert(payload).select().single();
    if (error) throw error;
    return data;
  },

  async updateEntry(id, entry) {
    await this.checkNewColumns();
    const payload = {
      ...this._buildEntryPayload(entry),
      updated_at: new Date().toISOString()
    };
    const { data, error } = await this.client.from('entries').update(payload).eq('id', id).select().single();
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
  }
};