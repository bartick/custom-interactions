import * as core from '@actions/core';
import * as github from '@actions/github';
import { GitHub } from '@actions/github/lib/utils'

async function main() {
  const issue_message: string = core.getInput('issue-message');
  const pr_message: string = core.getInput('pr-message');
  let pr_number: string = core.getInput('pr-number');
  let issue_number: string = core.getInput('issue-number');
  const pr_once: boolean = core.getInput('pr-once') === 'true';
  const issue_once: boolean = core.getInput('issue-once') === 'true';

  if (!issue_message && !pr_message) {
    throw new Error(
      'Action must have at least one of issue-message or pr-message set'
    );
  }

  const client: InstanceType<typeof GitHub> = github.getOctokit(core.getInput('token', { required: true }));
  const context = github.context;

  if (context.payload.action !== 'opened') {
    console.log('No issue or PR was opened, skipping');
    return;
  }

  const isIssue: boolean = !!context.payload.issue;
  if (!isIssue && !context.payload.pull_request) {
    console.log(
      'The event that triggered this action was not a pull request or issue, skipping.'
    );
    return;
  }

  // TODO: fix log
  console.log('Checking for existing interactions');
  if (!context.payload.sender) {
    throw new Error('Internal error, no sender provided by GitHub');
  }

  const sender: string = context.payload.sender!.login;
  const issue: {owner: string; repo: string; number: number} = context.issue;
  let isValidForContinue: boolean = false;
  if (isIssue) {
    isValidForContinue = await checkIssue(
      client, 
      issue.owner, 
      issue.repo, 
      sender, 
      issue_number, 
      issue_once
    );
  } else {
    isValidForContinue = await checkPR(
      client, 
      issue.owner, 
      issue.repo, 
      sender, 
      pr_number, 
      pr_once
    );
  }

  if (!isValidForContinue) {
    console.log('Interaction limit reached, skipping');
    return;
  }

  const message = isIssue ? issue_message : pr_message
  if (!message) {
    console.log('No message provided for this type of contribution');
    return;
  }

  console.log(`Adding message: ${message} to ${isIssue ? 'issue' : 'pull request'} ${issue.number}`);
  if(isIssue) {
    await client.rest.issues.createComment({
      owner: issue.owner,
      repo: issue.repo,
      issue_number: issue.number,
      body: message,
    });
  } else {
    await client.rest.pulls.createReview({
      owner: issue.owner,
      repo: issue.repo,
      pull_number: issue.number,
      body: message,
      event: 'COMMENT',
    });
  }
}

async function checkIssue(
  client: InstanceType<typeof GitHub>,
  owner: string,
  repo: string,
  sender: string,
  checkIssueNumber: string | number,
  type_once: boolean
) {
  const {status, data: issues} = await client.rest.issues.listForRepo({
    owner,
    repo,
    creator: sender,
  });
  if (status !== 200) {
    throw new Error(`Failed to list issues for ${owner}/${repo}`);
  }

  if (isNaN(Number(checkIssueNumber))) {
    throw new Error('pr-number must be a string encoded number');
  } else {
    checkIssueNumber = Number(checkIssueNumber);
  }

  if (checkIssueNumber < 0) throw new Error('issue-number must be greater than or equal to 0');

  if (issues.length <= checkIssueNumber || checkIssueNumber == 0) {
    return type_once ? issues.length === checkIssueNumber : true;
  }

  return false;
};

async function checkPR(
  client: InstanceType<typeof GitHub>,
  owner: string,
  repo: string,
  sender: string,
  checkPRNumber: string | number,
  type_once: boolean
) {
  const {status, data: prs} = await client.rest.pulls.list({
    owner,
    repo,
  })
  if (status !== 200) {
    throw new Error(`Failed to list PRs for ${owner}/${repo}`);
  }

  if (isNaN(Number(checkPRNumber))) {
    throw new Error('pr-number must be a string encoded number');
  } else {
    checkPRNumber = Number(checkPRNumber);
  }

  if (checkPRNumber < 0) throw new Error('pr-number must be greater than or equal to 0');

  if (prs.length <= checkPRNumber || checkPRNumber == 0) {
    return true;
  }

  const filteredPRs = prs.filter((pr) => {
    return pr.user?.login === sender;
  });

  if (type_once) {
    if (filteredPRs.length === checkPRNumber) {
      return true;
    }
  } else {
    if (filteredPRs.length <= checkPRNumber) {
      return true;
    }
  }

  return false;
};


async function run() {
  try {
    await main();
  } catch (error: any) {
    core.setFailed(error.message);
  }
}

run();
