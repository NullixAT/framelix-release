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
    core.setOutput('time', code);
    console.log(`child process exited with code ${code}`);
  });

} catch (error) {
  core.setFailed(error.message);
}