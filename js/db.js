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

  async createFolder(name, type, icon) {
    const userId = await this._userId();
    const payload = { name, user_id: userId };
    if (type) payload.type = type;
    if (icon) payload.icon = icon;
    // 先尝试带完整字段插入
    let { data, error } = await this.client
      .from('folders').insert(payload).select().single();
    if (error) {
      // 旧数据库可能不支持 custom/icon，回退到基础字段
      console.warn('createFolder full insert failed, trying base:', error.message);
      const r = await this.client
        .from('folders').insert({ name, type: 'book', user_id: userId }).select().single();
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

  async createEntry(entry) {
    const userId = await this._userId();
    // 第一步：只用核心字段插入，确保一定成功
    const core = {
      folder_id: entry.folderId,
      user_id: userId,
      title: entry.title,
      rating: entry.rating || 0,
      notes: entry.notes || '',
      image_url: entry.imageUrl || ''
    };
    const { error } = await this.client.from('entries').insert(core);
    if (error) throw new Error('数据库写入失败：' + error.message);

    // 第二步：查出刚插入的条目，尝试补充扩展字段
    const { data: rows } = await this.client.from('entries')
      .select('id').eq('folder_id', entry.folderId).eq('title', entry.title)
      .order('created_at', { ascending: false }).limit(1);
    const newId = rows?.[0]?.id;
    if (newId) {
      try {
        await this.client.from('entries').update({
          author: entry.author || '',
          cover_url: entry.coverUrl || '',
          started_date: entry.startedDate || null,
          finished_date: entry.finishedDate || null,
          updated_at: new Date().toISOString()
        }).eq('id', newId);
      } catch (e) { console.warn('扩展字段补充失败（可忽略）:', e.message); }
    }
    return { id: newId };
  },

  async updateEntry(id, entry) {
    const userId = await this._userId();
    // 核心字段
    const core = {
      title: entry.title,
      rating: entry.rating || 0,
      notes: entry.notes || '',
      image_url: entry.imageUrl || '',
      updated_at: new Date().toISOString()
    };
    const { error } = await this.client.from('entries').update(core).eq('id', id);
    if (error) throw new Error('数据库更新失败：' + error.message);

    // 尝试补充扩展字段
    try {
      await this.client.from('entries').update({
        author: entry.author || '',
        cover_url: entry.coverUrl || '',
        started_date: entry.startedDate || null,
        finished_date: entry.finishedDate || null
      }).eq('id', id);
    } catch (e) { console.warn('扩展字段更新失败（可忽略）:', e.message); }
    return { id };
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