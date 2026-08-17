import { exec } from 'child_process';

const recordVideo = process.env.VIDEO === 'true';
const headed = process.env.HEADED === 'true';

const videoEnv = recordVideo ? 'VIDEO=true' : 'VIDEO=false';
const headedFlag = headed ? ':headed' : '';

const commands = [
    `ONLY_BRAND=sea-doo BLOCK_TRACKING=true ${videoEnv} npm run test:promotion${headedFlag}`,
    // `ONLY_BRAND=ski-doo BLOCK_TRACKING=true ${videoEnv} npm run test:promotion${headedFlag}`,
    // `ONLY_BRAND=lynx BLOCK_TRACKING=true ${videoEnv} npm run test:promotion${headedFlag}`,
    // `ONLY_BRAND=can-am BLOCK_TRACKING=true ${videoEnv} npm run test:promotion${headedFlag}`,

];

commands.forEach(cmd => {
  const process = exec(cmd);

  process.stdout?.on('data', data => {
    console.log(data);
  });

  process.stderr?.on('data', data => {
    console.error(data);
  });
});