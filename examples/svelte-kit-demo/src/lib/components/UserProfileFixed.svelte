<script>
  import { safeGet } from '$lib/svgun';
  import { gun, userProfileRef } from '$lib/svgun/GunContext';
  
  // Profile data state
  let profile = $state({});
  let loading = $state(true);
  let initialized = $state(false);
  let errorMessage = $state('');
  
  // Subscribe to the gun instance
  gun.subscribe($gun => {
    console.log('Gun instance in UserProfile:', $gun ? 'available' : 'unavailable');
    loading = !$gun;
    
    if (!$gun) {
      errorMessage = 'Gun database not available';
    } else {
      errorMessage = '';
    }
  });
  
  // Subscribe to the user profile
  const unsubscribeProfile = userProfileRef.subscribe($userRef => {
    console.log('User profile reference:', $userRef ? 'available' : 'unavailable');
    
    if ($userRef) {
      try {
        // Create a clean-up function for the subscription
        const unsub = $userRef.on((data) => {
          if (data) {
            profile = data;
            initialized = true;
            loading = false;
          }
        });
        
        return () => {
          try {
            // Clean up the subscription when the component is destroyed
            if (typeof unsub === 'function') {
              unsub();
            }
          } catch (error) {
            console.warn('Error cleaning up profile subscription:', error);
          }
        };
      } catch (error) {
        console.error('Error setting up profile subscription:', error);
        errorMessage = 'Failed to subscribe to profile data';
        loading = false;
      }
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
      formData = {
        name: safeGet(profile, 'name', ''),
        email: safeGet(profile, 'email', ''),
        bio: safeGet(profile, 'bio', ''),
        location: safeGet(profile, 'location', ''),
        github: safeGet(profile, 'github', ''),
        twitter: safeGet(profile, 'twitter', ''),
        website: safeGet(profile, 'website', '')
      };
      isEditMode = true;
    }
  }
  
  // Save profile data
  function saveProfile(e) {
    e.preventDefault();
    if (!$gun) {
      errorMessage = 'Cannot save: Gun database not available';
      return;
    }
    
    try {
      $gun.get('userProfile').put(formData);
      isEditMode = false;
    } catch (error) {
      console.error('Error saving profile:', error);
      errorMessage = 'Failed to save profile';
    }
  }
</script>

<div class="user-profile">
  <h2>User Profile - svgun-lib Powered</h2>
  <p class="api-info">Using shared Gun instance with Svelte 5 compatibility</p>
  
  {#if loading}
    <div class="loading">
      <p>Loading user profile...</p>
    </div>
  {:else if errorMessage}
    <div class="error">
      <p>{errorMessage}</p>
      <button onclick={() => window.location.reload()}>Refresh Page</button>
    </div>
  {:else if !isEditMode}
    <div class="profile-card">
      {#if profile.name || profile.email || profile.location || profile.bio || profile.github || profile.twitter || profile.website}
        <div class="profile-header">
          <h3>{profile.name || 'Anonymous User'}</h3>
          {#if profile.email}
            <p class="email">{profile.email}</p>
          {/if}
          {#if profile.location}
            <p class="location">{profile.location}</p>
          {/if}
        </div>
        
        {#if profile.bio}
          <div class="profile-section">
            <h4>Bio</h4>
            <p>{profile.bio}</p>
          </div>
        {/if}
        
        {#if profile.github || profile.twitter || profile.website}
          <div class="profile-section">
            <h4>Links</h4>
            <ul class="links">
              {#if profile.github}
                <li>
                  <strong>GitHub:</strong> 
                  <a href={`https://github.com/${profile.github}`} target="_blank" rel="noopener noreferrer">
                    {profile.github}
                  </a>
                </li>
              {/if}
              {#if profile.twitter}
                <li>
                  <strong>Twitter:</strong> 
                  <a href={`https://twitter.com/${profile.twitter}`} target="_blank" rel="noopener noreferrer">
                    @{profile.twitter}
                  </a>
                </li>
              {/if}
              {#if profile.website}
                <li>
                  <strong>Website:</strong> 
                  <a href={profile.website} target="_blank" rel="noopener noreferrer">
                    {profile.website}
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
  .loading {
    text-align: center;
    padding: 2rem;
    color: var(--primary-color);
  }
  
  .error {
    text-align: center;
    padding: 2rem;
    color: var(--error-color);
    background-color: rgba(239, 68, 68, 0.1);
    border-radius: var(--border-radius);
    margin-bottom: 1rem;
  }
  
  .error button {
    margin-top: 1rem;
    background-color: var(--primary-color);
  }
</style> 