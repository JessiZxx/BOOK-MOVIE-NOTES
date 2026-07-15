/* ============================================================
   app.js - 应用入口与初始化
   ============================================================ */

const App = {
  async init() {
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