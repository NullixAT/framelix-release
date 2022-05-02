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

      const repoSplit = process.env.GITHUB_REPOSITORY.split('/', 2)
      const tag = process.env.GITHUB_REF_NAME
      const cwd = process.cwd()

      let zip
      let body = ''

      core.info('===RELEASE TAG: ' + tag + '===')
      core.info('')

      core.info('===Cloning framelix-docker repository===')
      core.info(await run('git', ['clone', '--depth=1', 'https://github.com/NullixAT/framelix-docker', cwd + '/export']))
      core.info('✓ Done')
      core.info('')

      core.info('===Removing not needed files===')
      removeNotNeededFiles(cwd + '/export')
      core.info('✓ Done')
      core.info('')

      core.info('===Prepare docker-update.zip===')
      const dockerUpdateZip = new AdmZip()
      dockerUpdateZip.addLocalFolder(cwd + '/export')
      const dockerUpdateZipBuffer = dockerUpdateZip.toBuffer()
      core.info('✓ Done')
      core.info('')

      core.info('===Cloning app repository===')
      core.info(await run('git', ['clone', '--recurse-submodules', '--depth=1', '-b', tag, 'https://github.com/' + process.env.GITHUB_REPOSITORY, cwd + '/export/app']))
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

      const release = await octokit.rest.repos.createRelease({
        owner: repoSplit[0],
        repo: repoSplit[1],
        tag_name: tag,
        draft: true,
        name: tag,
        body: '# CHANGELOG\n\n' + body
      })
      core.info('✓ Done')
      core.info('')

      core.info('===Uploading app-release.zip asset===')
      zip = new AdmZip()
      zip.addLocalFolder(cwd + '/export/app')
      await octokit.rest.repos.uploadReleaseAsset({
        owner: repoSplit[0],
        repo: repoSplit[1],
        release_id: release.data.id,
        name: 'app-release.zip',
        data: zip.toBuffer()
      })
      core.info('✓ Done')
      core.info('')

      core.info('===Preparing /app folder for docker release===')
      deleteRecursive(cwd + '/export/app')
      fs.mkdirSync(cwd + '/export/app')
      zip.writeZip(cwd + '/export/app/app-release.zip')
      core.info('✓ Done')
      core.info('')

      core.info('===Uploading docker-release.zip asset===')
      zip = new AdmZip()
      zip.addLocalFolder(cwd + '/export')
      await octokit.rest.repos.uploadReleaseAsset({
        owner: repoSplit[0],
        repo: repoSplit[1],
        release_id: release.data.id,
        name: 'docker-release.zip',
        data: zip.toBuffer()
      })
      core.info('✓ Done')
      core.info('')

      core.info('===Uploading docker-update.zip asset===')
      await octokit.rest.repos.uploadReleaseAsset({
        owner: repoSplit[0],
        repo: repoSplit[1],
        release_id: release.data.id,
        name: 'docker-update.zip',
        data: dockerUpdateZipBuffer
      })
      core.info('✓ Done')
      core.info('')

      let dockerVersion
      let dockerComposeData = fs.readFileSync(cwd + '/export/docker-compose.yml').toString()
      dockerVersion = dockerComposeData.match(/- FRAMELIX_DOCKER_VERSION=(.*)/i)[1].trim()
      core.info('===Uploading docker-version.txt asset===')
      await octokit.rest.repos.uploadReleaseAsset({
        owner: repoSplit[0],
        repo: repoSplit[1],
        release_id: release.data.id,
        name: 'docker-version.txt',
        data: dockerVersion
      })
      core.info('✓ Done')
      core.info('')

      core.info('✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓')
      core.info('✓✓✓ All done ✓✓✓')
      core.info('✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓')
    }
  } catch (error) {
    core.setFailed(error.message)
  }
})()