# GitHub Actions Setup for CRM Visit System

## Overview

This guide explains how to configure GitHub Actions to automatically expire stale visit requests every hour.

---

## Prerequisites

- GitHub repository with Actions enabled
- Supabase project URL and anonymous key
- Repository admin access to configure secrets

---

## Step 1: Configure GitHub Secrets

### Navigate to Repository Settings

1. Go to your GitHub repository
2. Click **Settings** tab
3. In the left sidebar, click **Secrets and variables** > **Actions**

### Add Required Secrets

Click **New repository secret** and add the following:

#### SUPABASE_URL

- **Name**: `SUPABASE_URL`
- **Value**: Your Supabase project URL
- **Example**: `https://abcdefghijklmnop.supabase.co`

**How to find it**:
- Go to your Supabase Dashboard
- Select your project
- Go to **Settings** > **API**
- Copy the **Project URL**

#### SUPABASE_ANON_KEY

- **Name**: `SUPABASE_ANON_KEY`
- **Value**: Your Supabase anonymous/public key
- **Example**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

**How to find it**:
- Go to your Supabase Dashboard
- Select your project
- Go to **Settings** > **API**
- Copy the **anon/public** key under "Project API keys"

---

## Step 2: Verify Workflow File

The workflow file should already exist at:
```
.github/workflows/expire-stale-visit-requests.yml
```

If it doesn't exist or you need to verify it:

```yaml
name: Expire Stale Visit Requests

on:
  schedule:
    # Run every hour at minute 0
    - cron: '0 * * * *'

  # Allow manual triggering for testing
  workflow_dispatch:

jobs:
  expire-requests:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Call Supabase Edge Function
        run: |
          response=$(curl -s -w "\n%{http_code}" -X POST \
            "${{ secrets.SUPABASE_URL }}/functions/v1/expire-stale-visit-requests" \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_ANON_KEY }}" \
            -H "Content-Type: application/json")

          http_code=$(echo "$response" | tail -n1)
          body=$(echo "$response" | sed '$d')

          echo "HTTP Status: $http_code"
          echo "Response: $body"

          if [ "$http_code" != "200" ]; then
            echo "Error: Edge function returned status $http_code"
            exit 1
          fi

          # Parse and display results
          expired_count=$(echo "$body" | jq -r '.expired_count // 0')
          echo "Successfully expired $expired_count visit request(s)"

      - name: Notify on failure
        if: failure()
        run: |
          echo "❌ Failed to expire stale visit requests"
```

---

## Step 3: Test the Workflow

### Manual Test

1. Go to **Actions** tab in your GitHub repository
2. Select **Expire Stale Visit Requests** workflow
3. Click **Run workflow** button (top right)
4. Click **Run workflow** in the modal
5. Wait for the workflow to complete
6. Check the logs for success message

### Expected Output

Successful run:
```
HTTP Status: 200
Response: {"success":true,"expired_count":5,"message":"Successfully expired 5 stale visit request(s)"}
Successfully expired 5 visit request(s)
```

Failed run (example):
```
HTTP Status: 500
Response: {"success":false,"error":"Database connection failed"}
Error: Edge function returned status 500
```

---

## Step 4: Monitor Workflow Execution

### View Workflow Runs

1. Go to **Actions** tab
2. Select **Expire Stale Visit Requests**
3. View list of workflow runs with status

### Check Execution Logs

1. Click on a specific workflow run
2. Click on the **expire-requests** job
3. Expand each step to view detailed logs

### Review Summary

Each successful run creates a summary with:
- Number of expired requests
- Timestamp (UTC)
- Success status

---

## Troubleshooting

### Common Issues

#### Issue: Workflow not running automatically

**Symptoms**:
- No automatic runs appear in Actions tab
- Only manual runs are working

**Possible Causes & Solutions**:

1. **Repository not active**
   - GitHub disables scheduled workflows for inactive repos
   - **Solution**: Push a commit or manually trigger workflow

2. **Workflow file syntax error**
   - **Solution**: Use GitHub's workflow validator
   - Go to Actions > New workflow > Validate YAML

3. **Default branch protection**
   - Scheduled workflows only run on default branch
   - **Solution**: Ensure workflow file is on `main` or `master`

#### Issue: 401 Unauthorized Error

**Symptoms**:
```
HTTP Status: 401
Response: {"error":"Invalid API key"}
```

**Solutions**:
- Verify `SUPABASE_ANON_KEY` is correct
- Check key hasn't been rotated in Supabase dashboard
- Ensure no extra spaces in secret value
- Try regenerating and updating the key

#### Issue: 404 Not Found Error

**Symptoms**:
```
HTTP Status: 404
Response: Function not found
```

**Solutions**:
- Verify Edge Function is deployed: `supabase functions list`
- Check function name matches exactly: `expire-stale-visit-requests`
- Ensure URL format: `{SUPABASE_URL}/functions/v1/expire-stale-visit-requests`
- Redeploy function: `supabase functions deploy expire-stale-visit-requests`

#### Issue: 500 Internal Server Error

**Symptoms**:
```
HTTP Status: 500
Response: {"success":false,"error":"..."}
```

**Solutions**:
- Check Supabase logs for Edge Function errors
- Verify database migration was applied successfully
- Test SQL function directly: `SELECT expire_stale_visit_requests();`
- Check RLS policies aren't blocking service role

#### Issue: Secrets not accessible in workflow

**Symptoms**:
```
curl: Invalid URL
or
Authorization: Bearer
```

**Solutions**:
- Verify secrets are saved in repository settings
- Secrets must be added to repository (not organization)
- Re-save secrets if recently modified
- Check for typos in secret names

---

## Advanced Configuration

### Adjust Cron Schedule

Current schedule runs every hour: `0 * * * *`

Common alternatives:

```yaml
# Every 30 minutes
- cron: '*/30 * * * *'

# Every 2 hours
- cron: '0 */2 * * *'

# Every 6 hours
- cron: '0 */6 * * *'

# Daily at midnight UTC
- cron: '0 0 * * *'

# Business hours only (9 AM - 5 PM UTC, every hour)
- cron: '0 9-17 * * *'
```

**Note**: GitHub Actions uses UTC timezone for cron schedules.

### Add Slack Notifications

Add to workflow file:

```yaml
- name: Notify Slack on failure
  if: failure()
  uses: slackapi/slack-github-action@v1
  with:
    webhook: ${{ secrets.SLACK_WEBHOOK }}
    payload: |
      {
        "text": "❌ Visit request expiration failed",
        "blocks": [
          {
            "type": "section",
            "text": {
              "type": "mrkdwn",
              "text": "*Visit Request Expiration Failed*\n<${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}|View Logs>"
            }
          }
        ]
      }
```

### Add Email Notifications

GitHub automatically sends email notifications for failed workflows to repository administrators. To customize:

1. Go to **Settings** > **Notifications**
2. Configure **Actions** notification preferences

---

## Monitoring Dashboard

### Create a Monitoring Dashboard

Use GitHub Actions API to create a monitoring dashboard:

```bash
# Get recent workflow runs
curl -H "Authorization: token YOUR_GITHUB_TOKEN" \
  https://api.github.com/repos/OWNER/REPO/actions/workflows/expire-stale-visit-requests.yml/runs

# Get specific run details
curl -H "Authorization: token YOUR_GITHUB_TOKEN" \
  https://api.github.com/repos/OWNER/REPO/actions/runs/RUN_ID
```

### Useful Metrics to Track

1. **Success Rate**: Percentage of successful runs
2. **Average Expired Count**: Average number of requests expired per run
3. **Execution Time**: How long each run takes
4. **Failure Patterns**: Common times for failures

---

## Alternative: Database-Level Cron (pg_cron)

If you prefer database-level scheduling instead of GitHub Actions:

### Check if pg_cron is available

```sql
SELECT * FROM pg_extension WHERE extname = 'pg_cron';
```

### Enable pg_cron (if not enabled)

Contact Supabase support to enable pg_cron for your project.

### Schedule the job

```sql
-- Schedule to run every hour
SELECT cron.schedule(
  'expire-stale-visit-requests',  -- Job name
  '0 * * * *',                     -- Cron schedule (every hour)
  $$SELECT expire_stale_visit_requests();$$  -- SQL command
);
```

### Manage scheduled jobs

```sql
-- View all scheduled jobs
SELECT * FROM cron.job;

-- View job run history
SELECT * FROM cron.job_run_details
ORDER BY start_time DESC
LIMIT 20;

-- Unschedule a job
SELECT cron.unschedule('expire-stale-visit-requests');

-- Update schedule
SELECT cron.alter_job(
  job_id,
  schedule := '0 */2 * * *'  -- Every 2 hours
);
```

### Advantages of pg_cron

- No external dependencies
- Runs directly in database
- Lower latency
- Simpler architecture

### Disadvantages of pg_cron

- Less visibility (no GitHub Actions UI)
- Harder to debug
- Requires database extension support
- No built-in notifications

---

## Security Best Practices

### Secrets Management

1. **Never commit secrets to git**
   - Use `.gitignore` for sensitive files
   - Use GitHub Secrets for CI/CD

2. **Rotate keys regularly**
   - Update secrets in GitHub when rotating keys
   - Test after rotation to ensure workflow still works

3. **Use least privilege**
   - Anonymous key has limited permissions (correct for this use case)
   - Never use service role key in client code

4. **Audit access**
   - Review who has access to repository secrets
   - Use branch protection for workflow files

### Workflow Security

1. **Pin action versions**
   - Use `@v4` instead of `@latest`
   - Review action updates before upgrading

2. **Limit workflow permissions**
   ```yaml
   permissions:
     contents: read  # Read-only access
   ```

3. **Review workflow changes**
   - Require pull request reviews for workflow changes
   - Use CODEOWNERS for workflow files

---

## Testing Checklist

Before going to production:

- [ ] Secrets configured correctly
- [ ] Manual workflow run succeeds
- [ ] Edge Function is deployed
- [ ] Database migration applied
- [ ] Workflow logs show expected output
- [ ] Notifications are created for expired requests
- [ ] No expired requests are double-processed
- [ ] Workflow handles zero expired requests gracefully
- [ ] Error handling works (test with invalid secrets)
- [ ] Cron schedule is appropriate for your needs

---

## Support

### Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [GitHub Actions Cron Syntax](https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows#schedule)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)

### Getting Help

If you encounter issues:

1. Check workflow logs in GitHub Actions
2. Check Edge Function logs in Supabase Dashboard
3. Test SQL function directly in Supabase SQL Editor
4. Review this troubleshooting guide
5. Contact support with logs and error messages

---

**Setup Date**: October 13, 2025
**Status**: ✅ Ready for Configuration
**Estimated Setup Time**: 5-10 minutes
