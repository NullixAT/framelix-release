const core = require('@actions/core')
const github = require('@actions/github')
const fs = require('fs')
const { spawn } = require('child_process')
const AdmZip = require('adm-zip')
const path = require('path')

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

function removeNotNeededFiles (folder) {
  const files = fs.readdirSync(folder)
  for (let i = 0; i < files.length; i++) {
    const filename = files[i]
    const path = folder + '/' + filename
    if (filename === '.git') {
      deleteRecursive(path)
    }
  }
}

function deleteRecursive (folder) {

  const files = fs.readdirSync(folder)
  for (let i = 0; i < files.length; i++) {
    const path = folder + '/' + files[i]
    if (fs.lstatSync(path).isDirectory()) {
      deleteRecursive(path)
    } else {
      fs.unlinkSync(path)
    }
  }
  fs.rmdirSync(folder)
}

(async function () {
  try {

    //const myToken = core.getInput('repo-token')

    //const octokit = github.getOctokit(myToken)

    if(process.env.GITHUB_REPOSITORY) {
      const cwd = process.cwd()

      console.log(await run('git', ['clone', '--depth=1', 'https://github.com/NullixAT/framelix-docker', cwd + '/export']))
      console.log(await run('git', ['clone', '--recurse-submodules', '--depth=1', 'https://github.com/' + process.env.GITHUB_REPOSITORY, cwd + '/export/app']))

      removeNotNeededFiles(cwd + '/export')
      console.log(await run('ls', ['-Ral', '.']))

      const zip = new AdmZip()
      zip.addLocalFolder(cwd + '/export')
      zip.writeZip(cwd + '/export/release-docker.zip')

      console.log(await run('ls', ['-Ral', '.']))
    }

  } catch (error) {
    core.setFailed(error.message)
  }
})()