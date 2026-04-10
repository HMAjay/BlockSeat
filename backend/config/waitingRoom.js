// Redis-backed waiting room with JWT queue passes and in-memory fallback for tests/dev.
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const { createClient } = require("redis");

const QUEUE_SCOPE = "checkout";
const MAX_ACTIVE_PASSES = Number(process.env.QUEUE_MAX_ACTIVE_CHECKOUTS || 25);
const PASS_TTL_SECONDS = Number(process.env.QUEUE_PASS_TTL_SECONDS || 180);
const WAIT_TTL_SECONDS = Number(process.env.QUEUE_WAIT_TTL_SECONDS || 1800);
const STATUS_MIN_POLL_MS = Number(process.env.QUEUE_STATUS_MIN_POLL_MS || 1500);
const QUEUE_PASS_SECRET = process.env.QUEUE_PASS_SECRET || process.env.JWT_SECRET;
const IS_PRODUCTION = process.env.NODE_ENV === "production";

const memory = {
  active: new Map(),
  waiting: [],
  passes: new Map(),
  poll: new Map()
};

let redisClientPromise = null;

class WaitingRoomUnavailableError extends Error {
  constructor(message) {
    super(message);
    this.name = "WaitingRoomUnavailableError";
    this.code = "WAITING_ROOM_UNAVAILABLE";
  }
}

const queuePrefix = (scope) => `blockseat:queue:${scope}`;
const activeKey = (scope) => `${queuePrefix(scope)}:active`;
const waitingKey = (scope) => `${queuePrefix(scope)}:waiting`;
const passKey = (scope, queueId) => `${queuePrefix(scope)}:pass:${queueId}`;
const waiterKey = (scope, queueId) => `${queuePrefix(scope)}:waiter:${queueId}`;
const pollKey = (scope, queueId, bstId) => `${queuePrefix(scope)}:poll:${queueId}:${bstId}`;

const isWaitingRoomUnavailable = (error) => error?.code === "WAITING_ROOM_UNAVAILABLE";

const buildQueueToken = (bstId, queueId, scope = QUEUE_SCOPE) =>
  jwt.sign({ bstId, scope, queueId }, QUEUE_PASS_SECRET, { expiresIn: PASS_TTL_SECONDS });

const getRedisClient = async () => {
  if (!process.env.REDIS_URL) {
    if (IS_PRODUCTION) {
      throw new WaitingRoomUnavailableError("REDIS_URL is required in production");
    }
    return null;
  }

  if (!redisClientPromise) {
    const client = createClient({ url: process.env.REDIS_URL });
    client.on("error", (error) => {
      console.warn(`[BlockSeat] Redis error: ${error.message}`);
    });
    redisClientPromise = client
      .connect()
      .then(() => client)
      .catch((error) => {
        if (IS_PRODUCTION) {
          throw new WaitingRoomUnavailableError(`Redis unavailable in production: ${error.message}`);
        }
        console.warn(`[BlockSeat] Redis unavailable, using in-memory waiting room: ${error.message}`);
        return null;
      });
  }

  return redisClientPromise;
};

const pruneMemoryActive = () => {
  const now = Date.now();
  for (const [queueId, expiresAt] of memory.active.entries()) {
    if (expiresAt <= now) {
      memory.active.delete(queueId);
      memory.passes.delete(queueId);
    }
  }
};

const pruneMemoryPoll = () => {
  const now = Date.now();
  for (const [key, expiresAt] of memory.poll.entries()) {
    if (expiresAt <= now) {
      memory.poll.delete(key);
    }
  }
};

const issueMemoryPass = (bstId, scope = QUEUE_SCOPE, queueId = crypto.randomUUID()) => {
  const expiresAt = Date.now() + PASS_TTL_SECONDS * 1000;
  const queuePass = buildQueueToken(bstId, queueId, scope);
  memory.active.set(queueId, expiresAt);
  memory.passes.set(queueId, { bstId, scope, expiresAt });
  return { allowed: true, queueId, queuePass, expiresInSeconds: PASS_TTL_SECONDS };
};

const joinMemoryQueue = (bstId, scope = QUEUE_SCOPE) => {
  pruneMemoryActive();
  if (memory.waiting.length === 0 && memory.active.size < MAX_ACTIVE_PASSES) {
    return issueMemoryPass(bstId, scope);
  }

  const queueId = crypto.randomUUID();
  memory.waiting.push({ queueId, bstId, scope, joinedAt: Date.now() });
  return {
    allowed: false,
    waiting: true,
    queueId,
    position: memory.waiting.length,
    retryAfterMs: 2500
  };
};

const claimMemoryQueuePass = (queueId, bstId, scope = QUEUE_SCOPE) => {
  pruneMemoryActive();
  const entry = memory.passes.get(queueId);
  if (!entry || entry.bstId !== bstId || entry.scope !== scope) return false;
  memory.active.delete(queueId);
  memory.passes.delete(queueId);
  return true;
};

const getMemoryQueueStatus = (queueId, bstId, scope = QUEUE_SCOPE) => {
  pruneMemoryActive();
  const pass = memory.passes.get(queueId);
  if (pass && pass.bstId === bstId && pass.scope === scope) {
    return { allowed: true, queueId, queuePass: buildQueueToken(bstId, queueId, scope), expiresInSeconds: PASS_TTL_SECONDS };
  }

  const position = memory.waiting.findIndex((entry) => entry.queueId === queueId && entry.bstId === bstId && entry.scope === scope);
  if (position === -1) {
    return { allowed: false, expired: true };
  }

  if (position === 0 && memory.active.size < MAX_ACTIVE_PASSES) {
    memory.waiting.shift();
    return issueMemoryPass(bstId, scope, queueId);
  }

  return {
    allowed: false,
    waiting: true,
    queueId,
    position: position + 1,
    retryAfterMs: 2500
  };
};

const allowMemoryQueueStatusPoll = (queueId, bstId, scope = QUEUE_SCOPE) => {
  pruneMemoryPoll();
  const key = `${scope}:${queueId}:${bstId}`;
  const now = Date.now();
  const existing = memory.poll.get(key);
  if (existing && existing > now) {
    return false;
  }
  memory.poll.set(key, now + STATUS_MIN_POLL_MS);
  return true;
};

const pruneRedisActive = async (client, scope = QUEUE_SCOPE) => {
  const key = activeKey(scope);
  const now = Date.now();
  const expired = await client.zRangeByScore(key, 0, now - 1);
  if (!expired.length) return;

  const multi = client.multi();
  multi.zRem(key, expired);
  expired.forEach((queueId) => multi.del(passKey(scope, queueId)));
  await multi.exec();
};

const pruneRedisWaiting = async (client, scope = QUEUE_SCOPE, limit = 200) => {
  const ids = await client.zRange(waitingKey(scope), 0, Math.max(0, limit - 1));
  if (!ids.length) return;

  const multi = client.multi();
  ids.forEach((queueId) => multi.exists(waiterKey(scope, queueId)));
  const results = await multi.exec();

  const staleIds = [];
  results.forEach((result, index) => {
    const existsValue = Array.isArray(result) ? result[1] : result;
    if (Number(existsValue) === 0) {
      staleIds.push(ids[index]);
    }
  });

  if (staleIds.length) {
    await client.zRem(waitingKey(scope), staleIds);
  }
};

const issueRedisPass = async (client, bstId, scope = QUEUE_SCOPE, queueId = crypto.randomUUID()) => {
  const expiresAt = Date.now() + PASS_TTL_SECONDS * 1000;
  const queuePass = buildQueueToken(bstId, queueId, scope);
  const multi = client.multi();
  multi.set(passKey(scope, queueId), JSON.stringify({ bstId, scope }), { EX: PASS_TTL_SECONDS });
  multi.zAdd(activeKey(scope), [{ score: expiresAt, value: queueId }]);
  await multi.exec();

  return { allowed: true, queueId, queuePass, expiresInSeconds: PASS_TTL_SECONDS };
};

const joinRedisQueue = async (client, bstId, scope = QUEUE_SCOPE) => {
  await pruneRedisActive(client, scope);
  await pruneRedisWaiting(client, scope);

  const queueId = crypto.randomUUID();
  const now = Date.now();
  const expiresAt = now + PASS_TTL_SECONDS * 1000;
  const script = `
    local waitingKey = KEYS[1]
    local activeKey = KEYS[2]
    local waiterKey = KEYS[3]
    local passKey = KEYS[4]

    local now = tonumber(ARGV[1])
    local maxActive = tonumber(ARGV[2])
    local waitTtl = tonumber(ARGV[3])
    local passTtl = tonumber(ARGV[4])
    local bstId = ARGV[5]
    local scope = ARGV[6]
    local queueId = ARGV[7]
    local expiresAt = tonumber(ARGV[8])

    redis.call('ZREMRANGEBYSCORE', activeKey, '-inf', now - 1)
    local waitingCount = redis.call('ZCARD', waitingKey)
    local activeCount = redis.call('ZCARD', activeKey)

    if waitingCount == 0 and activeCount < maxActive then
      redis.call('SET', passKey, cjson.encode({ bstId = bstId, scope = scope }), 'EX', passTtl)
      redis.call('ZADD', activeKey, expiresAt, queueId)
      return {1, 0}
    end

    redis.call('HSET', waiterKey, 'bstId', bstId, 'scope', scope, 'joinedAt', tostring(now))
    redis.call('EXPIRE', waiterKey, waitTtl)
    redis.call('ZADD', waitingKey, now, queueId)
    return {0, waitingCount + 1}
  `;

  const result = await client.eval(script, {
    keys: [waitingKey(scope), activeKey(scope), waiterKey(scope, queueId), passKey(scope, queueId)],
    arguments: [
      String(now),
      String(MAX_ACTIVE_PASSES),
      String(WAIT_TTL_SECONDS),
      String(PASS_TTL_SECONDS),
      bstId,
      scope,
      queueId,
      String(expiresAt),
    ],
  });

  const granted = Number(result?.[0]) === 1;

  if (granted) {
    return {
      allowed: true,
      queueId,
      queuePass: buildQueueToken(bstId, queueId, scope),
      expiresInSeconds: PASS_TTL_SECONDS,
    };
  }

  return {
    allowed: false,
    waiting: true,
    queueId,
    position: Number(result?.[1]) || 1,
    retryAfterMs: 2500
  };
};

const claimRedisQueuePass = async (client, queueId, bstId, scope = QUEUE_SCOPE) => {
  await pruneRedisActive(client, scope);
  const stored = await client.get(passKey(scope, queueId));
  if (!stored) return false;

  const payload = JSON.parse(stored);
  if (payload.bstId !== bstId || payload.scope !== scope) return false;

  const multi = client.multi();
  multi.del(passKey(scope, queueId));
  multi.zRem(activeKey(scope), queueId);
  await multi.exec();
  return true;
};

const getRedisQueueStatus = async (client, queueId, bstId, scope = QUEUE_SCOPE) => {
  await pruneRedisActive(client, scope);
  await pruneRedisWaiting(client, scope);
  const stored = await client.get(passKey(scope, queueId));
  if (stored) {
    const payload = JSON.parse(stored);
    if (payload.bstId === bstId && payload.scope === scope) {
      return { allowed: true, queueId, queuePass: buildQueueToken(bstId, queueId, scope), expiresInSeconds: PASS_TTL_SECONDS };
    }
  }

  const rank = await client.zRank(waitingKey(scope), queueId);
  if (rank === null) {
    return { allowed: false, expired: true };
  }

  const activeCount = await client.zCard(activeKey(scope));
  if (rank === 0 && activeCount < MAX_ACTIVE_PASSES) {
    const waiterRecordKey = waiterKey(scope, queueId);
    const waiter = await client.hGetAll(waiterRecordKey);
    if (!waiter || waiter.bstId !== bstId || waiter.scope !== scope) {
      const staleMulti = client.multi();
      staleMulti.zRem(waitingKey(scope), queueId);
      staleMulti.del(waiterRecordKey);
      await staleMulti.exec();
      return { allowed: false, expired: true };
    }

    const multi = client.multi();
    multi.zRem(waitingKey(scope), queueId);
    multi.del(waiterRecordKey);
    await multi.exec();
    return issueRedisPass(client, bstId, scope, queueId);
  }

  return {
    allowed: false,
    waiting: true,
    queueId,
    position: rank + 1,
    retryAfterMs: 2500
  };
};

const allowRedisQueueStatusPoll = async (client, queueId, bstId, scope = QUEUE_SCOPE) => {
  const created = await client.set(
    pollKey(scope, queueId, bstId),
    "1",
    { PX: STATUS_MIN_POLL_MS, NX: true }
  );
  return created === "OK";
};

const joinCheckoutQueue = async (bstId) => {
  const client = await getRedisClient();
  return client ? joinRedisQueue(client, bstId) : joinMemoryQueue(bstId);
};

const getCheckoutQueueStatus = async (queueId, bstId) => {
  const client = await getRedisClient();
  return client ? getRedisQueueStatus(client, queueId, bstId) : getMemoryQueueStatus(queueId, bstId);
};

const claimCheckoutQueuePass = async (queueId, bstId) => {
  const client = await getRedisClient();
  return client ? claimRedisQueuePass(client, queueId, bstId) : claimMemoryQueuePass(queueId, bstId);
};

const allowQueueStatusPoll = async (queueId, bstId) => {
  const client = await getRedisClient();
  return client ? allowRedisQueueStatusPoll(client, queueId, bstId) : allowMemoryQueueStatusPoll(queueId, bstId);
};

module.exports = {
  QUEUE_SCOPE,
  QUEUE_PASS_SECRET,
  PASS_TTL_SECONDS,
  WAIT_TTL_SECONDS,
  STATUS_MIN_POLL_MS,
  MAX_ACTIVE_PASSES,
  isWaitingRoomUnavailable,
  joinCheckoutQueue,
  getCheckoutQueueStatus,
  claimCheckoutQueuePass,
  allowQueueStatusPoll,
};