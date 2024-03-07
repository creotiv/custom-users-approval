import * as core from '@actions/core'
import { Context } from '@actions/github/lib/context'
import { Octokit } from '@octokit/rest'
import api from './api'

export async function run(
  ctx: Context,
  octokit: Octokit,
  configPath: string
): Promise<void> {
  try {
    core.info('Fetching configuration')

    let fail = false
    const failedTeams: string[] = []

    const config = await api.fetchConfig(ctx, octokit, configPath)

    core.debug('Config: ')
    core.debug(JSON.stringify(config))

    for (const teamName in config.teams) {
      const team = config.teams[teamName]
      const approved = await api.getApprovedMembers(ctx, octokit, teamName)
      let sign = '✅'

      if (
        api.countIncluded<string>(new Set(team.members), approved) <
        team.required
      ) {
        sign = '❌'
        fail = true
        failedTeams.push(teamName)
      }

      // needed for tests
      if (process.env.GITHUB_STEP_SUMMARY) {
        await core.summary
          .addRaw(
            `<p>${sign} ${teamName}: (${approved.size}/${team.required}) ` +
              'approval(s)</p>',
            true
          )
          .write()
      }
      core.startGroup(
        `${sign} ${teamName}: (${approved.size}/${team.required}) approval(s).`
      )
      core.endGroup()
    }

    if (fail) {
      console.log('AAAA')
      core.setFailed(
        `Need approval from these teams: ${failedTeams.join(', ')}`
      )
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.log('bbbbb')
    core.setFailed(error.message)
  }
}
