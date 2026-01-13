import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { create, getNumericDate } from "https://deno.land/x/djwt@v2.8/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ServiceAccountKey {
  client_email: string;
  private_key: string;
  token_uri: string;
}

async function getAccessToken(serviceAccount: ServiceAccountKey): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  
  // Clean up the private key - handle escaped newlines
  const privateKeyPEM = serviceAccount.private_key.replace(/\\n/g, '\n');
  
  // Extract the base64 content from PEM
  const pemContents = privateKeyPEM
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s/g, '');
  
  // Decode base64 to get the raw key bytes
  const binaryKey = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));
  
  // Import the private key
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    binaryKey,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const jwt = await create(
    { alg: 'RS256', typ: 'JWT' },
    {
      iss: serviceAccount.client_email,
      scope: 'https://www.googleapis.com/auth/documents https://www.googleapis.com/auth/drive',
      aud: serviceAccount.token_uri,
      exp: getNumericDate(3600),
      iat: getNumericDate(0),
    },
    cryptoKey
  );
  
  const tokenResponse = await fetch(serviceAccount.token_uri, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });
  
  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text();
    console.error('Token exchange failed:', errorText);
    throw new Error(`Failed to get access token: ${errorText}`);
  }
  
  const tokenData = await tokenResponse.json();
  return tokenData.access_token;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { title, content, folderId } = await req.json();
    
    if (!content) {
      throw new Error('Content is required');
    }

    let serviceAccountJson: string | undefined = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_JSON');
    if (!serviceAccountJson) {
      throw new Error('Google service account credentials not configured');
    }

    // Handle potential double-encoding or extra quotes
    let cleanedJson: string = serviceAccountJson.trim();
    if (cleanedJson.startsWith('"') && cleanedJson.endsWith('"')) {
      cleanedJson = cleanedJson.slice(1, -1);
    }
    // Handle escaped JSON (double-encoded)
    if (cleanedJson.startsWith('\\"') || cleanedJson.includes('\\\"')) {
      cleanedJson = JSON.parse(`"${cleanedJson}"`);
    }
    
    console.log('Parsing service account JSON, first 50 chars:', cleanedJson.substring(0, 50));
    
    const serviceAccount: ServiceAccountKey = JSON.parse(cleanedJson);
    console.log('Getting access token for:', serviceAccount.client_email);
    
    const accessToken = await getAccessToken(serviceAccount);
    console.log('Access token obtained successfully');

    // Step 1: Create a Google Doc using Drive API in the shared folder
    const docTitle = title || 'YouTube Script';
    // Use the shared folder - this is critical since service accounts have no storage quota
    const targetFolderId = folderId || '1rOksmpebbt5gw9G5HhO-2wCvTz1uL74P';
    
    const createDocResponse = await fetch('https://www.googleapis.com/drive/v3/files?supportsAllDrives=true', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: docTitle,
        mimeType: 'application/vnd.google-apps.document',
        parents: [targetFolderId],
      }),
    });

    if (!createDocResponse.ok) {
      const errorText = await createDocResponse.text();
      console.error('Failed to create document via Drive API:', errorText);
      throw new Error(`Failed to create Google Doc: ${errorText}`);
    }

    const driveFile = await createDocResponse.json();
    const documentId = driveFile.id;
    console.log('Document created via Drive API:', documentId);

    // Step 2: Insert the content into the document using Docs API
    const requests = [
      {
        insertText: {
          location: { index: 1 },
          text: content,
        },
      },
    ];

    const updateResponse = await fetch(
      `https://docs.googleapis.com/v1/documents/${documentId}:batchUpdate`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ requests }),
      }
    );

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      console.error('Failed to update document:', errorText);
      throw new Error(`Failed to insert content: ${errorText}`);
    }

    console.log('Content inserted successfully');

    const docUrl = `https://docs.google.com/document/d/${documentId}/edit`;
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        documentId, 
        url: docUrl 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in create-google-doc:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
