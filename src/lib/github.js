const { Octokit } = require('@octokit/rest');

let octokit = null;

function getClient() {
  if (!octokit) {
    if (!process.env.GITHUB_TOKEN) {
      throw new Error('GITHUB_TOKEN is not set in environment variables');
    }
    octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
  }
  return octokit;
}

module.exports = { getClient };
