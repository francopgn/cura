// chatbot-widget.js — LeyCura UI + API DeepSeek/Pinecone
(function () {
  "use strict";

  class LeyCuraChatbot {
    constructor() {
      this.isOpen = false;
      this.isLoading = false;
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
        position: fixed;
        bottom: 20px;
        right: 20px;
        width: 60px;
        height: 60px;
        border-radius: 50%;
        background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%);
        border: none;
        color: white;
        font-size: 26px;
        cursor: pointer;
        box-shadow: 0 4px 20px rgba(79,70,229,.35);
        z-index: 9999;
      }

      .leycura-chat-window {
        position: fixed;
        bottom: 90px;
        right: 20px;
        width: 380px;
        height: 500px;
        background: #fff;
        border-radius: 14px;
        box-shadow: 0 10px 40px rgba(0,0,0,.18);
        z-index: 9998;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        transform: translateY(20px);
        opacity: 0;
        visibility: hidden;
        transition: .25s;
      }

      .leycura-chat-window.open {
        transform: translateY(0);
        opacity: 1;
        visibility: visible;
      }

      .leycura-chat-header {
        background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%);
        color: white;
        padding: 14px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-weight: 600;
      }

      .leycura-chat-close {
        background: rgba(255,255,255,.25);
        border: none;
        color: white;
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
      }

      .leycura-message {
        max-width: 85%;
        margin-bottom: 10px;
        padding: 10px 14px;
        border-radius: 16px;
        line-height: 1.4;
        word-wrap: break-word;
        font-size: 14px;
      }

      .leycura-message.user {
        background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%);
        color: white;
        margin-left: auto;
        border-bottom-right-radius: 4px;
      }

      .leycura-message.bot {
        background: white;
        border: 1px solid #E5E7EB;
        margin-right: auto;
        border-bottom-left-radius: 4px;
      }

      .leycura-chat-input-area {
        padding: 12px;
        border-top: 1px solid #E5E7EB;
        display: flex;
        gap: 10px;
      }

      .leycura-chat-input {
        flex: 1;
        padding: 10px 14px;
        border: 1px solid #D1D5DB;
        border-radius: 22px;
        font-size: 14px;
        outline: none;
      }

      .leycura-chat-send {
        background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%);
        color: white;
        border: none;
        border-radius: 50%;
        width: 40px;
        height: 40px;
        cursor: pointer;
      }

      @media (max-width: 480px) {
        .leycura-chat-window {
          width: calc(100vw - 40px);
          right: 20px;
          left: 20px;
          height: 70vh;
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
      this.button.innerHTML = "🤖";
      this.button.title = "Asistente Ley Cura";
      document.body.appendChild(this.button);
    }

    createChatWindow() {
      this.chatWindow = document.createElement("div");
      this.chatWindow.className = "leycura-chat-window";

      this.chatWindow.innerHTML = `
        <div class="leycura-chat-header">
          <span>🤖 Asistente Ley Cura</span>
          <button class="leycura-chat-close">×</button>
        </div>

        <div class="leycura-chat-messages" id="leycuraMessages">
          <div class="leycura-message bot">
            Hola, puedo responder preguntas sobre la <b>Ley Cura</b>.
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
      this.button.onclick = () => this.toggleChat();
      this.closeBtn.onclick = () => this.closeChat();
      this.sendBtn.onclick = () => this.sendMessage();
      this.inputEl.onkeypress = (e) => e.key === "Enter" && this.sendMessage();
    }

    toggleChat() {
      this.isOpen = !this.isOpen;
      this.chatWindow.classList.toggle("open", this.isOpen);
      if (this.isOpen) this.inputEl.focus();
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

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message }),
        });

        const data = await res.json();

        if (data.reply) {
          this.addMessage(data.reply, "bot");
        } else {
          this.addMessage("Error al procesar la consulta.", "bot");
        }
      } catch (e) {
        console.error(e);
        this.addMessage("No se pudo conectar con el servidor.", "bot");
      } finally {
        this.isLoading = false;
      }
    }

    addMessage(text, type) {
      const div = document.createElement("div");
      div.className = `leycura-message ${type}`;
      div.innerHTML = text.replace(/\n/g, "<br>");
      this.messagesEl.appendChild(div);
      this.messagesEl.scrollTop = this.messagesEl.scrollHeight;
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => new LeyCuraChatbot());
  } else {
    new LeyCuraChatbot();
  }
})();
