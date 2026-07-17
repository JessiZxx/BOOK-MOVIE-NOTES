/* ============================================================
   app.js - 应用入口与初始化
   ============================================================ */

const App = {
  async init() {
    console.log('[书影] 版本 v=5 已加载');
    // 检查 Supabase 是否加载成功
    if (typeof supabaseClient === 'undefined') {
      console.error('Supabase 客户端加载失败，请检查网络连接');
      document.body.innerHTML = '<div style="padding:40px;text-align:center;font-family:sans-serif;"><h2>加载失败</h2><p>无法连接到 Supabase，请检查网络连接后刷新页面。</p></div>';
      return;
    }

    // 初始化各模块
    Auth.init(supabaseClient);
    DB.init(supabaseClient);
    UI.init();

    // 监听认证状态变化
    Auth.onAuthChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        UI.showAuth();
      } else if (event === 'SIGNED_IN' && session) {
        UI.showApp(session.user.email);
      }
    });

    // 检查会话状态
    const session = await Auth.getSession();
    if (session) {
      UI.showApp(session.user.email);
    } else {
      UI.showAuth();
    }
  },

  async logout() {
    UI.showLoading();
    await Auth.signOut();
    UI.hideLoading();
    UI.showAuth();
  }
};

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});