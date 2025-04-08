import { getBackendPort } from "./util/networkUtil.mjs";
import { setupApp } from "./app.mjs";

const port = getBackendPort();
const [app, logger] = await setupApp();

app.listen(port, () => {
  logger.info(`Server listening on port ${port}`);
});
