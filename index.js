const core = require('@actions/core')
const github = require('@actions/github')
const fs = require('fs')
const { spawn } = require('child_process')
const tar = require('tar')

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
  if (!fs.existsSync(folder)) return
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

function createTarPack (folder, filename) {
  let arr = []
  const files = fs.readdirSync(folder)
  for (let i = 0; i < files.length; i++) {
    const path = folder + '/' + files[i]
    if (fs.lstatSync(path).isDirectory()) {
      arr.push(path.substring(folder.length + 1))
    } else {
      arr.push(path.substring(folder.length + 1))
    }
  }
  tar.c({
    file: process.cwd() + '/packs/' + filename, 'cwd': folder, sync: true
  }, arr)
}

(async function () {
  try {

    const cwd = process.cwd()
    deleteRecursive(cwd + '/export')
    deleteRecursive(cwd + '/packs')

    const isTest = process.argv[2] === 'test'
    const myToken = isTest ? null : core.getInput('GITHUB_TOKEN')
    const octokit = isTest ? null : github.getOctokit(myToken)
    const repository = isTest ? process.argv[3] : process.env.GITHUB_REPOSITORY

    if (!repository) return

    const repoSplit = repository.split('/', 2)
    const tag = isTest ? process.argv[4] : process.env.GITHUB_REF_NAME

    let body = ''

    core.info('===RELEASE TAG: ' + tag + '===')
    core.info('')

    core.info('===Cleaning up previous job data directories===')
    deleteRecursive(cwd + '/export')
    deleteRecursive(cwd + '/packs')
    fs.mkdirSync(cwd + '/packs')
    core.info('✓ Done')
    core.info('')

    core.info('===Cloning framelix-docker repository===')
    core.info(await run('git', ['clone', '--progress', '--depth=1', 'https://github.com/NullixAT/framelix-docker', cwd + '/export']))
    core.info('✓ Done')
    core.info('')

    core.info('===Removing not needed files===')
    removeNotNeededFiles(cwd + '/export')
    core.info('✓ Done')
    core.info('')

    core.info('===Create packs/docker-update.tar===')
    createTarPack(cwd + '/export', 'docker-update.tar')
    core.info('✓ Done')
    core.info('')

    core.info('===Cloning app repository===')
    core.info(await run('git', ['clone', '--progress', '--recurse-submodules', '--depth=1', '-b', tag, 'https://github.com/' + repository, cwd + '/export/app']))
    core.info('✓ Done')
    core.info('')

    core.info('===Removing not needed files===')
    removeNotNeededFiles(cwd + '/export')
    core.info('✓ Done')
    core.info('')

    if (fs.existsSync(cwd + '/export/app/CHANGELOG.md')) {
      let changelogLines = fs.readFileSync(cwd + '/export/app/CHANGELOG.md').toString().split('\n')
      let bodyLines = []
      let valid = false
      for (let i = 0; i < changelogLines.length; i++) {
        const line = changelogLines[i]
        if (line.startsWith('##') && line.includes(tag)) {
          valid = true
          continue
        }
        if (line.startsWith('##') && valid) break
        if (valid) {
          bodyLines.push(line)
        }
      }
      body = bodyLines.join('\n').trim()
    }

    core.info('===Creating draft release ' + tag + '===')
    let release
    if (isTest) {

    } else {
      release = await octokit.rest.repos.createRelease({
        owner: repoSplit[0],
        repo: repoSplit[1],
        tag_name: tag,
        draft: true,
        name: tag,
        body: '# CHANGELOG\n\n' + body
      })
    }
    core.info('✓ Done')
    core.info('')

    core.info('===Uploading app-release.tar asset===')
    createTarPack(cwd + '/export/app', 'app-release.tar')
    if (isTest) {

    } else {
      await octokit.rest.repos.uploadReleaseAsset({
        owner: repoSplit[0],
        repo: repoSplit[1],
        release_id: release.data.id,
        name: 'app-release.tar',
        data: fs.readFileSync(cwd + '/packs/app-release.tar')
      })
    }
    core.info('✓ Done')
    core.info('')

    core.info('===Preparing /app folder for docker release===')
    deleteRecursive(cwd + '/export/app')
    fs.mkdirSync(cwd + '/export/app')
    fs.copyFileSync(cwd + '/packs/app-release.tar', cwd + '/export/app/app-release.tar')
    core.info('✓ Done')
    core.info('')

    core.info('===Uploading docker-release.tar asset===')
    createTarPack(cwd + '/export', 'docker-release.tar')
    if (isTest) {

    } else {
      await octokit.rest.repos.uploadReleaseAsset({
        owner: repoSplit[0],
        repo: repoSplit[1],
        release_id: release.data.id,
        name: 'docker-release.tar',
        data: fs.readFileSync(cwd + '/packs/docker-release.tar')
      })
    }
    core.info('✓ Done')
    core.info('')

    core.info('===Uploading docker-update.tar asset===')
    if (isTest) {

    } else {
      await octokit.rest.repos.uploadReleaseAsset({
        owner: repoSplit[0],
        repo: repoSplit[1],
        release_id: release.data.id,
        name: 'docker-update.tar',
        data: fs.readFileSync(cwd + '/packs/docker-update.tar')
      })
    }
    core.info('✓ Done')
    core.info('')

    let dockerVersion
    let dockerComposeData = fs.readFileSync(cwd + '/export/docker-compose.yml').toString()
    dockerVersion = dockerComposeData.match(/- FRAMELIX_DOCKER_VERSION=(.*)/i)[1].trim()
    core.info('===Uploading docker-version-' + dockerVersion + ' asset===')
    const filename = 'docker-version-' + dockerVersion
    fs.writeFileSync(cwd + '/packs/' + filename, '')
    if (isTest) {

    } else {
      await octokit.rest.repos.uploadReleaseAsset({
        owner: repoSplit[0],
        repo: repoSplit[1],
        release_id: release.data.id,
        name: filename,
        data: ''
      })
    }
    core.info('✓ Done')
    core.info('')

    core.info('===Cleanup generated files===')
    deleteRecursive(cwd + '/export')
    deleteRecursive(cwd + '/packs')
    core.info('✓ Done')
    core.info('')

    core.info('=======================')
    core.info('====== All done =======')
    core.info('=======================')

  } catch (error) {
    core.setFailed(error.message)
  }
})()