# Runbook Template

## Incident: [TITLE]

**Severity**: [P1/P2/P3/P4]
**Created**: [Date]
**Last Updated**: [Date]

---

### 1. Symptoms

- What does the user/team observe?
- Which alerts fire?

### 2. Impact

- Who is affected?
- What functionality is degraded?

### 3. Diagnosis Steps

1. Check health endpoint: `curl https://[HOST]/api/v1/health`
2. Check readiness: `curl https://[HOST]/api/v1/readiness`
3. Review logs: `[log aggregator command]`
4. Check metrics: `curl https://[HOST]/api/v1/metrics`

### 4. Resolution Steps

1. Step-by-step instructions
2. Include commands where applicable
3. Note any rollback procedures

### 5. Post-Incident

- [ ] Update this runbook if steps changed
- [ ] File ticket for root cause fix
- [ ] Schedule post-mortem if P1/P2
