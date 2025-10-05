<script>
  import { onMount } from 'svelte';
  
  // Initialize Gun variables - we'll set them in onMount
  let gun = $state(null);
  let messagesRef = $state(null);
  
  // User and message state
  let username = $state('');
  let message = $state('');
  let messages = $state([]);
  let usernameSet = $state(false);
  
  onMount(() => {
    // Access Gun from the global scope after it's loaded
    if (window.Gun) {
      gun = window.Gun();
      
      // Create a reference to the messages in Gun
      messagesRef = gun.get('messages');
      
      // Subscribe to messages changes
      messagesRef.map().on((msgData, id) => {
        try {
          if (msgData && id !== '_') {
            // Update the messages array in a reactive way
            const messageObj = {
              id: id || '',
              sender: msgData.sender || 'Unknown',
              text: msgData.text || '',
              timestamp: msgData.timestamp || Date.now(),
              isCurrentUser: (msgData.sender === username)
            };
            
            // Check if message already exists
            const exists = messages.some(m => m.id === id);
            if (!exists) {
              messages = [...messages, messageObj].sort((a, b) => a.timestamp - b.timestamp);
            }
          }
        } catch (error) {
          console.error('Error processing message:', error);
        }
      });
    }
  });
  
  // Set username 
  function setUsername(e) {
    e.preventDefault();
    if (username.trim()) {
      usernameSet = true;
    }
  }
  
  // Send message
  function sendMessage(e) {
    e.preventDefault();
    if (!message.trim() || !username || !messagesRef) return;
    
    // Create a message in Gun
    const id = Date.now().toString();
    messagesRef.get(id).put({
      sender: username,
      text: message,
      timestamp: Date.now()
    });
    
    // Clear input
    message = '';
  }
  
  // Format timestamp
  function formatTimestamp(timestamp) {
    try {
      const date = new Date(timestamp);
      return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    } catch (e) {
      return '--:--';
    }
  }
</script>

<!-- Load Gun.js from CDN before component code -->
<svelte:head>
  <script src="https://cdn.jsdelivr.net/npm/gun/gun.js"></script>
</svelte:head>

<div class="chat-app">
  <h2>Real-time Chat</h2>
  <p class="api-info">Using Gun.js direct subscription</p>
  
  {#if !usernameSet}
    <div class="username-form">
      <h3>Enter your username to join the chat</h3>
      <form onsubmit={(e) => { e.preventDefault(); setUsername(e); }}>
        <input
          type="text"
          placeholder="Username"
          bind:value={username}
        />
        <button type="submit">Join Chat</button>
      </form>
    </div>
  {:else if gun}
    <div class="chat-container">
      <div class="messages-container">
        {#if messages.length > 0}
          <div class="messages">
            {#each messages as msg}
              {#if msg && msg.text && msg.sender}
                <div class="message-item" class:current-user={msg.isCurrentUser}>
                  <div class="message-sender">{msg.sender}</div>
                  <div class="message-content">{msg.text}</div>
                  <div class="message-time">{formatTimestamp(msg.timestamp)}</div>
                </div>
              {/if}
            {/each}
          </div>
        {:else}
          <p class="no-messages">No messages yet. Be the first to say hello!</p>
        {/if}
      </div>
      
      <form onsubmit={(e) => { e.preventDefault(); sendMessage(e); }} class="message-form">
        <input
          type="text"
          placeholder="Type your message..."
          bind:value={message}
        />
        <button type="submit">Send</button>
      </form>
    </div>
  {:else}
    <div class="loading">
      <p>Loading Gun.js...</p>
    </div>
  {/if}
</div>

<style>
  .chat-app {
    width: 100%;
  }
  
  h2 {
    margin-bottom: 5px;
  }
  
  .api-info {
    margin-top: 0;
    color: #666;
    font-size: 14px;
    margin-bottom: 20px;
  }
  
  .username-form {
    background: #f9f9f9;
    border-radius: var(--border-radius);
    padding: 20px;
    text-align: center;
  }
  
  .username-form h3 {
    margin-top: 0;
    margin-bottom: 20px;
  }
  
  .username-form form {
    display: flex;
    max-width: 400px;
    margin: 0 auto;
  }
  
  .username-form input {
    flex: 1;
    margin-right: 10px;
  }
  
  .chat-container {
    background: #f9f9f9;
    border-radius: var(--border-radius);
    padding: 20px;
    display: flex;
    flex-direction: column;
    height: 400px;
  }
  
  .messages-container {
    flex: 1;
    overflow-y: auto;
    margin-bottom: 20px;
    padding: 10px;
    background: white;
    border-radius: var(--border-radius);
    border: 1px solid var(--border-color);
  }
  
  .messages {
    display: flex;
    flex-direction: column;
  }
  
  .message-item {
    margin-bottom: 10px;
    padding: 8px 12px;
    background-color: #f0f0f0;
    border-radius: 8px;
    max-width: 70%;
    align-self: flex-start;
    position: relative;
  }
  
  .message-item.current-user {
    background-color: var(--primary-color);
    color: white;
    align-self: flex-end;
  }
  
  .message-sender {
    font-weight: bold;
    margin-bottom: 4px;
    font-size: 0.9rem;
  }
  
  .message-content {
    word-break: break-word;
  }
  
  .message-time {
    font-size: 0.75rem;
    color: #888;
    margin-top: 4px;
    text-align: right;
  }
  
  .message-item.current-user .message-time {
    color: #e0e0e0;
  }
  
  .message-form {
    display: flex;
  }
  
  .message-form input {
    flex: 1;
    margin-right: 10px;
  }
  
  .no-messages {
    text-align: center;
    color: #888;
    font-style: italic;
    margin: 20px 0;
  }
  
  .loading {
    background: #f9f9f9;
    border-radius: var(--border-radius);
    padding: 20px;
    text-align: center;
    font-style: italic;
    color: #888;
  }
</style> 