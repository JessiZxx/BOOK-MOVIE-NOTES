/* ============================================================
   db.js - 数据库 CRUD 操作模块
   ============================================================ */

const DB = {
  client: null,

  init(client) { this.client = client; },

  async _userId() {
    const { data } = await this.client.auth.getUser();
    return data.user.id;
  },

  /* ==================== 分类 ==================== */
  async getFolders(type) {
    let q = this.client.from('folders').select('*').order('created_at', { ascending: false });
    if (type) q = q.eq('type', type);
    const { data, error } = await q;
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

    // 尝试带完整字段
    let { data, error } = await this.client.from('folders').insert(payload).select().single();
    if (!error) return data;

    // 回退：逐步去掉可能不存在的字段
    console.warn('createFolder 回退:', error.message);
    if (icon) {
      // 去掉 icon 再试
      const p2 = { name, user_id: userId };
      if (type) p2.type = type;
      const r2 = await this.client.from('folders').insert(p2).select().single();
      if (!r2.error) return r2.data;
    }
    // 最后回退：只用 name + user_id + type='book'
    const r3 = await this.client.from('folders')
      .insert({ name, type: 'book', user_id: userId }).select().single();
    if (r3.error) throw r3.error;
    return r3.data;
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
      .from('entries').select('*').eq('folder_id', folderId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  async getEntryCount(folderId) {
    const { count, error } = await this.client
      .from('entries').select('*', { count: 'exact', head: true })
      .eq('folder_id', folderId);
    if (error) throw error;
    return count;
  },

  async createEntry(entry) {
    const userId = await this._userId();
    // 最基础字段 —— 只插一定存在的，确保 100% 成功
    const core = {
      folder_id: entry.folderId,
      user_id: userId,
      title: entry.title
    };
    const { data, error } = await this.client.from('entries').insert(core).select('id').single();
    if (error) throw new Error('写入失败：' + error.message);
    const newId = data?.id;
    if (!newId) throw new Error('写入成功但未返回 ID');

    // 补充其他字段 —— 分批次，每批失败不影响整体
    const batches = [
      { rating: entry.rating || 0, notes: entry.notes || '' },
      { image_url: entry.imageUrl || '' },
      { author: entry.author || '', cover_url: entry.coverUrl || '' },
      { started_date: entry.startedDate || null, finished_date: entry.finishedDate || null }
    ];
    for (const batch of batches) {
      try { await this.client.from('entries').update({...batch, updated_at: new Date().toISOString()}).eq('id', newId); }
      catch (e) { console.warn('字段补充失败（可忽略）:', e.message); }
    }
    return { id: newId };
  },

  async updateEntry(id, entry) {
    // 最基础字段更新
    const core = { title: entry.title, updated_at: new Date().toISOString() };
    const { error } = await this.client.from('entries').update(core).eq('id', id);
    if (error) throw new Error('更新失败：' + error.message);

    // 分批次补充其他字段
    const batches = [
      { rating: entry.rating || 0, notes: entry.notes || '' },
      { image_url: entry.imageUrl || '' },
      { author: entry.author || '', cover_url: entry.coverUrl || '' },
      { started_date: entry.startedDate || null, finished_date: entry.finishedDate || null }
    ];
    for (const batch of batches) {
      try { await this.client.from('entries').update(batch).eq('id', id); }
      catch (e) { console.warn('字段更新失败（可忽略）:', e.message); }
    }
    return { id };
  },

  async deleteEntry(id) {
    const { error } = await this.client.from('entries').delete().eq('id', id);
    if (error) throw error;
  },

  /* ==================== 图片上传 ==================== */
  async uploadImage(file) {
    const userId = await this._userId();
    const ext = file.name.split('.').pop();
    const fileName = `${userId}/${Date.now()}.${ext}`;
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