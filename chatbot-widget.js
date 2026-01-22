// chatbot-widget.js - VERSIÓN ROBUSTA
(function() {
  'use strict';
  
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
      console.log('🤖 Chatbot Ley Cura cargado');
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
          font-size: 24px;
          cursor: pointer;
          box-shadow: 0 4px 20px rgba(79, 70, 229, 0.3);
          z-index: 9999;
          transition: all 0.3s;
        }
        
        .leycura-chat-btn:hover {
          transform: scale(1.1);
          box-shadow: 0 6px 25px rgba(79, 70, 229, 0.4);
        }
        
        .leycura-chat-window {
          position: fixed;
          bottom: 90px;
          right: 20px;
          width: 380px;
          height: 500px;
          background: white;
          border-radius: 12px;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
          z-index: 9998;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          transform: translateY(20px);
          opacity: 0;
          visibility: hidden;
          transition: all 0.3s;
        }
        
        .leycura-chat-window.open {
          transform: translateY(0);
          opacity: 1;
          visibility: visible;
        }
        
        .leycura-chat-header {
          background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%);
          color: white;
          padding: 15px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .leycura-chat-title {
          font-weight: 600;
          font-size: 16px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .leycura-chat-close {
          background: rgba(255,255,255,0.2);
          border: none;
          color: white;
          width: 30px;
          height: 30px;
          border-radius: 50%;
          cursor: pointer;
          font-size: 20px;
          line-height: 1;
        }
        
        .leycura-chat-messages {
          flex: 1;
          padding: 15px;
          overflow-y: auto;
          background: #F8FAFC;
        }
        
        .leycura-message {
          max-width: 85%;
          margin-bottom: 10px;
          padding: 10px 15px;
          border-radius: 18px;
          line-height: 1.4;
          word-wrap: break-word;
        }
        
        .leycura-message.user {
          background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%);
          color: white;
          margin-left: auto;
          border-bottom-right-radius: 4px;
        }
        
        .leycura-message.bot {
          background: white;
          color: #1F2937;
          margin-right: auto;
          border-bottom-left-radius: 4px;
          border: 1px solid #E5E7EB;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        }
        
        .leycura-chat-input-area {
          padding: 15px;
          border-top: 1px solid #E5E7EB;
          display: flex;
          gap: 10px;
        }
        
        .leycura-chat-input {
          flex: 1;
          padding: 10px 15px;
          border: 1px solid #D1D5DB;
          border-radius: 25px;
          font-size: 14px;
          outline: none;
          transition: border 0.2s;
        }
        
        .leycura-chat-input:focus {
          border-color: #4F46E5;
        }
        
        .leycura-chat-send {
          background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%);
          color: white;
          border: none;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.2s;
        }
        
        .leycura-chat-send:hover:not(:disabled) {
          transform: scale(1.05);
        }
        
        .leycura-chat-send:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        @media (max-width: 480px) {
          .leycura-chat-window {
            width: calc(100vw - 40px);
            right: 20px;
            left: 20px;
            height: 70vh;
          }
          
          .leycura-chat-btn {
            bottom: 10px;
            right: 10px;
          }
        }
      `;
      
      const style = document.createElement('style');
      style.textContent = css;
      document.head.appendChild(style);
    }
    
    createButton() {
      this.button = document.createElement('button');
      this.button.className = 'leycura-chat-btn';
      this.button.innerHTML = '🤖';
      this.button.title = 'Asistente Ley Cura';
      document.body.appendChild(this.button);
    }
    
    createChatWindow() {
      this.chatWindow = document.createElement('div');
      this.chatWindow.className = 'leycura-chat-window';
      
      this.chatWindow.innerHTML = `
        <div class="leycura-chat-header">
          <div class="leycura-chat-title">
            <span>🤖</span>
            <span>Asistente Ley Cura</span>
          </div>
          <button class="leycura-chat-close">×</button>
        </div>
        
        <div class="leycura-chat-messages" id="leycuraMessages">
          <div class="leycura-message bot">
            <strong>¡Hola!</strong> Soy tu asistente especializado en la <strong>Ley Cura</strong> de Argentina.
            <br><br>
            Estoy aquí para ayudarte a entender esta legislación.
          </div>
        </div>
        
        <div class="leycura-chat-input-area">
          <input type="text" class="leycura-chat-input" 
                 placeholder="Escribe tu pregunta..." 
                 id="leycuraInput">
          <button class="leycura-chat-send" id="leycuraSend">➤</button>
        </div>
      `;
      
      document.body.appendChild(this.chatWindow);
      
      this.messagesEl = document.getElementById('leycuraMessages');
      this.inputEl = document.getElementById('leycuraInput');
      this.sendBtn = document.getElementById('leycuraSend');
      this.closeBtn = this.chatWindow.querySelector('.leycura-chat-close');
    }
    
    bindEvents() {
      this.button.addEventListener('click', () => this.toggleChat());
      this.closeBtn.addEventListener('click', () => this.closeChat());
      this.sendBtn.addEventListener('click', () => this.sendMessage());
      this.inputEl.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') this.sendMessage();
      });
    }
    
    toggleChat() {
      this.isOpen = !this.isOpen;
      this.chatWindow.classList.toggle('open', this.isOpen);
      if (this.isOpen) {
        this.inputEl.focus();
        this.scrollToBottom();
      }
    }
    
    closeChat() {
      this.isOpen = false;
      this.chatWindow.classList.remove('open');
    }
    
    async sendMessage() {
      const message = this.inputEl.value.trim();
      if (!message || this.isLoading) return;
      
      // Limpiar input
      this.inputEl.value = '';
      this.inputEl.disabled = true;
      this.sendBtn.disabled = true;
      this.isLoading = true;
      
      // Mostrar mensaje usuario
      this.addMessage(message, 'user');
      
      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message })
        });
        
        const data = await response.ok ? await response.json() : null;
        
        if (data && data.answer) {
          this.addMessage(data.answer, 'bot');
        } else {
          this.addMessage('Lo siento, hubo un error. Intenta nuevamente.', 'bot');
        }
      } catch (error) {
        console.error('Chat error:', error);
        this.addMessage('Error de conexión. Verifica tu internet.', 'bot');
      } finally {
        this.inputEl.disabled = false;
        this.sendBtn.disabled = false;
        this.isLoading = false;
        this.inputEl.focus();
      }
    }
    
    addMessage(text, type) {
      const msg = document.createElement('div');
      msg.className = `leycura-message ${type}`;
      msg.innerHTML = text.replace(/\n/g, '<br>');
      this.messagesEl.appendChild(msg);
      this.scrollToBottom();
    }
    
    scrollToBottom() {
      this.messagesEl.scrollTop = this.messagesEl.scrollHeight;
    }
  }
  
  // Inicializar cuando el DOM esté listo
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      window.leycuraChatbot = new LeyCuraChatbot();
    });
  } else {
    window.leycuraChatbot = new LeyCuraChatbot();
  }
})();
