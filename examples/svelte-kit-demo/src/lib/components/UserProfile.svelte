<script>
  import { onMount } from 'svelte';
  import { useGun } from 'svgun';
  
  // Initialize Gun - will use window.Gun from CDN
  let gun = $state(null);
  let userRef = $state(null);
  let profileData = $state(null);
  
  onMount(() => {
    // Make sure Gun is loaded from CDN
    if (window.Gun) {
      // Initialize Gun
      gun = window.Gun();
      
      // Create a reference to the user profile in Gun
      userRef = gun.get('userProfile');
      
      // Subscribe to changes
      userRef.on((data) => {
        profileData = data;
      });
    } else {
      console.error('Gun.js not loaded from CDN');
    }
  });
  
  // Edit mode state
  let isEditMode = $state(false);
  
  // Form state
  let formData = $state({
    name: '',
    email: '',
    bio: '',
    location: '',
    github: '',
    twitter: '',
    website: ''
  });
  
  // Toggle edit mode
  function toggleEditMode() {
    if (isEditMode) {
      isEditMode = false;
    } else {
      // Initialize form data with current profile data
      if (profileData) {
        formData = {
          name: profileData.name || '',
          email: profileData.email || '',
          bio: profileData.bio || '',
          location: profileData.location || '',
          github: profileData.github || '',
          twitter: profileData.twitter || '',
          website: profileData.website || ''
        };
      }
      isEditMode = true;
    }
  }
  
  // Save profile data
  function saveProfile(e) {
    e.preventDefault();
    if (userRef) {
      userRef.put(formData);
    }
    isEditMode = false;
  }
</script>

<!-- Load Gun.js from CDN before component code -->
<svelte:head>
  <script src="https://cdn.jsdelivr.net/npm/gun/gun.js"></script>
</svelte:head>

<div class="user-profile">
  <h2>User Profile</h2>
  <p class="api-info">Using Gun.js with direct DOM manipulation</p>
  
  {#if !isEditMode}
    <div class="profile-card">
      {#if profileData}
        <div class="profile-header">
          <h3>{profileData.name || 'Anonymous User'}</h3>
          {#if profileData.email}
            <p class="email">{profileData.email}</p>
          {/if}
          {#if profileData.location}
            <p class="location">{profileData.location}</p>
          {/if}
        </div>
        
        {#if profileData.bio}
          <div class="profile-section">
            <h4>Bio</h4>
            <p>{profileData.bio}</p>
          </div>
        {/if}
        
        {#if profileData.github || profileData.twitter || profileData.website}
          <div class="profile-section">
            <h4>Links</h4>
            <ul class="links">
              {#if profileData.github}
                <li>
                  <strong>GitHub:</strong> 
                  <a href={`https://github.com/${profileData.github}`} target="_blank" rel="noopener noreferrer">
                    {profileData.github}
                  </a>
                </li>
              {/if}
              {#if profileData.twitter}
                <li>
                  <strong>Twitter:</strong> 
                  <a href={`https://twitter.com/${profileData.twitter}`} target="_blank" rel="noopener noreferrer">
                    @{profileData.twitter}
                  </a>
                </li>
              {/if}
              {#if profileData.website}
                <li>
                  <strong>Website:</strong> 
                  <a href={profileData.website} target="_blank" rel="noopener noreferrer">
                    {profileData.website}
                  </a>
                </li>
              {/if}
            </ul>
          </div>
        {/if}
      {:else}
        <p class="no-profile">No profile data yet. Click 'Edit Profile' to get started.</p>
      {/if}
      
      <button onclick={toggleEditMode} class="edit-button">
        Edit Profile
      </button>
    </div>
  {:else}
    <form onsubmit={(e) => { e.preventDefault(); saveProfile(e); }} class="profile-form">
      <div class="form-group">
        <label for="name">Name</label>
        <input
          type="text"
          id="name"
          placeholder="Your name"
          bind:value={formData.name}
        />
      </div>
      
      <div class="form-group">
        <label for="email">Email</label>
        <input
          type="email"
          id="email"
          placeholder="your.email@example.com"
          bind:value={formData.email}
        />
      </div>
      
      <div class="form-group">
        <label for="bio">Bio</label>
        <textarea
          id="bio"
          placeholder="Tell us about yourself"
          rows="3"
          bind:value={formData.bio}
        ></textarea>
      </div>
      
      <div class="form-group">
        <label for="location">Location</label>
        <input
          type="text"
          id="location"
          placeholder="City, Country"
          bind:value={formData.location}
        />
      </div>
      
      <div class="form-group">
        <label for="github">GitHub Username</label>
        <input
          type="text"
          id="github"
          placeholder="username"
          bind:value={formData.github}
        />
      </div>
      
      <div class="form-group">
        <label for="twitter">Twitter Username</label>
        <input
          type="text"
          id="twitter"
          placeholder="username (without @)"
          bind:value={formData.twitter}
        />
      </div>
      
      <div class="form-group">
        <label for="website">Website</label>
        <input
          type="url"
          id="website"
          placeholder="https://example.com"
          bind:value={formData.website}
        />
      </div>
      
      <div class="form-actions">
        <button type="button" onclick={toggleEditMode} class="cancel-button">
          Cancel
        </button>
        <button type="submit" class="save-button">
          Save Profile
        </button>
      </div>
    </form>
  {/if}
</div>

<style>
  .user-profile {
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
  
  .profile-card {
    background: #f9f9f9;
    border-radius: var(--border-radius);
    padding: 20px;
  }
  
  .profile-header {
    margin-bottom: 20px;
    border-bottom: 1px solid var(--border-color);
    padding-bottom: 10px;
  }
  
  .profile-header h3 {
    margin: 0;
    font-size: 1.5rem;
  }
  
  .email, .location {
    margin: 5px 0;
    color: #666;
  }
  
  .profile-section {
    margin-bottom: 15px;
  }
  
  .profile-section h4 {
    margin-bottom: 5px;
    font-size: 1.1rem;
    color: #444;
  }
  
  .links {
    list-style: none;
    padding: 0;
  }
  
  .links li {
    margin-bottom: 5px;
  }
  
  .edit-button {
    margin-top: 20px;
  }
  
  .no-profile {
    font-style: italic;
    color: #888;
    margin-bottom: 20px;
  }
  
  .profile-form {
    background: #f9f9f9;
    border-radius: var(--border-radius);
    padding: 20px;
  }
  
  .cancel-button {
    background-color: #aaa;
  }
  
  .save-button {
    background-color: var(--primary-color);
  }
</style> 