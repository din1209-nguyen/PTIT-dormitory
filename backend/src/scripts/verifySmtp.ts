import { verifyMailProvider } from '../integrations/mail/mail.client.js';

async function main() {
  const verified = await verifyMailProvider();
  process.exit(verified ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
