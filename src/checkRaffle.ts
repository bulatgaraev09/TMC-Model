// src/checkRaffle.ts
import { loadModelFromXml } from "./xmlConfig";
import {
  forecastRaffle,
  evaluateHealth,
  SnapshotMetrics,
} from "./raffleModel";

const [
  ,,
  raffleId,
  dayStr,
  gmvStr,
  spendStr,
  newStr,
  retStr,
  ordersStr,
  acqSpendStr,
] = process.argv;

if (!raffleId) {
  console.error(
    "Usage: ts-node src/checkRaffle.ts <raffleId> <day> <gmv> <spend> <newUsers> <retUsers> <orders> [acquisitionSpend]"
  );
  process.exit(1);
}

const day = Number(dayStr ?? 1);
const gmv = Number(gmvStr ?? 0);
const spend = Number(spendStr ?? 0);
const newUsers = Number(newStr ?? 0);
const retUsers = Number(retStr ?? 0);
const orders = Number(ordersStr ?? 0);
const acqSpend = acqSpendStr ? Number(acqSpendStr) : undefined;

const { raffles, thresholds } = loadModelFromXml("raffle_health_config.xml");
const cfg = raffles.get(raffleId);

if (!cfg) {
  console.error(`Raffle ${raffleId} not found in XML`);
  process.exit(1);
}

const forecast = forecastRaffle(cfg);

const snapshot: SnapshotMetrics = {
  dayNumber: day,
  gmvToDate: gmv,
  spendToDate: spend,
  newCustomersToDate: newUsers,
  retainedCustomersToDate: retUsers,
  ordersToDate: orders,
  acquisitionSpendToDate: acqSpend,
};

const health = evaluateHealth(cfg, forecast, snapshot, thresholds);

console.log(
  JSON.stringify(
    {
      raffleId,
      config: cfg,
      forecast,
      health,
    },
    null,
    2
  )
);
