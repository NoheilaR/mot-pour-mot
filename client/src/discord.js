import { DiscordSDK } from '@discord/embedded-app-sdk';

let instanceId = null;
let discordUser = null;

export async function initDiscord() {
  try {
    // Récupère le client ID depuis le serveur (plus fiable que le build-time env var)
    const configRes = await fetch('/api/config');
    const { discordClientId } = await configRes.json();
    if (!discordClientId) return;

    const sdk = new DiscordSDK(discordClientId);
    await sdk.ready();
    instanceId = sdk.instanceId;

    const { code } = await sdk.commands.authorize({
      client_id: discordClientId,
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
    console.warn('Discord init failed:', e);
  }
}

export function getDiscordInstanceId() { return instanceId; }
export function getDiscordUser() { return discordUser; }
