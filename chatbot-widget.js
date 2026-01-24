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
      
      this.renderInitialSuggestions();
      console.log("🤖 LeyCura Chatbot: Estética de IA y optimización móvil aplicada");
    }

    injectStyles() {
      const css = `
      /* ✅ Evita el desplazamiento horizontal en toda la web */
      html, body {
        max-width: 100vw;
        overflow-x: hidden;
      }

      :root {
        --cura-primary: #004E85;
        --cura-primary-dark: #00345C;
        --cura-accent: #00C2FF;
        --cura-accent-light: #59D2FF;
      }

      /* ✅ BOTÓN TIPO PÍLDORA CON IDENTIDAD DE IA */
      .leycura-chat-btn {
        position: fixed !important;
        bottom: 24px;
        right: 24px;
        padding: 0 20px;
        height: 52px;
        border-radius: 26px;
        background: var(--cura-primary);
        border: 2px solid var(--cura-accent);
        color: #fff;
        display: flex;
        align-items: center;
        gap: 10px;
        cursor: pointer;
        box-shadow: 0 8px 20px rgba(0,78,133,0.4);
        z-index: 2147483647;
        transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        font-family: 'Inter', sans-serif;
        left: auto !important;
      }

      .leycura-chat-btn:hover {
        transform: scale(1.05);
        background: var(--cura-primary-dark);
        box-shadow: 0 12px 28px rgba(0,78,133,0.5);
      }

      .leycura-chat-btn i {
        font-size: 20px;
        color: var(--cura-accent);
        animation: sparkle-glow 2s infinite;
      }

      .leycura-btn-text {
        font-size: 14px;
        font-weight: 700;
        letter-spacing: 0.5px;
        white-space: nowrap;
      }

      @keyframes sparkle-glow {
        0%, 100% { filter: drop-shadow(0 0 2px var(--cura-accent)); transform: scale(1); }
        50% { filter: drop-shadow(0 0 8px var(--cura-accent-light)); transform: scale(1.1); }
      }

      /* ✅ VENTANA DE CHAT */
      .leycura-chat-window {
        position: fixed !important;
        bottom: 85px;
        right: 24px;
        width: 360px;
        max-width: calc(100vw - 48px);
        height: 550px;
        max-height: 70vh;
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

      .leycura-suggestions-wrapper {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-top: 4px;
        margin-bottom: 12px;
      }

      .leycura-suggestion-btn {
        background: #ffffff;
        border: 1px solid var(--cura-accent);
        color: var(--cura-primary);
        padding: 8px 14px;
        border-radius: 99px;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
        text-align: left;
      }

      .leycura-suggestion-btn:hover {
        background: var(--cura-accent);
        color: white;
        transform: translateY(-2px);
      }

      .leycura-chat-input-area {
        padding: 12px;
        background: #ffffff;
        border-top: 1px solid #E5E7EB;
        display: flex;
        gap: 8px;
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

      .leycura-typing {
        font-size: 12px;
        color: #64748b;
        font-style: italic;
        padding: 8px 12px;
        background: rgba(0, 194, 255, 0.05);
        border-radius: 12px;
        width: fit-content;
        animation: pulse-simple 1.5s infinite;
      }

      @keyframes pulse-simple {
        0%, 100% { opacity: 0.5; }
        50% { opacity: 1; }
      }

      /* ✅ RESPONSIVO CELULARES */
      @media (max-width: 480px) {
        .leycura-chat-btn {
          bottom: 20px;
          right: 15px;
          padding: 0 15px;
          height: 48px;
        }
        .leycura-btn-text { font-size: 13px; }
        .leycura-chat-window {
          right: 15px;
          bottom: 80px;
          width: calc(100vw - 30px);
        }
      }
      `;
      const style = document.createElement("style");
      style.textContent = css;
      document.head.appendChild(style);
    }

    createButton() {
      this.button = document.createElement("button");
      this.button.className = "leycura-chat-btn";
      this.button.innerHTML = `
        <i class="ph-bold ph-sparkle"></i>
        <span class="leycura-btn-text">Chat con IA</span>
      `;
      document.body.appendChild(this.button);
    }

    createChatWindow() {
      this.chatWindow = document.createElement("div");
      this.chatWindow.className = "leycura-chat-window";
      this.chatWindow.setAttribute("data-lenis-prevent", "");

      this.chatWindow.innerHTML = `
        <div class="leycura-chat-header">
          <div style="display: flex; align-items: center; gap: 8px;">
            <div style="width: 8px; height: 8px; background: #4ade80; border-radius: 50%;"></div>
            <span style="font-size: 14px; font-weight: 700;">Asistente Ley C.U.R.A.</span>
          </div>
          <button class="leycura-chat-close"><i class="ph-bold ph-x"></i></button>
        </div>
        <div class="leycura-chat-messages" id="leycuraMessages">
          <div class="leycura-message bot shadow-sm">
            ¡Hola! Soy tu asistente virtual inteligente. Podés elegir una de estas preguntas o escribir la tuya:
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

    addSuggestions(list) {
      const wrapper = document.createElement("div");
      wrapper.className = "leycura-suggestions-wrapper";
      
      list.forEach(text => {
        const btn = document.createElement("button");
        btn.className = "leycura-suggestion-btn";
        btn.textContent = text;
        btn.onclick = () => {
          this.inputEl.value = text;
          this.sendMessage();
        };
        wrapper.appendChild(btn);
      });

      this.messagesEl.appendChild(wrapper);
      this.scrollToBottom();
    }

    renderInitialSuggestions() {
      const initial = [
        "¿Qué es la ley C.U.R.A.?",
        "¿Cuáles son las fuentes de financiación?",
        "¿Cómo garantiza la protección de datos?",
        "¿Cuáles son los pilares fundamentales?"
      ];
      this.addSuggestions(initial);
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
    /*  if (this.isOpen) setTimeout(() => this.inputEl.focus(), 300); */
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
          if (data.suggestions && data.suggestions.length > 0) {
            setTimeout(() => {
              this.addSuggestions(data.suggestions);
            }, 600);
          }
        } else {
          this.addMessage("No se pudo generar una respuesta detallada.", "bot");
        }
      } catch (e) {
        if (this.typingEl) this.typingEl.remove();
        this.addMessage("Error de conexión con el asistente.", "bot");
      } finally {
        this.isLoading = false;
        this.scrollToBottom();
      }
    }

    addMessage(text, type) {
      const div = document.createElement("div");
      div.className = `leycura-message ${type}`;
      
      let html = text
        .replace(/\*\*(.*?)\*\*/g, "<b>$1</b>")
        .replace(/\*(.*?)\*/g, '<span style="color: #334155; font-weight: 600;">$1</span>')
        .replace(/\n-\s?/g, "<br>• ")
        .replace(/\n/g, "<br>");

      div.innerHTML = html;
      this.messagesEl.appendChild(div);
      
      this.history.push({ role: type === "user" ? "user" : "assistant", content: text });
      if (this.history.length > 6) this.history.shift();
      this.scrollToBottom();
    }

    scrollToBottom() {
      this.messagesEl.scrollTo({ top: this.messagesEl.scrollHeight, behavior: 'smooth' });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => new LeyCuraChatbot());
  } else {
    new LeyCuraChatbot();
  }
})();
