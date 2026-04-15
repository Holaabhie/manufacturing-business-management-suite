# Runbook: Database Connection Failure

**Severity**: P1
**Last Updated**: 2026-02-18

---

## Symptoms

- Health endpoint returns `"unhealthy"` with `database.status: "unhealthy"`
- Readiness probe returns 503
- API responses return 500 errors with `"Database connection failed"`
- Logs show `MongoNetworkError` or `MongoServerSelectionError`

## Impact

- **Full outage**: All API operations requiring database access fail
- Users cannot log in, view inventory, create orders, etc.

## Diagnosis Steps

1. **Check health endpoint**:
   ```bash
   curl -s https://[HOST]/api/v1/health | jq .
   ```
   Look at `checks.database.status`.

2. **Check MongoDB connection string**:
   Verify `MONGODB_URI` environment variable is correct.

3. **Check MongoDB Atlas status**:
   Visit [MongoDB Atlas Status](https://status.mongodb.com/)

4. **Check network connectivity**:
   ```bash
   # From the application server
   nc -zv [mongodb-host] 27017
   ```

5. **Review application logs**:
   Search for `MongoNetworkError`, `MongoServerSelectionError`, or `ECONNREFUSED`.

## Resolution Steps

1. **If MongoDB Atlas is down**:
   Wait for Atlas to recover. Monitor status page.

2. **If connection string is wrong**:
   Update the `MONGODB_URI` environment variable and restart the application.

3. **If network issue**:
   Check VPN, firewall rules, and IP allowlist on MongoDB Atlas.

4. **If connection pool exhausted**:
   Restart the application. Consider increasing pool size in connection options.

## Post-Incident

- [ ] Verify health endpoint returns healthy
- [ ] Check recent orders/inventory operations completed successfully
- [ ] Review connection pool metrics for capacity planning
