import { getBackendPort } from "./util/networkUtil.mjs";
import { setupApp } from "./app.mjs";

// Main server file

const port = getBackendPort();
const [app, logger] = await setupApp();

app.listen(port, () => {
  logger.info(`Server listening on port ${port}`);
});
