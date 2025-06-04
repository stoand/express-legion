import { initApp } from './app';

async function main() {
  const port = 3000;
  const app = await initApp();

  app.listen(port);

  console.log('Running app on port ' + port);
}

main();
