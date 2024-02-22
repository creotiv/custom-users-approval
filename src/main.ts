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
    core.info('Fetching configuration...')

    let fail = false
    const failedGroups: string[] = []

    const config = await api.fetchConfig(ctx, octokit, configPath)

    core.debug('Config: ')
    core.debug(JSON.stringify(config))

    for (const groupName in config.groups) {
      const group = config.groups[groupName]
      const approved = await api.getApprovedMembers(ctx, octokit, groupName)
      let sign = '✅'

      if (
        api.countIncluded<string>(new Set(group.members), approved) <
        group.required
      ) {
        sign = '❌'
        fail = true
        failedGroups.push(groupName)
      }

      core.startGroup(
        `${sign} ${groupName}: (${approved.size}/${group.required}) approval(s).`
      )
      core.endGroup()
    }

    if (fail) {
      core.setFailed(
        `Need approval from these groups: ${failedGroups.join(', ')}`
      )
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    core.setFailed(error.message)
  }
}
