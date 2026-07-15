/* ============================================================
   auth.js - 用户认证模块
   ============================================================ */

const Auth = {
  client: null,

  init(client) {
    this.client = client;
  },

  /** 检查当前会话 */
  async getSession() {
    const { data, error } = await this.client.auth.getSession();
    if (error) return null;
    return data.session;
  },

  /** 注册 */
  async signUp(email, password) {
    const { data, error } = await this.client.auth.signUp({
      email,
      password
    });
    if (error) return { error };
    return { data };
  },

  /** 登录 */
  async signIn(email, password) {
    const { data, error } = await this.client.auth.signInWithPassword({
      email,
      password
    });
    if (error) return { error };
    return { data };
  },

  /** 退出 */
  async signOut() {
    const { error } = await this.client.auth.signOut();
    return { error };
  },

  /** 获取当前用户 */
  getUser() {
    return this.client.auth.getUser();
  },

  /** 监听认证状态变化 */
  onAuthChange(callback) {
    this.client.auth.onAuthStateChange((event, session) => {
      callback(event, session);
    });
  }
};