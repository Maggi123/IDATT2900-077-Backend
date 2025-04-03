import { setupApp } from "./app.js";
import { getBackendPort } from "./util/networkUtil.js";

const port = getBackendPort();
const [app, logger] = await setupApp();

app.listen(port, () => {
  logger.info(`Server listening on port ${port}`);
});
