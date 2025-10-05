<script>
  import { safeMap, gunList } from '$lib/svgun';
  import { gun, messagesRef } from '$lib/svgun/GunContext';
  
  // User and message state
  let username = $state('');
  let message = $state('');
  let messages = $state([]);
  let usernameSet = $state(false);
  
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
    if (!message.trim() || !username || !$messagesRef) return;
    
    // Create a message in Gun
    const id = Date.now().toString();
    $messagesRef.get(id).put({
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
      const date = new Date(Number(timestamp));
      return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    } catch (e) {
      return '--:--';
    }
  }
  
  // Update messages when gunList action provides new data
  function updateMessages(data) {
    if (!data) return;
    
    messages = safeMap(data, (id, msg) => ({
      id,
      sender: msg.sender || 'Unknown',
      text: msg.text || '',
      timestamp: msg.timestamp || Date.now(),
      isCurrentUser: (msg.sender === username)
    })).sort((a, b) => a.timestamp - b.timestamp);
  }
</script>

<div class="chat-app">
  <h2>Real-time Chat - svgun-lib Powered</h2>
  <p class="api-info">Using shared Gun instance with Svelte 5 compatibility</p>
  
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
  {:else if $gun && $messagesRef}
    <div class="chat-container">
      <div class="messages-container" use:gunList={{
        gun: $messagesRef,
        callback: updateMessages
      }}>
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