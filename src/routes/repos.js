const express = require('express');
const { getClient } = require('../lib/github');

const router = express.Router();

// GET /api/repos
// Returns the authenticated user's repos that have at least one workflow
router.get('/', async (req, res, next) => {
  try {
    const octokit = getClient();

    const { data: repos } = await octokit.repos.listForAuthenticatedUser({
      per_page: 100,
      sort: 'updated',
    });

    // Filter to only repos that have Actions enabled
    const reposWithWorkflows = await Promise.allSettled(
      repos.map(async (repo) => {
        try {
          const { data } = await octokit.actions.listRepoWorkflows({
            owner: repo.owner.login,
            repo: repo.name,
          });
          if (data.total_count === 0) return null;
          return {
            id: repo.id,
            name: repo.name,
            fullName: repo.full_name,
            owner: repo.owner.login,
            private: repo.private,
            defaultBranch: repo.default_branch,
            updatedAt: repo.updated_at,
            htmlUrl: repo.html_url,
            workflowCount: data.total_count,
          };
        } catch {
          return null;
        }
      })
    );

    const filtered = reposWithWorkflows
      .filter((r) => r.status === 'fulfilled' && r.value !== null)
      .map((r) => r.value);

    res.json({ repos: filtered });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
