const netflix = require("./netflix.js");
var CronJob = require("cron").CronJob;
const { setTimeout } = require("node:timers/promises");
const router = require("./router.js");

const DELAY_AFTER_RESET_MIN = 5;
const SESSION_DURATION_MIN = 130;
const DELAY_BEFORE_RETRY_MIN = 1;
const SHOULD_RESET_ROUTER = false;

async function resetRouterAndWait() {
  if (SHOULD_RESET_ROUTER) {
    await router.reset();
    await setTimeout(1000 * 60 * DELAY_AFTER_RESET_MIN);
  }
}

async function runNetflix(videoId, duration = SESSION_DURATION_MIN) {
  await resetRouterAndWait();

  let nRetries = 0;
  while (true) {
    try {
      await netflix.run({
        videoId,
        sessionDurationInMin: duration,
      });
      break;
    } catch (e) {
      console.log(e);
      console.log(new Error().stack);
    }

    nRetries++;
    if (nRetries === 3) {
      await resetRouterAndWait();
    } else if (nRetries === 5) {
      break;
    } else {
      await setTimeout(1000 * 60 * DELAY_BEFORE_RETRY_MIN);
    }
  }
}

function scheduleNetflix(cronTime, videoId, duration = SESSION_DURATION_MIN) {
  new CronJob(
    cronTime,
    async function () {
      await runNetflix(videoId, duration);
    },
    null,
    true,
    "Asia/Jerusalem"
  ).start();
}

// (async () => {
//   await runNetflix(80184100);
// })();

/** SESSION SCHEDULING */
scheduleNetflix("2 17 1 * *", 80184100);
