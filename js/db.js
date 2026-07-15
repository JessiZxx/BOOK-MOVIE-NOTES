/* ============================================================
   db.js - 数据库 CRUD 操作模块
   策略：先尝试写入全部字段，失败则自动回退到基础字段
   ============================================================ */

const DB = {
  client: null,

  init(client) { this.client = client; },

  /** 获取当前用户 ID */
  async _userId() {
    const { data } = await this.client.auth.getUser();
    return data.user.id;
  },

  /* ==================== 分类 ==================== */
  async getFolders(type) {
    let query = this.client.from('folders').select('*').order('created_at', { ascending: false });
    if (type) query = query.eq('type', type);
    const { data, error } = await query;
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
    const userId = await this._userId();
    const payload = { name, user_id: userId };
    if (type) payload.type = type;
    // 先尝试带 type 插入
    let { data, error } = await this.client
      .from('folders').insert(payload).select().single();
    if (error && type === 'custom') {
      // 旧数据库可能不允许 'custom' 类型，回退到 'book'
      console.warn('createFolder with custom type failed, trying book:', error.message);
      const r = await this.client
        .from('folders').insert({ name, type: 'book', user_id: userId }).select().single();
      if (r.error) throw r.error;
      data = r.data;
    } else if (error) {
      throw error;
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

  /** 构建完整 payload（含所有扩展字段） */
  _fullPayload(entry, userId) {
    return {
      folder_id: entry.folderId,
      user_id: userId,
      title: entry.title,
      author: entry.author || '',
      rating: entry.rating || 0,
      notes: entry.notes || '',
      image_url: entry.imageUrl || '',
      cover_url: entry.coverUrl || '',
      started_date: entry.startedDate || null,
      finished_date: entry.finishedDate || null
    };
  },

  /** 构建基础 payload（仅核心字段，兼容旧表结构） */
  _basePayload(entry, userId) {
    return {
      folder_id: entry.folderId,
      user_id: userId,
      title: entry.title,
      rating: entry.rating || 0,
      notes: entry.notes || '',
      image_url: entry.imageUrl || ''
    };
  },

  async createEntry(entry) {
    const userId = await this._userId();
    // 先尝试完整字段
    const { data, error } = await this.client
      .from('entries').insert(this._fullPayload(entry, userId)).select().single();
    if (!error) return data;
    // 如果失败（可能是扩展字段不存在），回退到基础字段
    console.warn('Full insert failed, retrying with base fields:', error.message);
    const { data: d2, error: e2 } = await this.client
      .from('entries').insert(this._basePayload(entry, userId)).select().single();
    if (e2) throw e2;
    return d2;
  },

  async updateEntry(id, entry) {
    const userId = await this._userId();
    const payload = {
      ...this._fullPayload(entry, userId),
      updated_at: new Date().toISOString()
    };
    const { data, error } = await this.client
      .from('entries').update(payload).eq('id', id).select().single();
    if (!error) return data;
    // 回退到基础字段
    console.warn('Full update failed, retrying with base fields:', error.message);
    const basePayload = {
      ...this._basePayload(entry, userId),
      updated_at: new Date().toISOString()
    };
    const { data: d2, error: e2 } = await this.client
      .from('entries').update(basePayload).eq('id', id).select().single();
    if (e2) throw e2;
    return d2;
  },

  async deleteEntry(id) {
    const { error } = await this.client.from('entries').delete().eq('id', id);
    if (error) throw error;
  },

  /* ==================== 图片上传 ==================== */
  async uploadImage(file) {
    const userId = await this._userId();
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/${Date.now()}.${fileExt}`;
    const { data, error } = await this.client.storage
      .from('entry-images').upload(fileName, file, { cacheControl: '3600', upsert: false });
    if (error) throw error;
    return data;
  },

  getImageUrl(path) {
    const { data } = this.client.storage.from('entry-images').getPublicUrl(path);
    return data.publicUrl;
  }
};