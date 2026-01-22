// Chatbot Widget para Ley Cura
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
      /* Botón flotante */
      .leycura-chatbot-btn {
        position: fixed;
        ${this.config.position === 'bottom-right' ? 
          'bottom: 20px; right: 20px;' : 
          'bottom: 20px; left: 20px;'
        }
        width: 60px;
        height: 60px;
        border-radius: 50%;
        background: linear-gradient(135deg, ${this.config.primaryColor} 0%, ${this.config.secondaryColor} 100%);
        border: none;
        color: white;
        font-size: 24px;
        cursor: pointer;
        box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        z-index: 10000;
        transition: all 0.3s ease;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      .leycura-chatbot-btn:hover {
        transform: scale(1.1);
        box-shadow: 0 6px 20px rgba(0,0,0,0.3);
      }
      
      .leycura-chatbot-btn:active {
        transform: scale(0.95);
      }
      
      /* Ventana del chat */
      .leycura-chatbot-window {
        position: fixed;
        ${this.config.position === 'bottom-right' ? 
          'bottom: 90px; right: 20px;' : 
          'bottom: 90px; left: 20px;'
        }
        width: 380px;
        max-width: 95vw;
        height: 550px;
        max-height: 80vh;
        background: white;
        border-radius: 16px;
        box-shadow: 0 10px 40px rgba(0,0,0,0.15);
        z-index: 10000;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        transition: all 0.3s ease;
        transform: translateY(20px) scale(0.95);
        opacity: 0;
        visibility: hidden;
      }
      
      .leycura-chatbot-window.open {
        transform: translateY(0) scale(1);
        opacity: 1;
        visibility: visible;
      }
      
      /* Header */
      .leycura-chatbot-header {
        background: linear-gradient(135deg, ${this.config.primaryColor} 0%, ${this.config.secondaryColor} 100%);
        color: white;
        padding: 16px 20px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-shrink: 0;
      }
      
      .leycura-chatbot-title {
        font-weight: 600;
        font-size: 16px;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      
      .leycura-chatbot-close {
        background: rgba(255,255,255,0.2);
        border: none;
        color: white;
        width: 32px;
        height: 32px;
        border-radius: 50%;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background 0.2s;
      }
      
      .leycura-chatbot-close:hover {
        background: rgba(255,255,255,0.3);
      }
      
      /* Mensajes */
      .leycura-chatbot-messages {
        flex: 1;
        padding: 20px;
        overflow-y: auto;
        background: #f8fafc;
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      
      .leycura-chatbot-message {
        max-width: 85%;
        padding: 12px 16px;
        border-radius: 18px;
        line-height: 1.5;
        word-wrap: break-word;
        animation: fadeIn 0.3s ease;
      }
      
      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
      }
      
      .leycura-chatbot-message.user {
        background: linear-gradient(135deg, ${this.config.primaryColor} 0%, ${this.config.secondaryColor} 100%);
        color: white;
        margin-left: auto;
        border-bottom-right-radius: 6px;
      }
      
      .leycura-chatbot-message.bot {
        background: white;
        color: #1a202c;
        margin-right: auto;
        border-bottom-left-radius: 6px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.08);
        border: 1px solid #e2e8f0;
      }
      
      .leycura-chatbot-message.bot strong {
        color: ${this.config.primaryColor};
      }
      
      .leycura-chatbot-message.bot a {
        color: ${this.config.primaryColor};
        text-decoration: underline;
      }
      
      /* Typing indicator */
      .leycura-chatbot-typing {
        display: inline-flex;
        align-items: center;
        padding: 12px 16px;
        background: white;
        border-radius: 18px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.08);
        border: 1px solid #e2e8f0;
        margin-right: auto;
      }
      
      .leycura-chatbot-dot {
        width: 8px;
        height: 8px;
        background: ${this.config.primaryColor};
        border-radius: 50%;
        margin: 0 3px;
        animation: typing 1.4s infinite;
      }
      
      .leycura-chatbot-dot:nth-child(2) { animation-delay: 0.2s; }
      .leycura-chatbot-dot:nth-child(3) { animation-delay: 0.4s; }
      
      @keyframes typing {
        0%, 60%, 100% { transform: translateY(0); }
        30% { transform: translateY(-8px); }
      }
      
      /* Input area */
      .leycura-chatbot-input-area {
        padding: 16px;
        border-top: 1px solid #e2e8f0;
        background: white;
        flex-shrink: 0;
        display: flex;
        gap: 10px;
      }
      
      .leycura-chatbot-input {
        flex: 1;
        padding: 12px 16px;
        border: 1px solid #e2e8f0;
        border-radius: 25px;
        font-size: 14px;
        outline: none;
        transition: border 0.2s;
        background: #f8fafc;
      }
      
      .leycura-chatbot-input:focus {
        border-color: ${this.config.primaryColor};
        background: white;
      }
      
      .leycura-chatbot-input::placeholder {
        color: #a0aec0;
      }
      
      .leycura-chatbot-send {
        background: linear-gradient(135deg, ${this.config.primaryColor} 0%, ${this.config.secondaryColor} 100%);
        color: white;
        border: none;
        border-radius: 50%;
        width: 46px;
        height: 46px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;
        flex-shrink: 0;
      }
      
      .leycura-chatbot-send:hover:not(:disabled) {
        transform: scale(1.05);
      }
      
      .leycura-chatbot-send:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      
      /* Scrollbar personalizado */
      .leycura-chatbot-messages::-webkit-scrollbar {
        width: 6px;
      }
      
      .leycura-chatbot-messages::-webkit-scrollbar-track {
        background: #f1f1f1;
        border-radius: 3px;
      }
      
      .leycura-chatbot-messages::-webkit-scrollbar-thumb {
        background: #cbd5e0;
        border-radius: 3px;
      }
      
      .leycura-chatbot-messages::-webkit-scrollbar-thumb:hover {
        background: ${this.config.primaryColor};
      }
      
      /* Responsive */
      @media (max-width: 480px) {
        .leycura-chatbot-window {
          width: 100vw;
          height: 100vh;
          max-height: 100vh;
          border-radius: 0;
          ${this.config.position === 'bottom-right' ? 
            'bottom: 0; right: 0;' : 
            'bottom: 0; left: 0;'
          }
        }
        
        .leycura-chatbot-btn {
          bottom: 10px;
          ${this.config.position === 'bottom-right' ? 'right: 10px;' : 'left: 10px;'}
        }
      }
    `;
    document.head.appendChild(style);
  }
  
  createButton() {
    this.button = document.createElement('button');
    this.button.className = 'leycura-chatbot-btn';
    this.button.setAttribute('aria-label', 'Abrir chat de Ley Cura');
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
        <button class="leycura-chatbot-close" aria-label="Cerrar chat">×</button>
      </div>
      
      <div class="leycura-chatbot-messages" id="leycura-chat-messages">
        <div class="leycura-chatbot-message bot">
          ¡Hola! Soy tu asistente especializado en la <strong>Ley Cura de Argentina</strong>. 
          Puedo ayudarte a entender los artículos, derechos y disposiciones de la ley.
          <br><br>
          <em>Ejemplo: "¿Qué establece el artículo 1?" o "¿Cuáles son los derechos de los pacientes?"</em>
        </div>
      </div>
      
      <div class="leycura-chatbot-input-area">
        <input 
          type="text" 
          class="leycura-chatbot-input" 
          placeholder="Escribe tu pregunta sobre la Ley Cura..." 
          id="leycura-chat-input"
          autocomplete="off"
        >
        <button class="leycura-chatbot-send" id="leycura-chat-send" aria-label="Enviar mensaje">
          ➤
        </button>
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
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });
    
    // Cerrar al hacer clic fuera (solo en desktop)
    document.addEventListener('click', (e) => {
      if (this.isOpen && 
          !this.chatWindow.contains(e.target) && 
          !this.button.contains(e.target) &&
          window.innerWidth > 768) {
        this.closeChat();
      }
    });
    
    // Cerrar con Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.closeChat();
      }
    });
  }
  
  loadHistory() {
    try {
      const saved = localStorage.getItem('leycura_chat_history');
      if (saved) {
        this.messageHistory = JSON.parse(saved);
        // Mostrar solo últimos 10 mensajes
        const recentHistory = this.messageHistory.slice(-10);
        recentHistory.forEach(msg => {
          this.addMessage(msg.content, msg.role, false);
        });
      }
    } catch (e) {
      console.warn('No se pudo cargar el historial:', e);
    }
  }
  
  saveHistory() {
    try {
      localStorage.setItem('leycura_chat_history', JSON.stringify(this.messageHistory.slice(-50)));
    } catch (e) {
      console.warn('No se pudo guardar el historial:', e);
    }
  }
  
  toggleChat() {
    this.isOpen = !this.isOpen;
    this.chatWindow.classList.toggle('open', this.isOpen);
    if (this.isOpen) {
      this.input.focus();
      this.scrollToBottom();
    }
  }
  
  closeChat() {
    this.isOpen = false;
    this.chatWindow.classList.remove('open');
  }
  
  async sendMessage() {
    const message = this.input.value.trim();
    if (!message || this.isLoading) return;
    
    // Limpiar input y deshabilitar
    this.input.value = '';
    this.input.disabled = true;
    this.sendButton.disabled = true;
    this.isLoading = true;
    
    // Añadir mensaje del usuario
    this.addMessage(message, 'user');
    this.messageHistory.push({ role: 'user', content: message });
    
    // Mostrar typing indicator
    this.showTyping();
    
    try {
      const response = await fetch(this.config.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: message,
          history: this.messageHistory
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      // Ocultar typing indicator
      this.hideTyping();
      
      // Procesar stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let botMessage = '';
      
      // Crear elemento para mensaje del bot
      const messageElement = this.addMessage('', 'bot', true);
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ') && !line.includes('[DONE]')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.choices && data.choices[0].delta.content) {
                botMessage += data.choices[0].delta.content;
                messageElement.innerHTML = this.formatMessage(botMessage);
                this.scrollToBottom();
              }
            } catch (e) {
              // Ignorar líneas inválidas
            }
          }
        }
      }
      
      // Guardar respuesta en historial
      this.messageHistory.push({ role: 'assistant', content: botMessage });
      this.saveHistory();
      
    } catch (error) {
      console.error('Error:', error);
      this.hideTyping();
      this.addMessage(
        'Lo siento, hubo un error al procesar tu pregunta. Por favor, intenta nuevamente.',
        'bot'
      );
    } finally {
      // Rehabilitar input
      this.input.disabled = false;
      this.sendButton.disabled = false;
      this.isLoading = false;
      this.input.focus();
    }
  }
  
  addMessage(text, sender, streaming = false) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `leycura-chatbot-message ${sender}`;
    
    if (streaming) {
      messageDiv.id = 'streaming-message';
    }
    
    messageDiv.innerHTML = this.formatMessage(text);
    this.messagesContainer.appendChild(messageDiv);
    
    if (!streaming) {
      this.scrollToBottom();
    }
    
    return messageDiv;
  }
  
  showTyping() {
    const typingDiv = document.createElement('div');
    typingDiv.className = 'leycura-chatbot-typing';
    typingDiv.id = 'leycura-typing-indicator';
    typingDiv.innerHTML = `
      <div class="leycura-chatbot-dot"></div>
      <div class="leycura-chatbot-dot"></div>
      <div class="leycura-chatbot-dot"></div>
    `;
    this.messagesContainer.appendChild(typingDiv);
    this.scrollToBottom();
  }
  
  hideTyping() {
    const indicator = document.getElementById('leycura-typing-indicator');
    if (indicator) {
      indicator.remove();
    }
  }
  
  formatMessage(text) {
    // Convertir saltos de línea y formato básico
    return text
      .replace(/\n/g, '<br>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code>$1</code>');
  }
  
  scrollToBottom() {
    this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
  }
}

// Inicializar cuando la página cargue
window.addEventListener('DOMContentLoaded', () => {
  // Pequeño delay para no interferir con la carga
  setTimeout(() => {
    window.leycuraChatbot = new LeyCuraChatbot();
  }, 1000);
});
