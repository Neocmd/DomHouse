import 'dotenv/config'

export const config = {
  mqtt: {
    url: process.env.MQTT_URL ?? 'mqtt://localhost:1883',
    clientId: `domhouse-agent-${process.pid}`,
    reconnectPeriod: 3000,
    keepalive: 60,
  },
  redis: {
    url: process.env.REDIS_URL ?? 'redis://localhost:6379',
  },
  influxdb: {
    url: process.env.INFLUXDB_URL ?? 'http://localhost:8086',
    token: process.env.INFLUXDB_TOKEN ?? 'domhouse-influx-token',
    org: process.env.INFLUXDB_ORG ?? 'domhouse',
    bucket: process.env.INFLUXDB_BUCKET ?? 'sensors',
  },
  api: {
    port: Number(process.env.API_PORT ?? 3000),
    host: '0.0.0.0',
  },
  topics: {
    systemState: 'domhouse/system/state',
    events: 'domhouse/events',
    scenarioTrigger: 'domhouse/scenarios/+/trigger',
    deviceState: 'home/+/+/+/state',
    deviceSet: (room: string, type: string, id: string) =>
      `home/${room}/${type}/${id}/set`,
    deviceConfig: 'home/+/+/+/config',
  },
} as const
