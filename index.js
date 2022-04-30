const core = require('@actions/core')
const github = require('@actions/github')
const fs = require('fs')
const { spawn } = require('child_process')
const AdmZip = require('adm-zip')

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

    proc.on('close', () => {
      resolve(out)
    })
  })
}

function removeNotNeededFiles (folder) {
  const files = fs.readdirSync(folder)
  for (let i = 0; i < files.length; i++) {
    const filename = files[i]
    const path = folder + '/' + filename
    const isDir = fs.lstatSync(path).isDirectory()
    if (filename.startsWith('.git')) {
      core.info(path)
      if (isDir) {
        deleteRecursive(path)
      } else {
        fs.unlinkSync(path)
      }
    } else if (isDir) {
      removeNotNeededFiles(path)
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
    const myToken = core.getInput('GITHUB_TOKEN')
    const octokit = github.getOctokit(myToken)

    if (process.env.GITHUB_REPOSITORY) {
      const cwd = process.cwd()

      core.info('===Cloning repositories===')
      core.info(await run('git', ['clone', '--depth=1', 'https://github.com/NullixAT/framelix-docker', cwd + '/export']))
      core.info(await run('git', ['clone', '--recurse-submodules', '--depth=1', 'https://github.com/' + process.env.GITHUB_REPOSITORY, cwd + '/export/app']))

      core.info('===Removing not needed files===')
      removeNotNeededFiles(cwd + '/export')
      core.info('✓ Done')
      core.info('')

      core.info('===Creating release===')
      const tag = core.getInput('TAG')

      console.log('TAG: ' + tag)

      let body = ''
      const repoSplit = process.env.GITHUB_REPOSITORY.split('/', 2)
      const release = await octokit.rest.repos.createRelease({
        owner: repoSplit[0],
        repo: repoSplit[1],
        tag_name: tag,
        draft: true,
        name: tag,
        body: body
      })
      core.info('✓ Done')
      core.info('')

      core.info('===Uploading docker-package.zip===')
      let zip = new AdmZip()
      zip.addLocalFolder(cwd + '/export')
      await octokit.rest.repos.uploadReleaseAsset({
        owner: repoSplit[0],
        repo: repoSplit[1],
        release_id: release.data.id,
        name: 'docker-package.zip',
        data: zip.toBuffer()
      })
      core.info('✓ Done')
      core.info('')

      core.info('===Uploading app-package.zip===')
      zip = new AdmZip()
      zip.addLocalFolder(cwd + '/export/app')
      await octokit.rest.repos.uploadReleaseAsset({
        owner: repoSplit[0],
        repo: repoSplit[1],
        release_id: release.data.id,
        name: 'app-package.zip',
        data: zip.toBuffer()
      })
      core.info('✓ Done')
      core.info('')

      core.info('')
      core.info('')
      core.info('✓✓✓ All done')
    }
  } catch (error) {
    core.setFailed(error.message)
  }
})()