"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const core = __importStar(require("@actions/core"));
const github = __importStar(require("@actions/github"));
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        const issue_message = core.getInput('issue-message');
        const pr_message = core.getInput('pr-message');
        let pr_number = core.getInput('pr-number');
        let issue_number = core.getInput('issue-number');
        const pr_once = core.getInput('pr-once') === 'true';
        const issue_once = core.getInput('issue-once') === 'true';
        if (!issue_message && !pr_message) {
            throw new Error('Action must have at least one of issue-message or pr-message set');
        }
        const client = github.getOctokit(core.getInput('token', { required: true }));
        const context = github.context;
        if (context.payload.action !== 'opened') {
            console.log('No issue or PR was opened, skipping');
            return;
        }
        const isIssue = !!context.payload.issue;
        if (!isIssue && !context.payload.pull_request) {
            console.log('The event that triggered this action was not a pull request or issue, skipping.');
            return;
        }
        // TODO: fix log
        console.log('Checking for existing interactions');
        if (!context.payload.sender) {
            throw new Error('Internal error, no sender provided by GitHub');
        }
        const sender = context.payload.sender.login;
        const issue = context.issue;
        let isValidForContinue = false;
        if (isIssue) {
            isValidForContinue = yield checkIssue(client, issue.owner, issue.repo, sender, issue_number, issue_once);
        }
        else {
            isValidForContinue = yield checkPR(client, issue.owner, issue.repo, sender, pr_number, pr_once);
        }
        if (!isValidForContinue) {
            console.log('Interaction limit reached, skipping');
            return;
        }
        const message = isIssue ? issue_message : pr_message;
        if (!message) {
            console.log('No message provided for this type of contribution');
            return;
        }
        console.log(`Adding message: ${message} to ${isIssue ? 'issue' : 'pull request'} ${issue.number}`);
        if (isIssue) {
            yield client.rest.issues.createComment({
                owner: issue.owner,
                repo: issue.repo,
                issue_number: issue.number,
                body: message,
            });
        }
        else {
            yield client.rest.pulls.createReview({
                owner: issue.owner,
                repo: issue.repo,
                pull_number: issue.number,
                body: message,
                event: 'COMMENT',
            });
        }
    });
}
function checkIssue(client, owner, repo, sender, checkIssueNumber, type_once) {
    return __awaiter(this, void 0, void 0, function* () {
        const { status, data: issues } = yield client.rest.issues.listForRepo({
            owner,
            repo,
            creator: sender,
        });
        if (status !== 200) {
            throw new Error(`Failed to list issues for ${owner}/${repo}`);
        }
        if (isNaN(Number(checkIssueNumber))) {
            throw new Error('pr-number must be a string encoded number');
        }
        else {
            checkIssueNumber = Number(checkIssueNumber);
        }
        if (checkIssueNumber < 0)
            throw new Error('issue-number must be greater than or equal to 0');
        if (issues.length <= checkIssueNumber || checkIssueNumber == 0) {
            return type_once ? issues.length === checkIssueNumber : true;
        }
        return false;
    });
}
;
function checkPR(client, owner, repo, sender, checkPRNumber, type_once) {
    return __awaiter(this, void 0, void 0, function* () {
        const { status, data: prs } = yield client.rest.pulls.list({
            owner,
            repo,
        });
        if (status !== 200) {
            throw new Error(`Failed to list PRs for ${owner}/${repo}`);
        }
        if (isNaN(Number(checkPRNumber))) {
            throw new Error('pr-number must be a string encoded number');
        }
        else {
            checkPRNumber = Number(checkPRNumber);
        }
        if (checkPRNumber < 0)
            throw new Error('pr-number must be greater than or equal to 0');
        if (prs.length <= checkPRNumber || checkPRNumber == 0) {
            return true;
        }
        const filteredPRs = prs.filter((pr) => {
            var _a;
            return ((_a = pr.user) === null || _a === void 0 ? void 0 : _a.login) === sender;
        });
        if (type_once) {
            if (filteredPRs.length === checkPRNumber) {
                return true;
            }
        }
        else {
            if (filteredPRs.length <= checkPRNumber) {
                return true;
            }
        }
        return false;
    });
}
;
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield main();
        }
        catch (error) {
            core.setFailed(error.message);
        }
    });
}
run();
