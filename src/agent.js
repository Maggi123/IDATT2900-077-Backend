import { Agent, ConsoleLogger, DidsModule, LogLevel } from "@credo-ts/core";
import { agentDependencies } from "@credo-ts/node";
import {
  IndyVdrIndyDidRegistrar,
  IndyVdrIndyDidResolver,
  IndyVdrModule,
} from "@credo-ts/indy-vdr";
import { indyVdr } from "@hyperledger/indy-vdr-nodejs";
import { AskarModule } from "@credo-ts/askar";
import { ariesAskar } from "@hyperledger/aries-askar-nodejs";
import axios from "axios";

export async function initializeAgent() {
  try {
    const transactionsRq = await axios.get(
      "http://" + process.env.BACKEND_INDY_NETWORK_IP + ":9000/genesis",
    );
    const transactions = transactionsRq.data;

    const agent = new Agent({
      config: {
        label: "backend-wallet",
        walletConfig: {
          id: "backend",
          key: process.env.BACKEND_WALLET_KEY,
        },
        logger: new ConsoleLogger(LogLevel.test),
      },
      dependencies: agentDependencies,
      modules: {
        indyVdr: new IndyVdrModule({
          indyVdr,
          networks: [
            {
              isProduction: false,
              indyNamespace: "local",
              genesisTransactions: transactions,
              connectOnStartup: true,
            },
          ],
        }),
        askar: new AskarModule({
          ariesAskar,
        }),
        dids: new DidsModule({
          resolvers: [new IndyVdrIndyDidResolver()],
          registrars: [new IndyVdrIndyDidRegistrar()],
        }),
      },
    });

    await agent.initialize();

    return agent;
  } catch (error) {
    console.error(error);
  }
}
