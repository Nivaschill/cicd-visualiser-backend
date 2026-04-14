const express = require('express');
const { getClient } = require('../lib/github');

const router = express.Router();

// GET /api/pipeline/:owner/:repo/workflows
// List all workflows for a repo
router.get('/:owner/:repo/workflows', async (req, res, next) => {
  try {
    const { owner, repo } = req.params;
    const octokit = getClient();

    const { data } = await octokit.actions.listRepoWorkflows({ owner, repo });

    const workflows = data.workflows.map((w) => ({
      id: w.id,
      name: w.name,
      state: w.state,
      path: w.path,
      htmlUrl: w.html_url,
    }));

    res.json({ workflows });
  } catch (err) {
    next(err);
  }
});

// GET /api/pipeline/:owner/:repo/runs?workflow_id=&per_page=&page=
// Get workflow runs with status, duration, branch, trigger
router.get('/:owner/:repo/runs', async (req, res, next) => {
  try {
    const { owner, repo } = req.params;
    const { workflow_id, per_page = 30, page = 1, branch } = req.query;
    const octokit = getClient();

    const params = {
      owner,
      repo,
      per_page: Math.min(Number(per_page), 100),
      page: Number(page),
    };
    if (workflow_id) params.workflow_id = Number(workflow_id);
    if (branch) params.branch = branch;

    const { data } = workflow_id
      ? await octokit.actions.listWorkflowRuns(params)
      : await octokit.actions.listWorkflowRunsForRepo(params);

    const runs = data.workflow_runs.map((run) => {
      const durationMs =
        run.updated_at && run.created_at
          ? new Date(run.updated_at) - new Date(run.created_at)
          : null;

      return {
        id: run.id,
        name: run.name,
        workflowId: run.workflow_id,
        status: run.status,         // queued | in_progress | completed
        conclusion: run.conclusion, // success | failure | cancelled | skipped | null
        branch: run.head_branch,
        commit: run.head_sha.slice(0, 7),
        commitMessage: run.head_commit?.message?.split('\n')[0] || '',
        actor: run.actor?.login,
        event: run.event,           // push | pull_request | schedule | workflow_dispatch
        createdAt: run.created_at,
        updatedAt: run.updated_at,
        durationMs,
        htmlUrl: run.html_url,
        runNumber: run.run_number,
      };
    });

    res.json({
      runs,
      totalCount: data.total_count,
      page: Number(page),
      perPage: Number(per_page),
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/pipeline/:owner/:repo/stats?workflow_id=&days=
// Aggregate stats: pass rate, avg duration, run frequency over N days
router.get('/:owner/:repo/stats', async (req, res, next) => {
  try {
    const { owner, repo } = req.params;
    const { workflow_id, days = 30 } = req.query;
    const octokit = getClient();

    const since = new Date();
    since.setDate(since.getDate() - Number(days));

    // Fetch up to 100 runs (sufficient for stats on most projects)
    const params = {
      owner,
      repo,
      per_page: 100,
      page: 1,
    };
    if (workflow_id) params.workflow_id = Number(workflow_id);

    const { data } = workflow_id
      ? await octokit.actions.listWorkflowRuns(params)
      : await octokit.actions.listWorkflowRunsForRepo(params);

    const runs = data.workflow_runs.filter(
      (r) => new Date(r.created_at) >= since && r.status === 'completed'
    );

    if (runs.length === 0) {
      return res.json({
        totalRuns: 0,
        passRate: null,
        avgDurationMs: null,
        successCount: 0,
        failureCount: 0,
        cancelledCount: 0,
        trend: [],
      });
    }

    const successCount = runs.filter((r) => r.conclusion === 'success').length;
    const failureCount = runs.filter((r) => r.conclusion === 'failure').length;
    const cancelledCount = runs.filter((r) => r.conclusion === 'cancelled').length;

    const durations = runs
      .map((r) =>
        r.updated_at && r.created_at
          ? new Date(r.updated_at) - new Date(r.created_at)
          : null
      )
      .filter(Boolean);

    const avgDurationMs =
      durations.length > 0
        ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
        : null;

    // Daily trend: group runs by date
    const trendMap = {};
    runs.forEach((r) => {
      const date = r.created_at.slice(0, 10);
      if (!trendMap[date]) trendMap[date] = { date, success: 0, failure: 0, total: 0 };
      trendMap[date].total++;
      if (r.conclusion === 'success') trendMap[date].success++;
      if (r.conclusion === 'failure') trendMap[date].failure++;
    });

    const trend = Object.values(trendMap).sort((a, b) =>
      a.date.localeCompare(b.date)
    );

    res.json({
      totalRuns: runs.length,
      passRate: Math.round((successCount / runs.length) * 100),
      avgDurationMs,
      successCount,
      failureCount,
      cancelledCount,
      trend,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/pipeline/:owner/:repo/runs/:run_id/jobs
// Get jobs for a specific run (for drill-down view)
router.get('/:owner/:repo/runs/:run_id/jobs', async (req, res, next) => {
  try {
    const { owner, repo, run_id } = req.params;
    const octokit = getClient();

    const { data } = await octokit.actions.listJobsForWorkflowRun({
      owner,
      repo,
      run_id: Number(run_id),
    });

    const jobs = data.jobs.map((job) => ({
      id: job.id,
      name: job.name,
      status: job.status,
      conclusion: job.conclusion,
      startedAt: job.started_at,
      completedAt: job.completed_at,
      durationMs:
        job.started_at && job.completed_at
          ? new Date(job.completed_at) - new Date(job.started_at)
          : null,
      steps: job.steps?.map((step) => ({
        name: step.name,
        status: step.status,
        conclusion: step.conclusion,
        number: step.number,
      })),
      htmlUrl: job.html_url,
    }));

    res.json({ jobs });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
