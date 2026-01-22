// Chatbot Widget para Ley Cura - Versión JSON
class LeyCuraChatbot {
  constructor(config = {}) {
    this.config = {
      apiUrl: '/api/chat',
      position: 'bottom-right',
      primaryColor: '#667eea',
      secondaryColor: '#764ba2',
      ...config
    };
    
    this.isOpen = false;
    this.isLoading = false;
    this.messageHistory = [];
    this.init();
  }
  
  init() {
    this.createStyles();
    this.createButton();
    this.createChatWindow();
    this.setupEventListeners();
    this.loadHistory();
  }
  
  createStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .leycura-chatbot-btn {
        position: fixed;
        bottom: 20px; right: 20px;
        width: 60px; height: 60px;
        border-radius: 50%;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border: none; color: white; font-size: 24px;
        cursor: pointer; box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        z-index: 10000; transition: all 0.3s ease;
        display: flex; align-items: center; justify-content: center;
      }
      .leycura-chatbot-btn:hover { transform: scale(1.1); }
      
      .leycura-chatbot-window {
        position: fixed;
        bottom: 90px; right: 20px;
        width: 380px; max-width: 95vw;
        height: 550px; max-height: 80vh;
        background: white; border-radius: 16px;
        box-shadow: 0 10px 40px rgba(0,0,0,0.15);
        z-index: 10000; display: flex; flex-direction: column;
        overflow: hidden; transition: all 0.3s ease;
        transform: translateY(20px) scale(0.95);
        opacity: 0; visibility: hidden;
      }
      .leycura-chatbot-window.open {
        transform: translateY(0) scale(1);
        opacity: 1; visibility: visible;
      }
      
      .leycura-chatbot-header {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white; padding: 16px 20px;
        display: flex; justify-content: space-between;
        align-items: center;
      }
      
      .leycura-chatbot-messages {
        flex: 1; padding: 20px;
        overflow-y: auto; background: #f8fafc;
        display: flex; flex-direction: column; gap: 12px;
      }
      
      .leycura-chatbot-message {
        max-width: 85%; padding: 12px 16px;
        border-radius: 18px; line-height: 1.5;
        word-wrap: break-word;
      }
      
      .leycura-chatbot-message.user {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white; margin-left: auto;
        border-bottom-right-radius: 6px;
      }
      
      .leycura-chatbot-message.bot {
        background: white; color: #1a202c;
        margin-right: auto; border-bottom-left-radius: 6px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.08);
        border: 1px solid #e2e8f0;
      }
      
      .leycura-chatbot-input-area {
        padding: 16px; border-top: 1px solid #e2e8f0;
        background: white; display: flex; gap: 10px;
      }
      
      .leycura-chatbot-input {
        flex: 1; padding: 12px 16px;
        border: 1px solid #e2e8f0; border-radius: 25px;
        font-size: 14px; outline: none;
        transition: border 0.2s; background: #f8fafc;
      }
      
      .leycura-chatbot-input:focus {
        border-color: #667eea; background: white;
      }
      
      .leycura-chatbot-send {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white; border: none; border-radius: 50%;
        width: 46px; height: 46px; cursor: pointer;
        display: flex; align-items: center; justify-content: center;
        transition: all 0.2s; flex-shrink: 0;
      }
      
      .leycura-chatbot-send:hover:not(:disabled) {
        transform: scale(1.05);
      }
      
      .leycura-chatbot-send:disabled {
        opacity: 0.5; cursor: not-allowed;
      }
      
      @media (max-width: 480px) {
        .leycura-chatbot-window {
          width: 100vw; height: 100vh;
          max-height: 100vh; border-radius: 0;
          bottom: 0; right: 0;
        }
      }
    `;
    document.head.appendChild(style);
  }
  
  createButton() {
    this.button = document.createElement('button');
    this.button.className = 'leycura-chatbot-btn';
    this.button.innerHTML = '🤖';
    document.body.appendChild(this.button);
  }
  
  createChatWindow() {
    this.chatWindow = document.createElement('div');
    this.chatWindow.className = 'leycura-chatbot-window';
    
    this.chatWindow.innerHTML = `
      <div class="leycura-chatbot-header">
        <div class="leycura-chatbot-title">
          <span>🤖</span>
          <span>Asistente Ley Cura</span>
        </div>
        <button class="leycura-chatbot-close">×</button>
      </div>
      
      <div class="leycura-chatbot-messages" id="leycura-chat-messages">
        <div class="leycura-chatbot-message bot">
          ¡Hola! Soy tu asistente de la <strong>Ley Cura</strong>.
          Puedo ayudarte con información sobre esta ley.
        </div>
      </div>
      
      <div class="leycura-chatbot-input-area">
        <input type="text" class="leycura-chatbot-input" 
               placeholder="Pregunta sobre la Ley Cura..." 
               id="leycura-chat-input">
        <button class="leycura-chatbot-send" id="leycura-chat-send">➤</button>
      </div>
    `;
    
    document.body.appendChild(this.chatWindow);
    
    this.messagesContainer = document.getElementById('leycura-chat-messages');
    this.input = document.getElementById('leycura-chat-input');
    this.sendButton = document.getElementById('leycura-chat-send');
    this.closeButton = this.chatWindow.querySelector('.leycura-chatbot-close');
  }
  
  setupEventListeners() {
    this.button.addEventListener('click', () => this.toggleChat());
    this.closeButton.addEventListener('click', () => this.closeChat());
    this.sendButton.addEventListener('click', () => this.sendMessage());
    this.input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.sendMessage();
    });
  }
  
  toggleChat() {
    this.isOpen = !this.isOpen;
    this.chatWindow.classList.toggle('open', this.isOpen);
    if (this.isOpen) this.input.focus();
  }
  
  closeChat() { this.isOpen = false; this.chatWindow.classList.remove('open'); }
  
  async sendMessage() {
    const message = this.input.value.trim();
    if (!message || this.isLoading) return;
    
    this.input.value = '';
    this.input.disabled = true;
    this.sendButton.disabled = true;
    this.isLoading = true;
    
    this.addMessage(message, 'user');
    
    try {
      const response = await fetch(this.config.apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }
      
      const data = await response.json();
      this.addMessage(data.answer || 'No se recibió respuesta', 'bot');
      
    } catch (error) {
      console.error('Error:', error);
      this.addMessage('Error: ' + error.message, 'bot');
    } finally {
      this.input.disabled = false;
      this.sendButton.disabled = false;
      this.isLoading = false;
      this.input.focus();
    }
  }
  
  addMessage(text, sender) {
    const div = document.createElement('div');
    div.className = `leycura-chatbot-message ${sender}`;
    div.innerHTML = text.replace(/\n/g, '<br>');
    this.messagesContainer.appendChild(div);
    this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
  }
}

// Inicializar
window.addEventListener('DOMContentLoaded', () => {
  window.leycuraChatbot = new LeyCuraChatbot();
});
