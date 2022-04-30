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


    const cwd = process.cwd()

    console.log(await run('git', ['clone', 'https://github.com/NullixAT/framelix-docker', cwd+'/docker']))
    console.log(await run('git', ['clone', 'https://github.com/' + process.env.GITHUB_REPOSITORY, cwd+'/docker/app']))
    console.log(await run('ls', ['-al',  '.']))
    console.log(process.env)

  } catch (error) {
    core.setFailed(error.message)
  }
})()