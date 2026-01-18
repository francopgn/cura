// 🔥 Limpiar cualquier sesión previa de Coze
Object.keys(localStorage).forEach(k => {
  if (k.toLowerCase().includes('coze')) localStorage.removeItem(k);
});

Object.keys(sessionStorage).forEach(k => {
  if (k.toLowerCase().includes('coze')) sessionStorage.removeItem(k);
});

new CozeWebSDK.WebChatClient({
  /**
  * Agent or app settings
  * for agent
  * @param config.bot_id - Agent ID.
  * for app
  * @param config.type - To integrate a Coze app, you must set the value to app.
  * @param config.isIframe - Whether to use the iframe method to open the chat box
  * @param config.appInfo.appId - AI app ID.
  * @param config.appInfo.workflowId - Workflow or chatflow ID.
  */
  config: {
    type: 'bot',
    bot_id: '7596429833782214709',
    isIframe: false,
  },
  /**
  * The auth property is used to configure the authentication method.
  * @param type - Authentication method, default type is 'unauth', which means no authentication is required; it is recommended to set it to 'token', which means authentication is done through PAT (Personal Access Token) or OAuth.
  * @param token - When the type is set to 'token', you need to configure the PAT (Personal Access Token) or OAuth access key.
  * @param onRefreshToken - When the access key expires, a new key can be set as needed.
  */
auth: {
  type: "token",
  token: "",
  onRefreshToken: async () => {
    const res = await fetch("/api/coze-token");
    const data = await res.json();
    return data.token;
  }
},
  /**
  * The userInfo parameter is used to set the display of agent user information in the chat box.
  * @param userInfo.id - ID of the agent user.
  * @param userInfo.url - URL address of the user's avatar.
  * @param userInfo.nickname - Nickname of the agent user.
  */
  userInfo: {
          id: 'user_' + Math.random().toString(36).slice(2),
          url: '/user_icon.png',
          nickname: 'User',
  },
  ui: {
    /**
    * The ui.base parameter is used to add the overall UI effect of the chat window.
    * @param base.icon - Application icon URL.
    * @param base.layout - Layout style of the agent chat box window, which can be set as 'pc' or'mobile'.
    * @param base.lang - System language of the agent, which can be set as 'en' or 'zh-CN'.
    * @param base.zIndex - The z-index of the chat box.
    */
    base: {
      icon: 'https://sf-coze-web-cdn.coze.com/obj/eden-sg/lm-lgvj/ljhwZthlaukjlkulzlp/coze/chatsdk-logo.png',
      layout: 'pc',
      lang: 'en',
      zIndex: 1000
    },
    /**
    * Controls whether to display the top title bar and the close button
    * @param header.isShow - Whether to display the top title bar.
    * @param header.isNeedClose - Whether to display the close button.
    */
    header: {
      isShow: true,
      isNeedClose: true,
    },
    /**
    * Controls whether to display the floating ball at the bottom right corner of the page.
    */
    asstBtn: {
      isNeed: true
    },
    /**
    * The ui.footer parameter is used to add the footer of the chat window.
    * @param footer.isShow - Whether to display the bottom copy module.
    * @param footer.expressionText - The text information displayed at the bottom.
    * @param footer.linkvars - The link copy and link address in the footer.
    */
    footer: {
      isShow: false,
      expressionText: 'Powered by ...',
    },
    /**
    * Control the UI and basic capabilities of the chat box.
    * @param chatBot.title - The title of the chatbox
    * @param chatBot.uploadable - Whether file uploading is supported.
    * @param chatBot.width - The width of the agent window on PC is measured in px, default is 460.
    * @param chatBot.el - Container for setting the placement of the chat box (Element).
    */
    chatBot: {
         title: 'Asistente Virtual Ley C.U.R.A.',
      uploadable: false,
      width: 390,
      isNeedAudio: false,
    },
  },
});
