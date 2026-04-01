/**
 * Google Drive Integration Service
 */

const GOOGLE_DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';

export async function initiateGoogleAuth() {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  if (!clientId) {
    throw new Error("Google Client ID is missing. Please add VITE_GOOGLE_CLIENT_ID to your Secrets in the AI Studio Settings menu.");
  }

  const redirectUri = `${window.location.origin}/auth/callback`;
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` + 
    new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'token', // Using implicit flow for simplicity in this demo
      scope: GOOGLE_DRIVE_SCOPE,
      include_granted_scopes: 'true',
      state: 'drive_export'
    }).toString();

  const authWindow = window.open(authUrl, 'google_auth_popup', 'width=600,height=700');
  
  if (!authWindow) {
    throw new Error("Popup blocked. Please allow popups to sign in with Google.");
  }

  return new Promise<string>((resolve, reject) => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        window.removeEventListener('message', handleMessage);
        resolve(event.data.accessToken);
      } else if (event.data?.type === 'OAUTH_AUTH_ERROR') {
        window.removeEventListener('message', handleMessage);
        reject(new Error(event.data.error || "Authentication failed"));
      }
    };
    
    window.addEventListener('message', handleMessage);
    
    // Cleanup if window is closed manually
    const checkClosed = setInterval(() => {
      if (authWindow.closed) {
        clearInterval(checkClosed);
        window.removeEventListener('message', handleMessage);
        reject(new Error("Authentication cancelled: The sign-in window was closed."));
      }
    }, 1000);
  });
}

export async function uploadToDrive(accessToken: string, fileName: string, content: string, asGoogleDoc: boolean = false) {
  const metadata: any = {
    name: fileName,
    mimeType: asGoogleDoc ? 'application/vnd.google-apps.document' : 'text/markdown',
  };

  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', new Blob([content], { type: asGoogleDoc ? 'text/html' : 'text/markdown' }));

  const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: form,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const message = errorData.error?.message || response.statusText || 'Unknown error';
    throw new Error(`Google Drive Upload Failed: ${message} (Status: ${response.status})`);
  }

  return await response.json();
}
