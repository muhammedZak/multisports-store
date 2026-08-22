import { printSeedError } from './seed.utils.js';
import { verifySeedFoundation } from './seed.validation.js';

async function runSeedFoundation() {
  try {
    await verifySeedFoundation({ mode: 'foundation verification' });
  } catch (error) {
    printSeedError(error);
    process.exitCode = 1;
  }
}

await runSeedFoundation();
