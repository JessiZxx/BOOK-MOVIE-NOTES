/* ============================================================
   ui.js - UI 渲染与事件处理模块
   ============================================================ */

const UI = {
  /* ==================== 状态 ==================== */
  currentView: 'dashboard',   // dashboard | folders | entries | entry-detail
  currentType: null,          // 'book' | 'movie'
  currentFolderId: null,
  currentEntryId: null,
  currentImagePath: null,     // 已有图片的 Storage 路径
  pendingImageFile: null,     // 待上传的新图片文件

  /* ==================== DOM 引用 ==================== */
  els: {},

  init() {
    this.cacheDOM();
    this.bindEvents();
  },

  cacheDOM() {
    const qs = (sel) => document.querySelector(sel);
    this.els = {
      authView:         qs('#auth-view'),
      appView:          qs('#app-view'),
      loginForm:        qs('#login-form'),
      registerForm:     qs('#register-form'),
      authMessage:      qs('#auth-message'),
      userEmail:        qs('#user-email'),
      btnLogout:        qs('#btn-logout'),
      btnBack:          qs('#btn-back'),
      headerTitle:      qs('#header-title'),

      dashboardView:    qs('#dashboard-view'),
      foldersView:      qs('#folders-view'),
      foldersTitle:     qs('#folders-title'),
      foldersList:      qs('#folders-list'),
      foldersEmpty:     qs('#folders-empty'),

      entriesView:      qs('#entries-view'),
      entriesTitle:     qs('#entries-title'),
      entriesList:      qs('#entries-list'),
      entriesEmpty:     qs('#entries-empty'),

      entryDetailView:  qs('#entry-detail-view'),
      entryForm:        qs('#entry-form'),
      entryTitle:       qs('#entry-title'),
      entryRating:      qs('#entry-rating'),
      entryNotes:       qs('#entry-notes'),
      starRating:       qs('#star-rating'),
      imagePreview:     qs('#image-preview'),
      imagePreviewImg:  qs('#image-preview-img'),
      imageUploadBtn:   qs('#image-upload-btn'),
      entryImageInput:  qs('#entry-image-input'),
      btnRemoveImg:     qs('#btn-remove-img'),
      btnDeleteEntry:   qs('#btn-delete-entry'),

      folderModal:      qs('#folder-modal'),
      folderForm:       qs('#folder-form'),
      folderName:       qs('#folder-name'),
      folderId:         qs('#folder-id'),
      folderModalTitle: qs('#folder-modal-title'),

      btnAddFolder:     qs('#btn-add-folder'),
      btnAddEntry:      qs('#btn-add-entry'),
      btnCancelFolder:  qs('#btn-cancel-folder'),
      loadingOverlay:   qs('#loading-overlay'),
    };
  },

  bindEvents() {
    // 认证
    this.els.loginForm.addEventListener('submit', (e) => this.handleLogin(e));
    this.els.registerForm.addEventListener('submit', (e) => this.handleRegister(e));
    this.els.btnLogout.addEventListener('click', () => App.logout());

    // 切换登录/注册
    qs('#switch-to-register').addEventListener('click', () => this.showRegisterForm());
    qs('#switch-to-login').addEventListener('click', () => this.showLoginForm());

    // 导航
    this.els.btnBack.addEventListener('click', () => this.goBack());

    // 仪表盘
    document.querySelectorAll('.dashboard-card').forEach(card => {
      card.addEventListener('click', () => {
        const type = card.dataset.type;
        this.navigateTo('folders', type);
      });
    });

    // 文件夹
    this.els.btnAddFolder.addEventListener('click', () => this.openFolderModal());
    this.els.folderForm.addEventListener('submit', (e) => this.handleFolderSubmit(e));
    this.els.btnCancelFolder.addEventListener('click', () => this.closeFolderModal());

    // 条目
    this.els.btnAddEntry.addEventListener('click', () => this.openEntryForm(null));
    this.els.entryForm.addEventListener('submit', (e) => this.handleEntrySubmit(e));
    this.els.btnDeleteEntry.addEventListener('click', () => this.handleDeleteEntry());

    // 星级评分
    this.els.starRating.addEventListener('click', (e) => {
      if (e.target.dataset.star) {
        this.setRating(parseInt(e.target.dataset.star));
      }
    });

    // 图片上传
    this.els.entryImageInput.addEventListener('change', (e) => this.handleImageSelect(e));
    this.els.btnRemoveImg.addEventListener('click', () => this.clearImage());
  },

  /* ==================== 视图导航 ==================== */

  showView(viewName) {
    this.currentView = viewName;

    // 隐藏所有子视图
    document.querySelectorAll('.subview').forEach(el => el.classList.remove('active'));

    // 显示对应子视图
    const viewMap = {
      dashboard:    this.els.dashboardView,
      folders:      this.els.foldersView,
      entries:      this.els.entriesView,
      'entry-detail': this.els.entryDetailView
    };
    if (viewMap[viewName]) viewMap[viewName].classList.add('active');

    // 返回按钮
    this.els.btnBack.style.display = viewName === 'dashboard' ? 'none' : 'inline-flex';

    // 标题
    const titles = {
      dashboard: '我的记录',
      folders:   this.currentType === 'book' ? 'Books - 文件夹' : 'Movies - 文件夹',
      entries:   '条目',
      'entry-detail': this.currentEntryId ? '编辑条目' : '新建条目'
    };
    this.els.headerTitle.textContent = titles[viewName] || '';
  },

  navigateTo(view, param) {
    if (view === 'folders') {
      this.currentType = param;
      this.currentFolderId = null;
      this.currentEntryId = null;
      this.showView('folders');
      this.loadFolders();
    } else if (view === 'entries') {
      this.currentFolderId = param;
      this.currentEntryId = null;
      this.showView('entries');
      this.loadEntries();
    } else if (view === 'dashboard') {
      this.currentType = null;
      this.currentFolderId = null;
      this.currentEntryId = null;
      this.showView('dashboard');
    } else if (view === 'entry-detail') {
      this.currentEntryId = param;
      this.showView('entry-detail');
      this.loadEntryForm(param);
    }
  },

  goBack() {
    if (this.currentView === 'entry-detail') {
      this.navigateTo('entries', this.currentFolderId);
    } else if (this.currentView === 'entries') {
      this.navigateTo('folders', this.currentType);
    } else if (this.currentView === 'folders') {
      this.navigateTo('dashboard');
    }
  },

  /* ==================== 认证 UI ==================== */

  showLoginForm() {
    this.els.loginForm.style.display = 'block';
    this.els.registerForm.style.display = 'none';
    this.clearAuthMessage();
  },

  showRegisterForm() {
    this.els.loginForm.style.display = 'none';
    this.els.registerForm.style.display = 'block';
    this.clearAuthMessage();
  },

  showAuthMessage(msg, type) {
    this.els.authMessage.textContent = msg;
    this.els.authMessage.className = 'auth-message ' + type;
  },

  clearAuthMessage() {
    this.els.authMessage.textContent = '';
    this.els.authMessage.className = 'auth-message';
  },

  showApp(email) {
    this.els.authView.classList.remove('active');
    this.els.appView.classList.add('active');
    this.els.userEmail.textContent = email;
    this.navigateTo('dashboard');
  },

  showAuth() {
    this.els.appView.classList.remove('active');
    this.els.authView.classList.add('active');
    this.showLoginForm();
    this.els.loginForm.reset();
    this.els.registerForm.reset();
  },

  /* ==================== 认证处理 ==================== */

  async handleLogin(e) {
    e.preventDefault();
    const email = this.els.loginForm.querySelector('#login-email').value.trim();
    const password = this.els.loginForm.querySelector('#login-password').value;
    if (!email || !password) {
      this.showAuthMessage('请填写邮箱和密码', 'error');
      return;
    }
    this.showLoading();
    const result = await Auth.signIn(email, password);
    this.hideLoading();
    if (result.error) {
      this.showAuthMessage(result.error.message || '登录失败', 'error');
    } else {
      this.showApp(email);
    }
  },

  async handleRegister(e) {
    e.preventDefault();
    const email = this.els.registerForm.querySelector('#register-email').value.trim();
    const password = this.els.registerForm.querySelector('#register-password').value;
    if (!email || !password) {
      this.showAuthMessage('请填写邮箱和密码', 'error');
      return;
    }
    if (password.length < 6) {
      this.showAuthMessage('密码至少需要6位', 'error');
      return;
    }
    this.showLoading();
    const result = await Auth.signUp(email, password);
    this.hideLoading();
    if (result.error) {
      this.showAuthMessage(result.error.message || '注册失败', 'error');
    } else {
      this.showAuthMessage('注册成功！请查收邮箱确认链接（如已开启邮箱确认），或直接登录。', 'success');
      setTimeout(() => this.showLoginForm(), 2000);
    }
  },

  /* ==================== 文件夹 UI ==================== */

  async loadFolders() {
    this.showLoading();
    try {
      const folders = await DB.getFolders(this.currentType);
      this.els.foldersTitle.textContent = this.currentType === 'book' ? 'Books - 文件夹' : 'Movies - 文件夹';
      this.els.foldersList.innerHTML = '';

      if (folders.length === 0) {
        this.els.foldersList.style.display = 'none';
        this.els.foldersEmpty.style.display = 'block';
        return;
      }

      this.els.foldersList.style.display = '';
      this.els.foldersEmpty.style.display = 'none';

      folders.forEach(folder => {
        const card = document.createElement('div');
        card.className = 'folder-card';
        card.innerHTML = `
          <span class="folder-card-name">${this.escapeHtml(folder.name)}</span>
          <div class="folder-card-actions">
            <button class="btn btn-icon edit-folder" data-id="${folder.id}" data-name="${this.escapeHtml(folder.name)}" title="编辑">✎</button>
            <button class="btn btn-icon delete-folder" data-id="${folder.id}" title="删除">✕</button>
          </div>
        `;

        card.querySelector('.folder-card-name').addEventListener('click', () => {
          this.navigateTo('entries', folder.id);
        });

        card.querySelector('.edit-folder').addEventListener('click', (e) => {
          e.stopPropagation();
          this.openFolderModal(folder.id, folder.name);
        });

        card.querySelector('.delete-folder').addEventListener('click', (e) => {
          e.stopPropagation();
          this.handleDeleteFolder(folder.id, folder.name);
        });

        this.els.foldersList.appendChild(card);
      });
    } catch (err) {
      console.error('加载文件夹失败:', err);
      alert('加载文件夹失败：' + err.message);
    } finally {
      this.hideLoading();
    }
  },

  openFolderModal(id, name) {
    this.els.folderModalTitle.textContent = id ? '编辑文件夹' : '新建文件夹';
    this.els.folderName.value = name || '';
    this.els.folderId.value = id || '';
    this.els.folderModal.classList.add('active');
    this.els.folderName.focus();
  },

  closeFolderModal() {
    this.els.folderModal.classList.remove('active');
    this.els.folderForm.reset();
    this.els.folderId.value = '';
  },

  async handleFolderSubmit(e) {
    e.preventDefault();
    const name = this.els.folderName.value.trim();
    const id = this.els.folderId.value;

    if (!name) return;

    this.showLoading();
    try {
      if (id) {
        await DB.updateFolder(id, name);
      } else {
        await DB.createFolder(name, this.currentType);
      }
      this.closeFolderModal();
      this.loadFolders();
    } catch (err) {
      console.error('保存文件夹失败:', err);
      alert('保存失败：' + err.message);
    } finally {
      this.hideLoading();
    }
  },

  async handleDeleteFolder(id, name) {
    if (!confirm(`确定删除文件夹「${name}」及其所有条目？`)) return;
    this.showLoading();
    try {
      await DB.deleteFolder(id);
      this.loadFolders();
    } catch (err) {
      console.error('删除文件夹失败:', err);
      alert('删除失败：' + err.message);
    } finally {
      this.hideLoading();
    }
  },

  /* ==================== 条目列表 UI ==================== */

  async loadEntries() {
    this.showLoading();
    try {
      const entries = await DB.getEntries(this.currentFolderId);
      this.els.entriesTitle.textContent = '条目';
      this.els.entriesList.innerHTML = '';

      if (entries.length === 0) {
        this.els.entriesList.style.display = 'none';
        this.els.entriesEmpty.style.display = 'block';
        return;
      }

      this.els.entriesList.style.display = '';
      this.els.entriesEmpty.style.display = 'none';

      entries.forEach(entry => {
        const card = document.createElement('div');
        card.className = 'entry-card';

        const imgHtml = entry.image_url
          ? `<img class="entry-card-img" src="${this.escapeHtml(entry.image_url)}" alt="${this.escapeHtml(entry.title)}" loading="lazy">`
          : '';

        const stars = this.renderStars(entry.rating);

        card.innerHTML = `
          ${imgHtml}
          <div class="entry-card-body">
            <div class="entry-card-title">${this.escapeHtml(entry.title)}</div>
            <div class="entry-card-rating">${stars}</div>
          </div>
        `;

        card.addEventListener('click', () => {
          this.navigateTo('entry-detail', entry.id);
        });

        this.els.entriesList.appendChild(card);
      });
    } catch (err) {
      console.error('加载条目失败:', err);
      alert('加载条目失败：' + err.message);
    } finally {
      this.hideLoading();
    }
  },

  /* ==================== 条目表单 UI ==================== */

  async loadEntryForm(entryId) {
    this.resetEntryForm();

    if (entryId) {
      this.els.btnDeleteEntry.style.display = '';
      this.showLoading();
      try {
        const { data, error } = await supabaseClient
          .from('entries')
          .select('*')
          .eq('id', entryId)
          .single();
        if (error) throw error;
        if (data) {
          this.els.entryTitle.value = data.title;
          this.els.entryRating.value = data.rating || 0;
          this.els.entryNotes.value = data.notes || '';
          this.setRating(data.rating || 0);
          if (data.image_url) {
            this.currentImagePath = data.image_url;
            this.els.imagePreview.style.display = 'block';
            this.els.imagePreviewImg.src = data.image_url;
            this.els.imageUploadBtn.style.display = 'none';
          }
        }
      } catch (err) {
        console.error('加载条目失败:', err);
        alert('加载条目失败：' + err.message);
      } finally {
        this.hideLoading();
      }
    }
  },

  resetEntryForm() {
    this.els.entryForm.reset();
    this.els.entryRating.value = '0';
    this.setRating(0);
    this.currentImagePath = null;
    this.pendingImageFile = null;
    this.els.imagePreview.style.display = 'none';
    this.els.imagePreviewImg.src = '';
    this.els.imageUploadBtn.style.display = '';
    this.els.btnDeleteEntry.style.display = 'none';
    this.els.entryImageInput.value = '';
  },

  async handleEntrySubmit(e) {
    e.preventDefault();
    const title = this.els.entryTitle.value.trim();
    if (!title) return;

    this.showLoading();
    try {
      let imageUrl = this.currentImagePath || '';

      // 如果有新图片需要上传
      if (this.pendingImageFile) {
        const uploadResult = await DB.uploadImage(this.pendingImageFile);
        imageUrl = DB.getImageUrl(uploadResult.path);
      }

      const entryData = {
        folderId: this.currentFolderId,
        title: title,
        rating: parseInt(this.els.entryRating.value) || 0,
        notes: this.els.entryNotes.value || '',
        imageUrl: imageUrl
      };

      if (this.currentEntryId) {
        await DB.updateEntry(this.currentEntryId, entryData);
      } else {
        await DB.createEntry(entryData);
      }

      this.navigateTo('entries', this.currentFolderId);
    } catch (err) {
      console.error('保存条目失败:', err);
      alert('保存失败：' + err.message);
    } finally {
      this.hideLoading();
    }
  },

  async handleDeleteEntry() {
    if (!this.currentEntryId) return;
    if (!confirm('确定删除此条目？')) return;

    this.showLoading();
    try {
      await DB.deleteEntry(this.currentEntryId);
      this.navigateTo('entries', this.currentFolderId);
    } catch (err) {
      console.error('删除条目失败:', err);
      alert('删除失败：' + err.message);
    } finally {
      this.hideLoading();
    }
  },

  /* ==================== 星级评分 ==================== */

  setRating(rating) {
    this.els.entryRating.value = rating;
    const stars = this.els.starRating.querySelectorAll('span');
    stars.forEach(star => {
      const val = parseInt(star.dataset.star);
      star.textContent = val <= rating ? '★' : '☆';
      star.classList.toggle('active', val <= rating);
    });
  },

  renderStars(rating) {
    let html = '';
    for (let i = 1; i <= 5; i++) {
      if (i <= rating) {
        html += '<span>★</span>';
      } else {
        html += '<span class="empty">☆</span>';
      }
    }
    return html;
  },

  /* ==================== 图片上传 ==================== */

  handleImageSelect(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('请选择图片文件');
      return;
    }

    this.pendingImageFile = file;
    this.currentImagePath = null;

    const reader = new FileReader();
    reader.onload = (ev) => {
      this.els.imagePreview.style.display = 'block';
      this.els.imagePreviewImg.src = ev.target.result;
      this.els.imageUploadBtn.style.display = 'none';
    };
    reader.readAsDataURL(file);
  },

  clearImage() {
    this.pendingImageFile = null;
    this.currentImagePath = null;
    this.els.imagePreview.style.display = 'none';
    this.els.imagePreviewImg.src = '';
    this.els.imageUploadBtn.style.display = '';
    this.els.entryImageInput.value = '';
  },

  /* ==================== 工具函数 ==================== */

  showLoading() {
    this.els.loadingOverlay.style.display = 'flex';
  },

  hideLoading() {
    this.els.loadingOverlay.style.display = 'none';
  },

  escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
};

// 快捷函数
function qs(sel) {
  return document.querySelector(sel);
}