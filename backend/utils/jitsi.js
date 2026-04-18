/**
 * Generates a room URL on jitsi.riot.im (Element/Matrix hosted Jitsi).
 * Uses anonymous authentication — no moderator login required.
 * Any participant can join directly without waiting for a moderator.
 */
function generateJitsiRoom() {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  let suffix = '';
  for (let i = 0; i < 14; i++) {
    suffix += chars[Math.floor(Math.random() * chars.length)];
  }
  return `https://jitsi.riot.im/nexus-${suffix}`;
}

module.exports = { generateJitsiRoom };
