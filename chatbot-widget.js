(function () {
  "use strict";

  class LeyCuraChatbot {
    constructor() {
      this.isOpen = false;
      this.isLoading = false;
      this.history = []; 
      this.init();
    }

    init() {
      this.injectStyles();
      this.createButton();
      this.createChatWindow();
      this.bindEvents();
      console.log("🤖 LeyCura Chatbot: Estética C.U.R.A. aplicada");
    }

    injectStyles() {
      const css = `
      :root {
        --cura-primary: #004E85;
        --cura-primary-dark: #00345C;
        --cura-accent: #00C2FF;
        --cura-accent-light: #59D2FF;
      }

      .leycura-chat-btn {
        position: fixed !important;
        bottom: 24px;
        right: 24px;
        width: 56px;
        height: 56px;
        border-radius: 50%;
        background: var(--cura-primary);
        border: 2px solid var(--cura-accent);
        color: #fff;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        box-shadow: 0 10px 25px rgba(0,78,133,0.4);
        z-index: 2147483647;
        transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      }

      .leycura-chat-btn:hover { transform: scale(1.1); }
      .leycura-chat-btn i { font-size: 24px; }

      .leycura-chat-window {
        position: fixed !important;
        bottom: 96px;
        right: 24px;
        width: 360px;
        height: 500px;
        background: #ffffff;
        border-radius: 20px;
        box-shadow: 0 15px 50px rgba(0,0,0,0.2);
        z-index: 2147483646;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        transform: translateY(30px) scale(0.95);
        opacity: 0;
        visibility: hidden;
        transition: all 0.3s ease;
        border: 1px solid rgba(0,194,255,0.2);
        font-family: 'Inter', system-ui, sans-serif;
      }

      .leycura-chat-window.open {
        transform: translateY(0) scale(1);
        opacity: 1;
        visibility: visible;
        pointer-events: auto;
      }

      .leycura-chat-header {
        background: var(--cura-primary);
        color: #fff;
        padding: 16px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-shrink: 0;
      }

      .leycura-header-info { display: flex; align-items: center; gap: 8px; }
      .leycura-status-dot {
        width: 8px;
        height: 8px;
        background: #4ade80;
        border-radius: 50%;
        box-shadow: 0 0 8px #4ade80;
        animation: pulse 2s infinite;
      }

      @keyframes pulse { 
        0% { transform: scale(1); opacity: 1; } 
        50% { transform: scale(1.2); opacity: 0.7; } 
        100% { transform: scale(1); opacity: 1; } 
      }

      .leycura-chat-close {
        background: none;
        border: none;
        color: #fff;
        cursor: pointer;
        font-size: 20px;
        opacity: 0.8;
        transition: opacity 0.2s;
      }

      .leycura-chat-messages {
        flex: 1;
        padding: 16px;
        overflow-y: auto;
        overflow-x: hidden !important;
        background: #F8FAFC;
        display: flex;
        flex-direction: column;
        gap: 12px;
        scrollbar-width: thin;
        scrollbar-color: var(--cura-primary) transparent;
      }
      
.leycura-message b {
        color: var(--cura-primary-dark);
        font-weight: 700;
      }
      
      .leycura-message {
        max-width: 85%;
        padding: 12px 16px;
        font-size: 14px;
        line-height: 1.5;
        border-radius: 18px;
        word-wrap: break-word;
      }

      .leycura-message.user {
        background: var(--cura-primary);
        color: #ffffff;
        margin-left: auto;
        border-bottom-right-radius: 4px;
      }

      .leycura-message.bot {
        background: #ffffff;
        border: 1px solid rgba(0,194,255,0.15);
        color: var(--cura-primary-dark);
        margin-right: auto;
        border-bottom-left-radius: 4px;
      }

      .leycura-chat-input-area {
        padding: 12px;
        background: #ffffff;
        border-top: 1px solid #E5E7EB;
        display: flex;
        gap: 8px;
        align-items: center;
      }

      .leycura-chat-input {
        flex: 1;
        padding: 10px 16px;
        border: 1px solid #D1D5DB;
        border-radius: 12px;
        font-size: 14px;
        outline: none;
        color: #111827;
      }

      .leycura-chat-send {
        background: var(--cura-primary);
        color: #ffffff;
        border: none;
        border-radius: 12px;
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
      }

      .leycura-typing {
        font-size: 12px;
        color: #64748b;
        font-style: italic;
        padding: 8px 12px;
        background: rgba(0, 194, 255, 0.05);
        border-radius: 12px;
        border-bottom-left-radius: 2px;
        width: fit-content;
        max-width: 100%;
        margin-bottom: 8px;
        animation: pulse-simple 1.5s infinite;
      }

      @keyframes pulse-simple {
        0% { opacity: 0.5; }
        50% { opacity: 1; }
        100% { opacity: 0.5; }
      }
      `;
      const style = document.createElement("style");
      style.textContent = css;
      document.head.appendChild(style);
    }

    createButton() {
      this.button = document.createElement("button");
      this.button.className = "leycura-chat-btn";
      this.button.innerHTML = '<i class="ph-bold ph-chats-teardrop"></i>';
      document.body.appendChild(this.button);
    }

    createChatWindow() {
      this.chatWindow = document.createElement("div");
      this.chatWindow.className = "leycura-chat-window";
      this.chatWindow.setAttribute("data-lenis-prevent", "");

      this.chatWindow.innerHTML = `
        <div class="leycura-chat-header">
          <div class="leycura-header-info">
            <div class="leycura-status-dot"></div>
            <span style="font-size: 14px; font-weight: 700;">Asistente Ley C.U.R.A.</span>
          </div>
          <button class="leycura-chat-close"><i class="ph-bold ph-x"></i></button>
        </div>
        <div class="leycura-chat-messages" id="leycuraMessages">
          <div class="leycura-message bot shadow-sm">
            ¡Hola! Soy tu asistente virtual. ¿Qué duda tenés sobre la <b>Ley C.U.R.A.</b>?
          </div>
        </div>
        <div class="leycura-chat-input-area">
          <input class="leycura-chat-input" id="leycuraInput" placeholder="Escribí tu consulta..." autocomplete="off" />
          <button class="leycura-chat-send" id="leycuraSend"><i class="ph-bold ph-paper-plane-right"></i></button>
        </div>
      `;

      document.body.appendChild(this.chatWindow);
      this.messagesEl = document.getElementById("leycuraMessages");
      this.inputEl = document.getElementById("leycuraInput");
      this.sendBtn = document.getElementById("leycuraSend");
      this.closeBtn = this.chatWindow.querySelector(".leycura-chat-close");
    }

    bindEvents() {
      this.button.addEventListener("click", () => this.toggleChat());
      this.closeBtn.addEventListener("click", () => this.closeChat());
      this.sendBtn.addEventListener("click", () => this.sendMessage());
      this.inputEl.addEventListener("keydown", (e) => {
        if (e.key === "Enter") this.sendMessage();
      });
    }

    toggleChat() {
      this.isOpen = !this.isOpen;
      this.chatWindow.classList.toggle("open", this.isOpen);
      if (this.isOpen) setTimeout(() => this.inputEl.focus(), 300);
    }

    closeChat() {
      this.isOpen = false;
      this.chatWindow.classList.remove("open");
    }

    async sendMessage() {
      const message = this.inputEl.value.trim();
      if (!message || this.isLoading) return;

      this.addMessage(message, "user");
      this.inputEl.value = "";
      this.isLoading = true;

      this.typingEl = document.createElement("div");
      this.typingEl.className = "leycura-typing";
      this.typingEl.textContent = "El asistente está pensando...";
      this.messagesEl.appendChild(this.typingEl);
      this.scrollToBottom();

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message, history: this.history }),
        });

        const data = await res.json();
        if (this.typingEl) this.typingEl.remove();

        if (data.answer) {
          this.addMessage(data.answer, "bot");
        } else {
          this.addMessage("Recibí tu consulta. Estamos procesando los detalles técnicos del proyecto.", "bot");
        }
      } catch (e) {
        if (this.typingEl) this.typingEl.remove();
        this.addMessage("Perdón, tuve un problema de conexión. ¿Podés intentar de nuevo?", "bot");
      } finally {
        this.isLoading = false;
        this.scrollToBottom();
      }
    }

addMessage(text, type) {
      const div = document.createElement("div");
      div.className = `leycura-message ${type}`;

      // Procesamiento de Markdown mejorado
      let html = text
        // 1. Negritas principales (doble asterisco)
        .replace(/\*\*(.*?)\*\*/g, '<b class="font-bold">$1</b>')
        
        // 2. Énfasis / Términos destacados (asterisco simple) 
        // Los ponemos en un gris oscuro azulado y semibold
        .replace(/\*(.*?)\*/g, '<span style="color: #334155; font-weight: 600;">$1</span>')
        
        // 3. Listas con guiones o asteriscos al inicio de línea
        .replace(/\n[-*]\s?/g, "<br>• ")
        
        // 4. Saltos de línea simples
        .replace(/\n/g, "<br>");

      div.innerHTML = html;
      this.messagesEl.appendChild(div);

      // Guardar en historial
      this.history.push({
        role: type === "user" ? "user" : "assistant",
        content: text
      });
      if (this.history.length > 6) this.history.shift();

      this.scrollToBottom();
    }

    scrollToBottom() {
      this.messagesEl.scrollTo({
        top: this.messagesEl.scrollHeight,
        behavior: 'smooth'
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => new LeyCuraChatbot());
  } else {
    new LeyCuraChatbot();
  }
})();
