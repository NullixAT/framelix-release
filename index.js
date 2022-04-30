const core = require('@actions/core')
const github = require('@actions/github')
const { spawn } = require('child_process')

async function run (cmd, params) {
  return new Promise(function (resolve) {
    const proc = spawn(cmd, params)
    let out = ''
    proc.stdout.on('data', (data) => {
      out += data
    })

    proc.stderr.on('data', (data) => {
      out += data
    })

    proc.on('close', (code) => {
      resolve(out)
    })
  })
}

(async function () {
  try {

    const myToken = core.getInput('repo-token')

    const octokit = github.getOctokit(myToken)

    console.log(process.env)

    console.log(await run('git', ['clone', 'https://github.com/NullixAT/framelix-docker', 'docker']))
    console.log(await run('git', ['clone', 'https://github.com/' + process.env.GITHUB_REPOSITORY, 'docker/app']))

  } catch (error) {
    core.setFailed(error.message)
  }
})()