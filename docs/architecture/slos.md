# Service Level Objectives (SLOs)

## API Availability

| Metric | Target | Measurement |
|--------|--------|-------------|
| Uptime | 99.5% | Monthly, measured via health endpoint |
| API Latency P95 | < 500ms | Measured via metrics collector |
| API Latency P99 | < 2000ms | Measured via metrics collector |
| Error Rate (5xx) | < 1% | Total 5xx responses / total requests |

## Health Endpoints

| Endpoint | Purpose | Expected Response Time |
|----------|---------|----------------------|
| `GET /api/v1/health` | Liveness probe | < 100ms |
| `GET /api/v1/readiness` | Readiness probe | < 500ms |

## Database

| Metric | Target |
|--------|--------|
| MongoDB Connection Pool Health | > 90% available connections |
| Query Latency P95 | < 200ms |
| Memory Usage | < 80% of available heap |

## Recovery Targets

| Scenario | RTO | RPO |
|----------|-----|-----|
| Application crash | 5 minutes | 0 (stateless app) |
| Database failover | 10 minutes | < 1 minute (replica set) |
| Full region outage | 1 hour | < 5 minutes |

## Alerting Thresholds

| Condition | Severity | Action |
|-----------|----------|--------|
| Health endpoint returns unhealthy | Critical | Page on-call |
| Error rate > 5% for 5 minutes | Warning | Notify team |
| Memory > 85% | Warning | Investigate |
| MongoDB connection failures | Critical | Page on-call |
