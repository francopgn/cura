(function () {
  "use strict";

  class LeyCuraChatbot {
    constructor() {
      this.isOpen = false;
      this.isLoading = false;
      this.history = []; // ✅ memoria corta
      this.init();
    }

    init() {
      this.injectStyles();
      this.createButton();
      this.createChatWindow();
      this.bindEvents();
      console.log("🤖 LeyCura Chatbot listo");
    }

    injectStyles() {
      const css = `
      .leycura-chat-btn {
        position: fixed !important;
        bottom: 20px;
        right: 20px;
        width: 60px;
        height: 60px;
        border-radius: 50%;
        background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%);
        border: none;
        color: #fff;
        font-size: 26px;
        cursor: pointer;
        box-shadow: 0 4px 20px rgba(37,99,235,.35);
        z-index: 2147483647;
      }

      .leycura-chat-window {
        position: fixed !important;
        bottom: 90px;
        right: 20px;
        width: 380px;
        height: 500px;
        background: #ffffff;
        border-radius: 14px;
        box-shadow: 0 10px 40px rgba(0,0,0,.18);
        z-index: 2147483646;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        transform: translateY(20px);
        opacity: 0;
        visibility: hidden;
        transition: .25s;
        pointer-events: none;
      }

      .leycura-chat-window.open {
        transform: translateY(0);
        opacity: 1;
        visibility: visible;
        pointer-events: auto;
      }

      .leycura-chat-header {
        background: #1e3a8a;
        color: #fff;
        padding: 14px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-weight: 600;
        flex-shrink: 0;
      }

      .leycura-chat-close {
        background: rgba(255,255,255,.25);
        border: none;
        color: #fff;
        width: 28px;
        height: 28px;
        border-radius: 50%;
        cursor: pointer;
        font-size: 18px;
      }

      .leycura-chat-messages {
        flex: 1;
        padding: 14px;
        overflow-y: auto;
        background: #F8FAFC;
        color: #111827;
        font-family: system-ui, sans-serif;
        font-size: 14px;
      }

      .leycura-message {
        max-width: 85%;
        margin-bottom: 10px;
        padding: 10px 14px;
        border-radius: 16px;
        line-height: 1.4;
        word-wrap: break-word;
      }

      .leycura-message.user {
        background: #2563eb;
        color: #ffffff;
        margin-left: auto;
        border-bottom-right-radius: 4px;
      }

      .leycura-message.bot {
        background: #ffffff;
        border: 1px solid #E5E7EB;
        color: #111827;
        margin-right: auto;
        border-bottom-left-radius: 4px;
      }

      .leycura-chat-input-area {
        padding: 12px;
        border-top: 1px solid #E5E7EB;
        display: flex;
        gap: 10px;
        background: #ffffff;
        flex-shrink: 0;
      }

      .leycura-chat-input {
        flex: 1;
        padding: 10px 14px;
        border: 1px solid #D1D5DB;
        border-radius: 22px;
        font-size: 14px;
        outline: none;
        color: #111827 !important;
        background: #ffffff !important;
      }

      .leycura-chat-send {
        background: #2563eb;
        color: #ffffff;
        border: none;
        border-radius: 50%;
        width: 40px;
        height: 40px;
        cursor: pointer;
        flex-shrink: 0;
      }
      `;
      const style = document.createElement("style");
      style.textContent = css;
      document.head.appendChild(style);
    }

    createButton() {
      this.button = document.createElement("button");
      this.button.className = "leycura-chat-btn";
      this.button.innerHTML = "🤖";
      document.body.appendChild(this.button);
    }

    createChatWindow() {
      this.chatWindow = document.createElement("div");
      this.chatWindow.className = "leycura-chat-window";

      this.chatWindow.innerHTML = `
        <div class="leycura-chat-header">
          <span>🤖 Asistente Ley C.U.R.A.</span>
          <button class="leycura-chat-close">×</button>
        </div>

        <div class="leycura-chat-messages" id="leycuraMessages">
          <div class="leycura-message bot">
            Hola, puedo responder consultas sobre la <b>Ley C.U.R.A.</b>.
          </div>
        </div>

        <div class="leycura-chat-input-area">
          <input class="leycura-chat-input" id="leycuraInput" placeholder="Escribí tu consulta..." />
          <button class="leycura-chat-send" id="leycuraSend">➤</button>
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
      if (this.isOpen) setTimeout(() => this.inputEl.focus(), 50);
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

      // ✅ pensando...
      this.typingEl = document.createElement("div");
      this.typingEl.className = "leycura-message bot";
      this.typingEl.innerText = "Pensando…";
      this.messagesEl.appendChild(this.typingEl);
      this.scrollToBottom();

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message,
            history: this.history
          }),
        });

        const data = await res.json();

        if (this.typingEl) this.typingEl.remove();

        if (data.answer) {
          this.addMessage(data.answer, "bot");
        } else {
          this.addMessage("Error al procesar la respuesta.", "bot");
        }

      } catch (e) {
        console.error(e);
        if (this.typingEl) this.typingEl.remove();
        this.addMessage("No se pudo conectar con el servidor.", "bot");
      } finally {
        this.isLoading = false;
      }
    }

  addMessage(text, type) {
  const div = document.createElement("div");
  div.className = `leycura-message ${type}`;

  // Markdown básico → HTML
  let html = text
    .replace(/\*\*(.*?)\*\*/g, "<b>$1</b>")   // **negrita**
    .replace(/\n-\s?/g, "<br>• ")             // - bullets
    .replace(/\n/g, "<br>");                  // saltos de línea

  div.innerHTML = html;
  this.messagesEl.appendChild(div);

  // Guardar historial (últimos 3 mensajes usuario + 3 bot)
  this.history.push({
    role: type === "user" ? "user" : "assistant",
    content: text
  });
  if (this.history.length > 6) this.history.shift();

  this.scrollToBottom();
}


    scrollToBottom() {
      this.messagesEl.scrollTop = this.messagesEl.scrollHeight;
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => new LeyCuraChatbot());
  } else {
    new LeyCuraChatbot();
  }
})();
