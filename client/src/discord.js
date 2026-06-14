import { DiscordSDK } from '@discord/embedded-app-sdk';

let instanceId = null;

export async function initDiscord() {
  const clientId = import.meta.env.VITE_DISCORD_CLIENT_ID;
  if (!clientId) return null;

  try {
    const sdk = new DiscordSDK(clientId);
    await sdk.ready();
    instanceId = sdk.instanceId;
    return instanceId;
  } catch {
    // Pas dans Discord, ou SDK non disponible
    return null;
  }
}

export function getDiscordInstanceId() {
  return instanceId;
}
