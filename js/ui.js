/* ============================================================
   ui.js - UI 渲染与事件处理（档案袋+搜索+面包屑+导览）
   ============================================================ */

const UI = {
  currentView: 'dashboard',
  currentType: null,
  currentFolderId: null,
  currentEntryId: null,
  currentImagePath: null,
  pendingImageFile: null,
  searchTimer: null,

  els: {},

  init() { this.cacheDOM(); this.bindEvents(); },

  cacheDOM() {
    const qs = (s) => document.querySelector(s);
    this.els = {
      authView: qs('#auth-view'), appView: qs('#app-view'),
      loginForm: qs('#login-form'), registerForm: qs('#register-form'),
      authTabs: document.querySelectorAll('.auth-tab'), authMessage: qs('#auth-message'),
      userEmail: qs('#user-email'), btnLogout: qs('#btn-logout'),
      btnBack: qs('#btn-back'), breadcrumb: qs('#breadcrumb'),
      headerLogo: qs('#header-logo-click'), btnEnterDash: qs('#btn-enter-dashboard'),

      guideView: qs('#guide-view'),
      dashboardView: qs('#dashboard-view'), dashboardCategories: qs('#dashboard-categories'),
      btnAddCategory: qs('#btn-add-category'),

      entriesView: qs('#entries-view'), entriesTitle: qs('#entries-title'),
      entriesList: qs('#entries-list'), entriesEmpty: qs('#entries-empty'),
      searchInput: qs('#search-input'), searchResults: qs('#search-results'),
      btnAddEntry: qs('#btn-add-entry'),

      entryDetailView: qs('#entry-detail-view'),
      entryForm: qs('#entry-form'), entryFormTitle: qs('#entry-form-title'),
      entryTitle: qs('#entry-title'), entryAuthor: qs('#entry-author'),
      entryRating: qs('#entry-rating'), entryNotes: qs('#entry-notes'),
      entryStarted: qs('#entry-started'), entryFinished: qs('#entry-finished'),
      starRating: qs('#star-rating'),
      imagePreview: qs('#image-preview'), imagePreviewImg: qs('#image-preview-img'),
      imageUploadBtn: qs('#image-upload-btn'), entryImageInput: qs('#entry-image-input'),
      btnRemoveImg: qs('#btn-remove-img'), btnDeleteEntry: qs('#btn-delete-entry'),

      folderModal: qs('#folder-modal'), folderForm: qs('#folder-form'),
      folderName: qs('#folder-name'), folderId: qs('#folder-id'),
      folderType: qs('#folder-type'), folderTypeGroup: qs('#folder-type-group'),
      folderModalTitle: qs('#folder-modal-title'),
      typeBtns: document.querySelectorAll('.type-btn'),
      btnCancelFolder: qs('#btn-cancel-folder'),
      loadingOverlay: qs('#loading-overlay'),
    };
  },

  bindEvents() {
    this.els.loginForm.addEventListener('submit', e => this.handleLogin(e));
    this.els.registerForm.addEventListener('submit', e => this.handleRegister(e));
    this.els.btnLogout.addEventListener('click', () => App.logout());
    this.els.authTabs.forEach(t => t.addEventListener('click', () => this.switchAuthTab(t.dataset.tab)));
    document.querySelectorAll('.link-btn[data-switch]').forEach(b => b.addEventListener('click', () => this.switchAuthTab(b.dataset.switch)));
    this.els.btnBack.addEventListener('click', () => this.goBack());
    this.els.headerLogo.addEventListener('click', () => this.navigateTo('guide'));
    this.els.btnEnterDash.addEventListener('click', () => this.navigateTo('dashboard'));
    this.els.btnAddCategory.addEventListener('click', () => this.openCategoryModal());
    this.els.folderForm.addEventListener('submit', e => this.handleFolderSubmit(e));
    this.els.btnCancelFolder.addEventListener('click', () => this.closeFolderModal());
    this.els.typeBtns.forEach(b => b.addEventListener('click', () => {
      this.els.typeBtns.forEach(t => t.classList.toggle('active', t === b));
      this.els.folderType.value = b.dataset.type;
    }));
    this.els.btnAddEntry.addEventListener('click', () => this.openEntryForm(null));
    this.els.entryForm.addEventListener('submit', e => this.handleEntrySubmit(e));
    this.els.btnDeleteEntry.addEventListener('click', () => this.handleDeleteEntry());
    this.els.starRating.addEventListener('click', e => { if (e.target.dataset.star) this.setRating(parseInt(e.target.dataset.star)); });
    this.els.entryImageInput.addEventListener('change', e => this.handleImageSelect(e));
    this.els.btnRemoveImg.addEventListener('click', () => this.clearImage());
    this.els.searchInput.addEventListener('input', () => this.handleSearchInput());
    this.els.searchInput.addEventListener('focus', () => { if (this.els.searchInput.value.trim().length >= 2) this.handleSearchInput(); });
    document.addEventListener('click', e => { if (!e.target.closest('.search-input-wrap')) this.els.searchResults.classList.remove('active'); });
    document.querySelector('#folder-modal .modal-overlay').addEventListener('click', () => this.closeFolderModal());
    // 面包屑点击
    this.els.breadcrumb.addEventListener('click', e => {
      const item = e.target.closest('.breadcrumb-item');
      if (item && item.dataset.view && !item.classList.contains('active')) {
        this.navigateTo(item.dataset.view);
      }
    });
  },

  /* ==================== 认证 ==================== */
  switchAuthTab(tab) {
    this.els.authTabs.forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
    this.els.loginForm.style.display = tab === 'login' ? 'block' : 'none';
    this.els.registerForm.style.display = tab === 'register' ? 'block' : 'none';
    this.clearAuthMessage();
  },

  showAuthMessage(m, t) { this.els.authMessage.textContent = m; this.els.authMessage.className = 'auth-message ' + t; },
  clearAuthMessage() { this.els.authMessage.textContent = ''; this.els.authMessage.className = 'auth-message'; },
  showApp(email) { this.els.authView.classList.remove('active'); this.els.appView.classList.add('active'); this.els.userEmail.textContent = email; this.navigateTo('guide'); },
  showAuth() { this.els.appView.classList.remove('active'); this.els.authView.classList.add('active'); this.switchAuthTab('login'); this.els.loginForm.reset(); this.els.registerForm.reset(); },

  async handleLogin(e) {
    e.preventDefault();
    const email = this.els.loginForm.querySelector('#login-email').value.trim();
    const password = this.els.loginForm.querySelector('#login-password').value;
    if (!email || !password) { this.showAuthMessage('请填写邮箱和密码', 'error'); return; }
    this.showLoading();
    const r = await Auth.signIn(email, password);
    this.hideLoading();
    if (r.error) this.showAuthMessage(r.error.message || '登录失败', 'error');
    else this.showApp(email);
  },

  async handleRegister(e) {
    e.preventDefault();
    const email = this.els.registerForm.querySelector('#register-email').value.trim();
    const password = this.els.registerForm.querySelector('#register-password').value;
    if (!email || !password) { this.showAuthMessage('请填写邮箱和密码', 'error'); return; }
    if (password.length < 6) { this.showAuthMessage('密码至少需要6位', 'error'); return; }
    this.showLoading();
    try {
      const r = await Auth.signUp(email, password); this.hideLoading();
      if (r.error) {
        const m = r.error.message || '';
        if (m.includes('already registered')) this.showAuthMessage('该邮箱已注册，请直接登录', 'error');
        else if (m.includes('rate') || m.includes('limit')) this.showAuthMessage('操作过于频繁，请等一分钟', 'error');
        else this.showAuthMessage('注册失败：' + m, 'error');
      } else {
        const u = r.data?.user, s = r.data?.session;
        if (u && !s) this.showAuthMessage('注册成功！', 'success');
        else if (u && s) { this.showAuthMessage('注册成功！', 'success'); setTimeout(() => this.showApp(email), 500); }
        else this.showAuthMessage('注册成功！请登录。', 'success');
        setTimeout(() => this.switchAuthTab('login'), 2000);
      }
    } catch (err) { this.hideLoading(); this.showAuthMessage('异常：' + (err.message || '未知错误'), 'error'); }
  },

  /* ==================== 面包屑 ==================== */
  updateBreadcrumb(parts) {
    this.els.breadcrumb.innerHTML = parts.map((p, i) => {
      const isLast = i === parts.length - 1;
      return `<span class="breadcrumb-item${isLast ? ' active' : ''}" data-view="${p.view}">${this.esc(p.label)}</span>${isLast ? '' : '<span class="breadcrumb-sep">/</span>'}`;
    }).join('');
  },

  /* ==================== 视图导航 ==================== */
  showView(viewName) {
    this.currentView = viewName;
    document.querySelectorAll('.subview').forEach(el => el.classList.remove('active'));
    const map = {
      guide: this.els.guideView,
      dashboard: this.els.dashboardView,
      entries: this.els.entriesView,
      'entry-detail': this.els.entryDetailView
    };
    if (map[viewName]) map[viewName].classList.add('active');
    this.els.btnBack.style.display = (viewName === 'guide' || viewName === 'dashboard') ? 'none' : 'inline-flex';
  },

  navigateTo(view, param) {
    if (view === 'guide') {
      this.showView('guide');
      this.updateBreadcrumb([{ label: '书影', view: 'guide' }]);
    } else if (view === 'dashboard') {
      this.currentType = null; this.currentFolderId = null; this.currentEntryId = null;
      this.showView('dashboard'); this.loadDashboard();
      this.updateBreadcrumb([{ label: '书影', view: 'guide' }, { label: '我的书房', view: 'dashboard' }]);
    } else if (view === 'entries') {
      // 面包屑点击时可能没有 param，使用已存储的 currentFolderId / currentType
      const folderId = param?.folderId || this.currentFolderId;
      const type = param?.type || this.currentType;
      if (!folderId || !type) { this.navigateTo('dashboard'); return; }
      this.currentFolderId = folderId; this.currentType = type; this.currentEntryId = null;
      this.showView('entries'); this.loadEntries();
      const label = this.currentType === 'book' ? 'Books' : 'Movies';
      this.updateBreadcrumb([{ label: '书影', view: 'guide' }, { label: '我的书房', view: 'dashboard' }, { label, view: 'entries' }]);
    } else if (view === 'entry-detail') {
      this.currentEntryId = param;
      this.showView('entry-detail'); this.loadEntryForm(param);
      const label = this.currentType === 'book' ? 'Books' : 'Movies';
      this.updateBreadcrumb([{ label: '书影', view: 'guide' }, { label: '我的书房', view: 'dashboard' }, { label, view: 'entries' }, { label: '编辑', view: 'entry-detail' }]);
    }
  },

  goBack() {
    if (this.currentView === 'entry-detail') this.navigateTo('entries', { folderId: this.currentFolderId, type: this.currentType });
    else if (this.currentView === 'entries') this.navigateTo('dashboard');
    else if (this.currentView === 'dashboard') this.navigateTo('guide');
  },

  /* ==================== 仪表盘 ==================== */
  async loadDashboard() {
    this.showLoading();
    try {
      const folders = await DB.getAllFolders();
      // 如果文件夹有 type 字段则按类型匹配，否则只按名称匹配（兼容旧数据）
      const findFolder = (type) => {
        const byType = folders.find(f => f.type === type);
        if (byType) return byType;
        const name = type === 'book' ? 'Books' : 'Movies';
        return folders.find(f => f.name === name);
      };
      const cats = [
        { id: '_book', name: 'Books', type: 'book', icon: '📚', isBuiltin: true },
        { id: '_movie', name: 'Movies', type: 'movie', icon: '🎬', isBuiltin: true }
      ];
      for (const cat of cats) {
        const f = findFolder(cat.type);
        cat.count = f ? await DB.getEntryCount(f.id) : 0;
        cat.folderId = f ? f.id : null;
      }
      this.renderDashboard(cats);
    } catch (err) { console.error(err); alert('加载失败：' + err.message); }
    finally { this.hideLoading(); }
  },

  renderDashboard(cats) {
    this.els.dashboardCategories.innerHTML = cats.map(c => `
      <div class="category-card" data-id="${c.id}" data-type="${c.type}" data-folder="${c.folderId || ''}">
        <div class="category-card-tab">${c.type === 'book' ? 'BOOKS' : 'MOVIES'}</div>
        <div class="category-card-icon">${c.icon}</div>
        <div class="category-card-title">${this.esc(c.name)}</div>
        <div class="category-card-count">${c.count || 0} 条记录</div>
      </div>
    `).join('');

    this.els.dashboardCategories.querySelectorAll('.category-card').forEach(card => {
      card.addEventListener('click', (e) => {
        const type = card.dataset.type;
        const folderId = card.dataset.folder;
        if (folderId) { this.navigateTo('entries', { folderId, type }); }
        else { this.createDefaultFolderAndEnter(type); }
      });
    });
  },

  async createDefaultFolderAndEnter(type) {
    this.showLoading();
    try {
      const name = type === 'book' ? 'Books' : 'Movies';
      const folder = await DB.createFolder(name, type);
      this.hideLoading();
      this.navigateTo('entries', { folderId: folder.id, type });
    } catch (err) { this.hideLoading(); alert('创建失败：' + err.message); }
  },

  /* ==================== 分类模态框 ==================== */
  openCategoryModal(id, name) {
    this.els.folderModalTitle.textContent = id ? '编辑分类' : '新建分类';
    this.els.folderName.value = name || '';
    this.els.folderId.value = id || '';
    this.els.folderType.value = 'book';
    this.els.folderTypeGroup.style.display = id ? 'none' : 'block';
    this.els.typeBtns.forEach(b => b.classList.toggle('active', b.dataset.type === 'book'));
    this.els.folderModal.classList.add('active');
    this.els.folderName.focus();
  },

  closeFolderModal() {
    this.els.folderModal.classList.remove('active');
    this.els.folderForm.reset();
    this.els.folderId.value = '';
    this.els.folderType.value = 'book';
  },

  async handleFolderSubmit(e) {
    e.preventDefault();
    const name = this.els.folderName.value.trim();
    const id = this.els.folderId.value;
    const type = this.els.folderType.value || 'book';
    if (!name) return;
    this.showLoading();
    try {
      if (id) await DB.updateFolder(id, name);
      else await DB.createFolder(name, type);
      this.closeFolderModal();
      this.loadDashboard();
    } catch (err) { alert('保存失败：' + err.message); }
    finally { this.hideLoading(); }
  },

  /* ==================== 搜索 ==================== */
  async handleSearchInput() {
    clearTimeout(this.searchTimer);
    const query = this.els.searchInput.value.trim();
    if (query.length < 2) { this.els.searchResults.classList.remove('active'); return; }
    this.searchTimer = setTimeout(() => this.doSearch(query), 350);
  },

  async doSearch(query) {
    this.els.searchResults.innerHTML = '<div class="search-results-empty">搜索中...</div>';
    this.els.searchResults.classList.add('active');
    try {
      const results = await this.searchBooks(query);
      if (results.length === 0) {
        this.els.searchResults.innerHTML = '<div class="search-results-empty">未找到结果</div>';
      } else {
        this.els.searchResults.innerHTML = results.map((r, i) => `
          <div class="search-result-item" data-index="${i}">
            <img class="search-result-cover" src="${this.esc(r.cover || '')}" alt="" onerror="this.style.display='none'">
            <div class="search-result-info">
              <div class="search-result-title">${this.esc(r.title)}</div>
              <div class="search-result-author">${this.esc(r.author || '')}</div>
              <div class="search-result-year">${r.year || ''}</div>
            </div>
          </div>
        `).join('');
        this.els.searchResults.querySelectorAll('.search-result-item').forEach(item => {
          item.addEventListener('click', () => this.selectSearchResult(results[parseInt(item.dataset.index)]));
        });
      }
    } catch (err) { this.els.searchResults.innerHTML = '<div class="search-results-empty">搜索失败</div>'; }
  },

  async searchBooks(query) {
    const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=8`;
    const resp = await fetch(url);
    const data = await resp.json();
    return (data.docs || []).slice(0, 6).map(doc => ({
      title: doc.title || '',
      author: (doc.author_name || []).join(', '),
      year: doc.first_publish_year || '',
      cover: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg` : '',
      olid: doc.key ? doc.key.replace('/works/', '') : null
    }));
  },

  async selectSearchResult(result) {
    this.els.searchResults.classList.remove('active');
    this.els.searchInput.value = '';
    this.showLoading();
    try {
      let description = '';
      if (result.olid) {
        try {
          const workResp = await fetch(`https://openlibrary.org/works/${result.olid}.json`);
          const workData = await workResp.json();
          description = (workData.description && typeof workData.description === 'object')
            ? (workData.description.value || '') : (workData.description || '');
          if (description && description.length > 500) description = description.substring(0, 500) + '…';
        } catch (e) {}
      }
      await DB.createEntry({
        folderId: this.currentFolderId, title: result.title, author: result.author || '',
        rating: 0, notes: description, imageUrl: '', coverUrl: result.cover || '',
        startedDate: null, finishedDate: null
      });
      this.loadEntries();
    } catch (err) { alert('创建失败：' + err.message + '\n\n如果提示字段不存在，请在 Supabase SQL Editor 执行 ALTER TABLE 添加新字段。'); }
    finally { this.hideLoading(); }
  },

  /* ==================== 档案袋条目列表 ==================== */
  async loadEntries() {
    this.showLoading();
    try {
      if (!this.currentFolderId) { this.hideLoading(); return; }
      const entries = await DB.getEntries(this.currentFolderId);
      this.els.entriesTitle.textContent = this.currentType === 'book' ? 'Books' : 'Movies';
      this.els.entriesList.innerHTML = '';
      if (entries.length === 0) {
        this.els.entriesList.style.display = 'none'; this.els.entriesEmpty.style.display = 'block';
        this.els.searchInput.placeholder = this.currentType === 'book' ? '搜索书籍...' : '搜索电影...';
        return;
      }
      this.els.entriesList.style.display = ''; this.els.entriesEmpty.style.display = 'none';
      entries.forEach(entry => {
        const coverUrl = entry.cover_url || entry.image_url || '';
        const card = document.createElement('div');
        card.className = 'archive-card';
        card.innerHTML = `
          <div class="archive-card-tab">${this.currentType === 'book' ? 'BOOK' : 'FILM'}</div>
          <div class="archive-card-cover">
            ${coverUrl ? `<img src="${this.esc(coverUrl)}" alt="" loading="lazy">` : '<div class="archive-card-cover-placeholder">📖</div>'}
          </div>
          <div class="archive-card-divider"></div>
          <div class="archive-card-info">
            <div class="archive-card-title">${this.esc(entry.title)}</div>
            ${entry.author ? `<div class="archive-card-author">${this.esc(entry.author)}</div>` : ''}
            <div class="archive-card-date">${this.fmtDate(entry.created_at)}</div>
            <div class="archive-card-rating">${this.renderStars(entry.rating)}</div>
          </div>
        `;
        card.addEventListener('click', () => this.navigateTo('entry-detail', entry.id));
        this.els.entriesList.appendChild(card);
      });
    } catch (err) { console.error(err); alert('加载失败：' + err.message); }
    finally { this.hideLoading(); }
  },

  /* ==================== 条目表单 ==================== */
  openEntryForm(entryId) { this.navigateTo('entry-detail', entryId); },

  async loadEntryForm(entryId) {
    this.resetEntryForm();
    if (entryId) {
      this.els.entryFormTitle.textContent = '编辑条目'; this.els.btnDeleteEntry.style.display = '';
      this.showLoading();
      try {
        const { data, error } = await supabaseClient.from('entries').select('*').eq('id', entryId).single();
        if (error) throw error;
        if (data) {
          this.els.entryTitle.value = data.title || '';
          this.els.entryAuthor.value = data.author || '';
          this.els.entryRating.value = data.rating || 0;
          this.els.entryNotes.value = data.notes || '';
          this.els.entryStarted.value = data.started_date || '';
          this.els.entryFinished.value = data.finished_date || '';
          this.setRating(data.rating || 0);
          const imgUrl = data.cover_url || data.image_url || '';
          if (imgUrl) { this.currentImagePath = imgUrl; this.els.imagePreview.style.display = 'block'; this.els.imagePreviewImg.src = imgUrl; this.els.imageUploadBtn.style.display = 'none'; }
        }
      } catch (err) { alert('加载失败：' + err.message); }
      finally { this.hideLoading(); }
    } else { this.els.entryFormTitle.textContent = '新建条目'; }
  },

  resetEntryForm() {
    this.els.entryForm.reset(); this.els.entryRating.value = '0'; this.setRating(0);
    this.currentImagePath = null; this.pendingImageFile = null;
    this.els.imagePreview.style.display = 'none'; this.els.imagePreviewImg.src = '';
    this.els.imageUploadBtn.style.display = ''; this.els.btnDeleteEntry.style.display = 'none';
    this.els.entryImageInput.value = '';
  },

  async handleEntrySubmit(e) {
    e.preventDefault();
    const title = this.els.entryTitle.value.trim();
    if (!title) return;
    this.showLoading();
    try {
      let coverUrl = this.currentImagePath || '', imageUrl = this.currentImagePath || '';
      if (this.pendingImageFile) {
        try { const r = await DB.uploadImage(this.pendingImageFile); imageUrl = DB.getImageUrl(r.path); coverUrl = imageUrl; }
        catch (u) { console.warn('图片上传跳过:', u); }
      }
      const d = {
        folderId: this.currentFolderId, title, author: this.els.entryAuthor.value.trim(),
        rating: parseInt(this.els.entryRating.value) || 0, notes: this.els.entryNotes.value || '',
        imageUrl, coverUrl, startedDate: this.els.entryStarted.value || null, finishedDate: this.els.entryFinished.value || null
      };
      if (this.currentEntryId) await DB.updateEntry(this.currentEntryId, d);
      else await DB.createEntry(d);
      this.navigateTo('entries', { folderId: this.currentFolderId, type: this.currentType });
    } catch (err) { alert('保存失败：' + err.message + '\n\n如需新字段请执行 ALTER TABLE 添加 author/cover_url/started_date/finished_date'); }
    finally { this.hideLoading(); }
  },

  async handleDeleteEntry() {
    if (!this.currentEntryId) return;
    if (!confirm('确定删除？')) return;
    this.showLoading();
    try { await DB.deleteEntry(this.currentEntryId); this.navigateTo('entries', { folderId: this.currentFolderId, type: this.currentType }); }
    catch (err) { alert('删除失败：' + err.message); }
    finally { this.hideLoading(); }
  },

  /* ==================== 星级 ==================== */
  setRating(r) {
    this.els.entryRating.value = r;
    this.els.starRating.querySelectorAll('span').forEach(s => { const v = parseInt(s.dataset.star); s.textContent = v <= r ? '★' : '☆'; s.classList.toggle('active', v <= r); });
  },
  renderStars(r) { let h = ''; for (let i = 1; i <= 5; i++) h += i <= r ? '<span>★</span>' : '<span class="empty">☆</span>'; return h; },

  /* ==================== 图片 ==================== */
  handleImageSelect(e) {
    const file = e.target.files[0]; if (!file) return;
    if (!file.type.startsWith('image/')) { alert('请选择图片文件'); return; }
    this.pendingImageFile = file; this.currentImagePath = null;
    const reader = new FileReader();
    reader.onload = ev => { this.els.imagePreview.style.display = 'block'; this.els.imagePreviewImg.src = ev.target.result; this.els.imageUploadBtn.style.display = 'none'; };
    reader.readAsDataURL(file);
  },
  clearImage() { this.pendingImageFile = null; this.currentImagePath = null; this.els.imagePreview.style.display = 'none'; this.els.imagePreviewImg.src = ''; this.els.imageUploadBtn.style.display = ''; this.els.entryImageInput.value = ''; },

  /* ==================== 工具 ==================== */
  showLoading() { this.els.loadingOverlay.style.display = 'flex'; },
  hideLoading() { this.els.loadingOverlay.style.display = 'none'; },
  esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; },
  fmtDate(d) { if (!d) return ''; return new Date(d).toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' }); }
};