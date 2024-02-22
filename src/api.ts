import yaml from 'yaml'
import * as core from '@actions/core'
import { Context } from '@actions/github/lib/context'
import { Config } from './config'
import { Octokit } from '@octokit/rest'

const APPROVED = 'APPROVED'

function countIncluded<T>(setA: Set<T>, setB: Set<T>): number {
  let count = 0
  for (const element of setB) {
    if (setA.has(element)) {
      count++
    }
  }

  return count
}

async function fetchConfig(
  ctx: Context,
  octokit: Octokit,
  path: string
): Promise<Config> {
  try {
    const response = await octokit.rest.repos.getContent({
      owner: ctx.repo.owner,
      repo: ctx.repo.repo,
      path,
      ref: ctx.ref
    })

    const fileContent = response.data as { content: string }

    const ymlContent = Buffer.from(fileContent.content, 'base64').toString()

    return yaml.parse(ymlContent)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    if (error.status === 404) {
      core.warning(
        'No configuration file is found in the base branch; terminating the process'
      )
    }
    throw new Error(`No configuration file is found: ${error.message}`)
  }
}

async function getApprovedMembers(
  ctx: Context,
  octokit: Octokit,
  teamName: string
): Promise<Set<string>> {
  try {
    if (!ctx.payload.pull_request) {
      throw new Error('No pull request found.')
    }

    // Fetch all team members with pagination
    const teamMembers = await octokit.paginate(
      octokit.rest.teams.listMembersInOrg,
      {
        org: ctx.repo.owner,
        team_slug: teamName,
        per_page: 100
      }
    )

    // Fetch all PR reviews with pagination
    const reviews = await octokit.paginate(octokit.rest.pulls.listReviews, {
      owner: ctx.repo.owner,
      repo: ctx.repo.repo,
      pull_number: ctx.payload.pull_request.number,
      per_page: 100
    })

    // Filter reviews by team members and review state
    const teamMemberLogins = new Set(teamMembers.map(member => member.login))
    core.debug(JSON.stringify(teamMemberLogins, null, '\t'))
    const approvedTeamReviews = reviews.filter(
      review =>
        review.user &&
        teamMemberLogins.has(review.user.login) &&
        review.state === APPROVED
    )

    //I hate typescript
    const approvedByMembers: string[] = []
    for (const review of approvedTeamReviews) {
      if (!review.user) {
        throw new Error('No user for review')
      }
      approvedByMembers.push(review.user.login)
    }

    return new Set(approvedByMembers)
  } catch (error) {
    console.error('Error fetching team reviewers:', error)
    throw new Error('Failed to fetch team ')
  }
}

export default {
  fetchConfig,
  getApprovedMembers,
  countIncluded
}
