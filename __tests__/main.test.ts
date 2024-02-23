import * as core from '@actions/core'
import { Context } from '@actions/github/lib/context'
import { run } from '../src/main'
import { Octokit } from '@octokit/rest'

jest.mock('@actions/core', () => ({
  getInput: jest.fn(),
  setFailed: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
  startGroup: jest.fn(),
  endGroup: jest.fn(),
  warning: jest.fn()
}))
jest.mock('@octokit/rest', () => ({
  Octokit: jest.fn().mockImplementation(() => ({
    paginate: jest.fn(),
    rest: {
      teams: {
        listMembersInOrg: jest.fn()
      },
      pulls: {
        listReviews: jest.fn()
      },
      repos: {
        getContent: jest.fn()
      }
    }
  }))
}))

const context = {
  eventName: 'push',
  sha: 'fakeSha',
  ref: 'refs/heads/fake-branch',
  workflow: 'fakeWorkflow',
  action: 'fakeAction',
  actor: 'fakeActor',
  job: 'fakeJob',
  runNumber: 123,
  runId: 123456,
  payload: {
    pull_request: {
      number: 1
    }
  },
  repo: {
    owner: 'fakeOwner',
    repo: 'fakeRepo'
  },
  issue: {
    owner: 'fakeOwner',
    repo: 'fakeRepo',
    number: 1
  }
}
const fakeContext = context as Context

const getContentData = `teams:
    fake-team:
        members:
            - user1
        required: 1`

beforeEach(() => {
  jest.clearAllMocks()
})

describe('run function', () => {
  it('ok run', async () => {
    const octokit = new Octokit()

    ;(octokit.paginate as unknown as jest.Mock).mockImplementation(
      async method => {
        if (method === octokit.rest.teams.listMembersInOrg) {
          return Promise.resolve([
            { login: 'user1' },
            { login: 'user2' },
            { login: 'user5' }
          ])
        } else if (method === octokit.rest.pulls.listReviews) {
          return Promise.resolve([
            { user: { login: 'user1' }, state: 'APPROVED' },
            { user: { login: 'user2' }, state: 'CHANGES_REQUESTED' },
            { user: { login: 'user3' }, state: 'APPROVED' }
          ])
        }
      }
    )
    ;(octokit.rest.repos.getContent as unknown as jest.Mock).mockImplementation(
      async () => {
        return Promise.resolve({
          data: {
            content: Buffer.from(getContentData).toString('base64')
          }
        })
      }
    )
    ;(core.setFailed as unknown as jest.Mock).mockImplementation(
      (message: string | Error) => {
        console.log(message)
        return message
      }
    )

    await run(fakeContext, octokit, '')
    expect(core.setFailed).not.toHaveBeenCalled()
  })
})
