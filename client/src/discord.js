import { DiscordSDK } from '@discord/embedded-app-sdk';

let instanceId = null;
let discordUser = null;

export async function initDiscord() {
  // __DISCORD_CLIENT_ID__ est injecté par vite.config.js depuis DISCORD_CLIENT_ID sur Render
  const clientId = __DISCORD_CLIENT_ID__;
  if (!clientId) return;

  try {
    const sdk = new DiscordSDK(clientId);
    await sdk.ready();
    instanceId = sdk.instanceId;

    const { code } = await sdk.commands.authorize({
      client_id: clientId,
      response_type: 'code',
      state: '',
      prompt: 'none',
      scope: ['identify'],
    });

    const tokenRes = await fetch('/api/discord/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    });
    const { access_token } = await tokenRes.json();

    const auth = await sdk.commands.authenticate({ access_token });
    discordUser = auth.user;
  } catch (e) {
    console.warn('Discord init:', e.message);
  }
}

export function getDiscordInstanceId() { return instanceId; }
export function getDiscordUser() { return discordUser; }
