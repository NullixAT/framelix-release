const core = require('@actions/core');
const github = require('@actions/github');
const { spawn } = require('child_process');

try {

  const myToken = core.getInput('repo-token');

  const octokit = github.getOctokit(myToken)

  const ls = spawn('git', ['--version']);

  ls.stdout.on('data', (data) => {
    console.log(`stdout: ${data}`);
  });

  ls.stderr.on('data', (data) => {
    console.error(`stderr: ${data}`);
  });

  ls.on('close', (code) => {
    console.log(`child process exited with code ${code}`);
  });

  return

  // You can also pass in additional options as a second parameter to getOctokit
  // const octokit = github.getOctokit(myToken, {userAgent: "MyActionVersion1"});

  const { data: pullRequest } = await octokit.rest.pulls.get({
    owner: 'octokit',
    repo: 'rest.js',
    pull_number: 123,
    mediaType: {
      format: 'diff'
    }
  });

  console.log(pullRequest);

} catch (error) {
  core.setFailed(error.message);
}