import { DiscordSDK } from '@discord/embedded-app-sdk';

let instanceId = null;
let discordUser = null;

export async function initDiscord() {
  const clientId = import.meta.env.VITE_DISCORD_CLIENT_ID;
  if (!clientId) return;

  try {
    const sdk = new DiscordSDK(clientId);
    await sdk.ready();
    instanceId = sdk.instanceId;

    // Demande l'autorisation (silencieuse si déjà autorisé)
    const { code } = await sdk.commands.authorize({
      client_id: clientId,
      response_type: 'code',
      state: '',
      prompt: 'none',
      scope: ['identify'],
    });

    // Échange le code contre un access token via notre serveur
    const tokenRes = await fetch('/api/discord/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    });
    const { access_token } = await tokenRes.json();

    // Authentifie le SDK et récupère les infos utilisateur
    const auth = await sdk.commands.authenticate({ access_token });
    discordUser = auth.user;
  } catch (e) {
    console.warn('Discord init failed:', e);
  }
}

export function getDiscordInstanceId() { return instanceId; }
export function getDiscordUser() { return discordUser; }
