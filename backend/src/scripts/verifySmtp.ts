import { verifyMailTransporter } from '../integrations/mail/mail.client.js';

async function main() {
  const verified = await verifyMailTransporter();
  process.exit(verified ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
